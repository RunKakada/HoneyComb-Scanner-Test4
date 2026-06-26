/**
 * Renderer — Draws AI detections on overlay canvas
 * AI Honeycomb Inspector v5 Professional
 */

const COLORS = {
  LOW:      '#22C55E',
  MODERATE: '#F59E0B',
  HIGH:     '#F97316',
  CRITICAL: '#EF4444',
};

export function getSeverity(count, largestArea) {
  if (count === 0) return 'None';
  if (count <= 2 && largestArea < 15000) return 'LOW';
  if (count <= 5 && largestArea < 40000) return 'MODERATE';
  if (count <= 10 || largestArea < 80000) return 'HIGH';
  return 'CRITICAL';
}

export function getSeverityColor(sev) {
  return COLORS[sev] || COLORS.LOW;
}

export class Renderer {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.overlayEnabled = true;
  }

  setOverlay(enabled) {
    this.overlayEnabled = enabled;
    if (!enabled) this.clear();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  /**
   * Draw detections over live video feed.
   * @param {Array} detections
   * @param {number} srcW  - source video width
   * @param {number} srcH  - source video height
   */
  draw(detections, srcW, srcH) {
    // Sync canvas size to its display size
    const dw = this.canvas.clientWidth;
    const dh = this.canvas.clientHeight;
    if (this.canvas.width !== dw || this.canvas.height !== dh) {
      this.canvas.width = dw;
      this.canvas.height = dh;
    }

    this.ctx.clearRect(0, 0, dw, dh);
    if (!this.overlayEnabled || !detections.length) return;

    const scaleX = dw / srcW;
    const scaleY = dh / srcH;

    detections.forEach((det, idx) => {
      const x = det.x1 * scaleX;
      const y = det.y1 * scaleY;
      const w = (det.x2 - det.x1) * scaleX;
      const h = (det.y2 - det.y1) * scaleY;

      const sev   = getSeverity(1, det.area);
      const color = getSeverityColor(sev);
      const conf  = Math.round(det.confidence * 100);

      // Box fill
      this.ctx.fillStyle = `${color}22`;
      this.ctx.fillRect(x, y, w, h);

      // Box border
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth   = 2;
      this.ctx.strokeRect(x, y, w, h);

      // Corner marks
      this._drawCorner(x, y, 10, color);
      this._drawCorner(x + w, y, 10, color, true);
      this._drawCorner(x, y + h, 10, color, false, true);
      this._drawCorner(x + w, y + h, 10, color, true, true);

      // Label
      const label = `#${idx + 1} ${conf}%`;
      const labelH = 20;
      const labelW = this.ctx.measureText(label).width + 14;
      const labelY = y > labelH + 4 ? y - labelH - 4 : y + 2;

      this.ctx.fillStyle = color;
      this._roundRect(x, labelY, labelW, labelH, 4);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 11px "Inter", sans-serif';
      this.ctx.fillText(label, x + 7, labelY + 13);
    });
  }

  _drawCorner(x, y, size, color, flipX = false, flipY = false) {
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(x + sx * size, y);
    this.ctx.lineTo(x, y);
    this.ctx.lineTo(x, y + sy * size);
    this.ctx.stroke();
  }

  _roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
  }

  /**
   * Render detections onto a still image canvas for capture storage.
   * Returns dataURL of composite image.
   */
  renderToImage(originalDataUrl, detections, srcW, srcH) {
    const c = document.createElement('canvas');
    c.width = srcW; c.height = srcH;
    const ctx = c.getContext('2d');

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, srcW, srcH);

        detections.forEach((det, idx) => {
          const x = det.x1, y = det.y1;
          const w = det.x2 - det.x1;
          const h = det.y2 - det.y1;
          const sev = getSeverity(1, det.area);
          const color = getSeverityColor(sev);
          const conf = Math.round(det.confidence * 100);

          // Overlay box
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, srcW / 320);
          ctx.fillStyle = `${color}33`;
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);

          // Label
          const fontSize = Math.max(12, srcW / 60);
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          const label = `#${idx + 1} Honeycomb ${conf}%`;
          const lw = ctx.measureText(label).width + 12;
          const lh = fontSize + 8;
          const ly = y > lh + 2 ? y - lh - 2 : y + 2;
          ctx.fillStyle = color;
          ctx.fillRect(x, ly, lw, lh);
          ctx.fillStyle = '#FFF';
          ctx.fillText(label, x + 6, ly + fontSize + 1);
        });

        resolve(c.toDataURL('image/jpeg', 0.92));
      };
      img.src = originalDataUrl;
    });
  }
}
