/**
 * AIDetector — YOLOv8 ONNX inference engine
 * AI Honeycomb Inspector v5 Professional
 *
 * Input  : [1, 3, 640, 640]  (RGB normalised 0–1)
 * Output : [1, 5, 8400]      (cx, cy, w, h, conf) — single-class honeycomb
 */

const MODEL_PATH = 'Model/best.onnx';
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD  = 0.45;
const CLASS_NAMES    = ['Honeycomb'];

export class AIDetector {
  constructor() {
    this.session = null;
    this.ready = false;
    this.loading = false;
  }

  async load(onProgress) {
    if (this.ready || this.loading) return this.ready;
    this.loading = true;
    try {
      // Wait for ort to be available (loaded via CDN script tag)
      await this._waitForORT();
      ort.env.wasm.numThreads = navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4)
        : 2;
      onProgress?.('Loading AI model…');
      this.session = await ort.InferenceSession.create(MODEL_PATH, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      this.ready = true;
      this.loading = false;
      onProgress?.('AI model ready');
      return true;
    } catch (err) {
      console.error('[AI] Model load failed:', err);
      this.loading = false;
      return false;
    }
  }

  async _waitForORT(timeout = 10000) {
    const start = Date.now();
    while (typeof ort === 'undefined') {
      if (Date.now() - start > timeout) throw new Error('ONNX Runtime not available');
      await new Promise(r => setTimeout(r, 100));
    }
  }

  /**
   * Run inference on a video or canvas element.
   * Returns array of detection objects.
   */
  async detect(source) {
    if (!this.ready || !this.session) return [];
    try {
      const { tensor, scaleX, scaleY, padX, padY } = this._preprocess(source);
      const feeds = { [this.session.inputNames[0]]: tensor };
      const results = await this.session.run(feeds);
      const output = results[this.session.outputNames[0]];
      return this._postprocess(output, scaleX, scaleY, padX, padY, source.videoWidth || source.width, source.videoHeight || source.height);
    } catch (err) {
      console.warn('[AI] Inference error:', err);
      return [];
    }
  }

  // ── Pre-processing ───────────────────────────────────────────
  _preprocess(source) {
    const srcW = source.videoWidth || source.width;
    const srcH = source.videoHeight || source.height;

    // Letterbox scale
    const scale = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
    const newW  = Math.round(srcW * scale);
    const newH  = Math.round(srcH * scale);
    const padX  = Math.floor((INPUT_SIZE - newW) / 2);
    const padY  = Math.floor((INPUT_SIZE - newH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = INPUT_SIZE; canvas.height = INPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.drawImage(source, padX, padY, newW, newH);

    const imageData = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
    const float32 = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
    for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
      float32[i]                           = imageData[i * 4]     / 255.0; // R
      float32[INPUT_SIZE * INPUT_SIZE + i] = imageData[i * 4 + 1] / 255.0; // G
      float32[2 * INPUT_SIZE * INPUT_SIZE + i] = imageData[i * 4 + 2] / 255.0; // B
    }

    return {
      tensor: new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]),
      scaleX: 1 / scale,
      scaleY: 1 / scale,
      padX,
      padY,
    };
  }

  // ── Post-processing ──────────────────────────────────────────
  _postprocess(output, scaleX, scaleY, padX, padY, srcW, srcH) {
    const data    = output.data;
    const [, rows, cols] = output.dims; // [1, 5, 8400] or [1, 84, 8400]
    const numDets = cols;
    const numAttribs = rows; // 5 for single class: cx, cy, w, h, conf

    const boxes = [];

    for (let i = 0; i < numDets; i++) {
      // Support both [1,5,8400] and [1,84,8400] layouts
      let conf, cx, cy, w, h;
      if (numAttribs === 5) {
        cx   = data[0 * numDets + i];
        cy   = data[1 * numDets + i];
        w    = data[2 * numDets + i];
        h    = data[3 * numDets + i];
        conf = data[4 * numDets + i];
      } else {
        // standard YOLOv8 multi-class: [cx,cy,w,h, cls0, cls1…]
        cx = data[0 * numDets + i];
        cy = data[1 * numDets + i];
        w  = data[2 * numDets + i];
        h  = data[3 * numDets + i];
        let maxConf = 0;
        for (let c = 4; c < numAttribs; c++) {
          const v = data[c * numDets + i];
          if (v > maxConf) maxConf = v;
        }
        conf = maxConf;
      }

      if (conf < CONF_THRESHOLD) continue;

      // Undo letterbox padding and scale back to source coords
      const x1 = ((cx - w / 2) - padX) * scaleX;
      const y1 = ((cy - h / 2) - padY) * scaleY;
      const x2 = ((cx + w / 2) - padX) * scaleX;
      const y2 = ((cy + h / 2) - padY) * scaleY;

      boxes.push({
        x1: Math.max(0, x1), y1: Math.max(0, y1),
        x2: Math.min(srcW, x2), y2: Math.min(srcH, y2),
        confidence: conf,
        className: CLASS_NAMES[0],
        area: Math.round((x2 - x1) * (y2 - y1)),
      });
    }

    return this._nms(boxes);
  }

  // ── Non-Maximum Suppression ──────────────────────────────────
  _nms(boxes) {
    if (!boxes.length) return [];
    boxes.sort((a, b) => b.confidence - a.confidence);
    const keep = [];
    const suppressed = new Array(boxes.length).fill(false);

    for (let i = 0; i < boxes.length; i++) {
      if (suppressed[i]) continue;
      keep.push(boxes[i]);
      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed[j]) continue;
        if (this._iou(boxes[i], boxes[j]) > IOU_THRESHOLD) suppressed[j] = true;
      }
    }
    return keep;
  }

  _iou(a, b) {
    const ix1 = Math.max(a.x1, b.x1), iy1 = Math.max(a.y1, b.y1);
    const ix2 = Math.min(a.x2, b.x2), iy2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
    if (inter === 0) return 0;
    const aArea = (a.x2 - a.x1) * (a.y2 - a.y1);
    const bArea = (b.x2 - b.x1) * (b.y2 - b.y1);
    return inter / (aArea + bArea - inter);
  }
}
