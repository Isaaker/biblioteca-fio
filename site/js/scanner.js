/**
 * Escáner de libros (escanear.html): dos modos.
 *
 *  - "barcode": lee el código de barras ISBN de la contraportada con la
 *    API nativa BarcodeDetector del navegador (sin librerías: donde no
 *    está disponible —Safari, Firefox de escritorio—, se avisa y se
 *    ofrece la búsqueda manual).
 *  - "label": lee, por OCR, la etiqueta blanca con la referencia interna
 *    (p. ej. "LB0123") que llevan pegada los libros. Usa Tesseract.js,
 *    cargado solo cuando se activa este modo (es pesado: ~2 MB de WASM).
 *
 * En ambos casos, el resultado se compara contra el propio catalog.json
 * ya cargado — no hay servidor ni API externa.
 */
function fioScanner() {
  return {
    mode: 'barcode', // 'barcode' | 'label'
    catalog: [],
    catalogLoading: true,

    cameraActive: false,
    cameraError: null,
    barcodeSupported: 'BarcodeDetector' in window,

    statusMessage: '',
    resultBook: null,
    noMatch: false,

    manualRef: '',

    _stream: null,
    _rafId: null,
    _barcodeDetector: null,
    _ocrTimer: null,
    _tesseractWorker: null,
    _busyOcr: false,
    _quaggaLoaded: false,

    async init() {
      try {
        const res = await fetch('data/catalog.json');
        const payload = await res.json();
        this.catalog = payload.records || [];
      } catch (err) {
        console.error('No se pudo cargar catalog.json', err);
      } finally {
        this.catalogLoading = false;
      }

      // En iOS la API nativa BarcodeDetector no existe, pero aún así
      // queremos permitir el modo de código de barras con el fallback
      // de QuaggaJS. Si no hay soporte nativo, se mantiene el modo
      // barcode para que el usuario pueda probar la lectura alternativa.

      // Si se llega aquí con ?ref= o ?isbn= (por ejemplo desde un enlace
      // corto o un lector de códigos externo), se resuelve directamente.
      const params = new URLSearchParams(window.location.search);
      if (params.get('ref')) this._resolveByReference(params.get('ref'));
      if (params.get('isbn')) this._resolveByIsbn(params.get('isbn'));
    },

    async setMode(mode) {
      await this.stopCamera();
      this.mode = mode;
      this.resultBook = null;
      this.noMatch = false;
      this.statusMessage = '';
    },

    // --- Cámara -------------------------------------------------------------
    async startCamera() {
      this.cameraError = null;
      this.resultBook = null;
      this.noMatch = false;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.cameraError = fioT('scan_camera_error');
        return;
      }

      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        this._stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.cameraActive = true;
        await this.$nextTick();
        const video = this.$refs.video;
        if (!video) {
          throw new Error('No se encontró el elemento de video del escáner.');
        }

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('muted', '');
        video.srcObject = this._stream;

        await new Promise((resolve, reject) => {
          const onReady = () => {
            video.removeEventListener('loadedmetadata', onReady);
            resolve();
          };
          video.addEventListener('loadedmetadata', onReady, { once: true });
          video.play().then(resolve).catch(reject);
        });

        if (this.mode === 'barcode') {
          if (this.barcodeSupported) {
            this._startBarcodeLoop(video);
          } else {
            await this._ensureQuagga();
            this._startQuaggaLoop(video);
          }
        } else {
          await this._startLabelLoop(video);
        }
      } catch (err) {
        console.error('Error al arrancar la cámara', err);
        this.cameraError = fioT('scan_camera_error');
        this.cameraActive = false;
      }
    },

    async stopCamera() {
      this.cameraActive = false;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      if (this._ocrTimer) clearInterval(this._ocrTimer);
      this._rafId = null;
      this._ocrTimer = null;
      if (window.Quagga && typeof window.Quagga.stop === 'function') {
        try { window.Quagga.stop(); } catch (e) {}
        try { window.Quagga.offDetected(); } catch (e) {}
      }
      if (this._stream) {
        this._stream.getTracks().forEach(t => t.stop());
        this._stream = null;
      }
      this.statusMessage = '';
    },

    // --- Modo código de barras -----------------------------------------------
    async _ensureQuagga() {
      if (window.Quagga) return;
      this.statusMessage = fioT('scan_loading_barcode');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/quagga/dist/quagga.min.js';
        script.onload = () => {
          this._quaggaLoaded = true;
          resolve();
        };
        script.onerror = () => reject(new Error('QuaggaJS CDN unavailable'));
        document.head.appendChild(script);
      });
    },

    async _startBarcodeLoop(video) {
      if (!this.barcodeSupported) {
        try {
          await this._ensureQuagga();
          this._startQuaggaLoop(video);
          return;
        } catch (err) {
          console.error('No se pudo cargar QuaggaJS', err);
          this.statusMessage = fioT('scan_unsupported_barcode');
          return;
        }
      }
      if (!this._barcodeDetector) {
        this._barcodeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
        });
      }

      const tick = async () => {
        if (!this.cameraActive) return;
        try {
          const codes = await this._barcodeDetector.detect(video);
          if (codes.length > 0) {
            const raw = codes[0].rawValue;
            const found = this._resolveByIsbn(raw);
            if (found) return;
          }
        } catch (err) {
          // detect() puede fallar en algún frame suelto; se ignora y se sigue.
        }
        this._rafId = requestAnimationFrame(tick);
      };
      this._rafId = requestAnimationFrame(tick);
    },

    _startQuaggaLoop(video) {
      if (!window.Quagga) return;
      this.statusMessage = fioT('scan_reading_barcode');
      window.Quagga.init({
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: video,
          constraints: { facingMode: 'environment' },
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'code_128_reader', 'code_39_reader'],
        },
        locate: true,
      }, (err) => {
        if (err) {
          console.error('Quagga init error', err);
          this.cameraError = fioT('scan_camera_error');
          this.cameraActive = false;
          return;
        }
        window.Quagga.start();
      });

      window.Quagga.onDetected((result) => {
        const raw = result && result.codeResult && result.codeResult.code;
        if (!raw) return;
        const found = this._resolveByIsbn(raw);
        if (found) {
          try { window.Quagga.stop(); } catch (e) {}
        }
      });
    },

    // --- Modo etiqueta (OCR) --------------------------------------------------
    async _ensureTesseract() {
      if (window.Tesseract) return;
      this.statusMessage = fioT('scan_reading_label');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    },

    async _startLabelLoop(video) {
      await this._ensureTesseract();
      this.statusMessage = fioT('scan_reading_label');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const ensureCanvasSize = () => {
        if (!video.videoWidth || !video.videoHeight) return false;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        return true;
      };

      this._ocrTimer = setInterval(async () => {
        if (!this.cameraActive || this._busyOcr || !window.Tesseract) return;
        if (!ensureCanvasSize()) return;
        this._busyOcr = true;
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const { data } = await Tesseract.recognize(canvas, 'eng', {
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
          });
          this._handleOcrText(data.text);
        } catch (err) {
          console.error('Error OCR', err);
        } finally {
          this._busyOcr = false;
        }
      }, 1800);
    },

    async scanUploadedPhoto(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      await this._ensureTesseract();
      this.statusMessage = fioT('scan_reading_label');
      try {
        const { data } = await Tesseract.recognize(file, 'eng', {
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
        });
        this._handleOcrText(data.text);
      } catch (err) {
        console.error(err);
      } finally {
        this.statusMessage = '';
      }
    },

    _handleOcrText(text) {
      const match = this._extractReference(text);
      if (match) {
        const found = this._resolveByReference(match);
        if (found) {
          this.stopCamera();
        }
      }
    },

    _extractReference(text) {
      const cleaned = (text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const m = cleaned.match(/LB0*([0-9]{1,6})/);
      return m ? 'LB' + m[1] : null;
    },

    // --- Búsqueda manual -------------------------------------------------------
    submitManualRef() {
      if (!this.manualRef.trim()) return;
      this._resolveByReference(this.manualRef.trim());
    },

    // --- Resolución contra el catálogo ------------------------------------------
    _resolveByReference(rawRef) {
      const digits = rawRef.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/LB0*([0-9]{1,6})/);
      const candidates = new Set([rawRef.toUpperCase().trim()]);
      if (digits) {
        const num = digits[1];
        candidates.add('LB' + num);
        candidates.add('LB' + num.padStart(4, '0'));
        candidates.add('LB' + num.padStart(3, '0'));
      }
      const found = this.catalog.find(b => candidates.has((b.reference || '').toUpperCase()));
      this._showResult(found);
      return found;
    },

    _resolveByIsbn(rawIsbn) {
      const normalized = (rawIsbn || '').replace(/[^0-9Xx]/g, '').toUpperCase();
      const found = this.catalog.find(b => (b.isbn || '').replace(/[^0-9Xx]/g, '').toUpperCase() === normalized);
      this._showResult(found);
      return found;
    },

    _showResult(found) {
      this.statusMessage = '';
      if (found) {
        this.resultBook = found;
        this.noMatch = false;
      } else {
        this.resultBook = null;
        this.noMatch = true;
      }
    },

    goToResult() {
      if (this.resultBook) {
        window.location.href = 'libro.html?id=' + this.resultBook.id;
      }
    },
  };
}

// Alpine (build CSP) no evalúa expresiones arbitrarias: x-data solo puede
// referenciar componentes registrados explícitamente vía Alpine.data().
// Sin este registro, Alpine lanza "Undefined variable: <nombre>" y la
// página queda inaccesible (main con aria-hidden/inert).
document.addEventListener('alpine:init', () => {
  Alpine.data('fioScanner', fioScanner);
});
