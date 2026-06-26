/**
 * CameraModule — Manages camera stream lifecycle
 * AI Honeycomb Inspector v5 Professional
 */

export class CameraModule {
  constructor(videoEl) {
    this.video = videoEl;
    this.stream = null;
    this.active = false;
  }

  async start() {
    if (this.stream) return true;
    const constraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await new Promise((res, rej) => {
        this.video.onloadedmetadata = () => { this.video.play().then(res).catch(rej); };
        this.video.onerror = rej;
        setTimeout(() => rej(new Error('Camera timeout')), 10000);
      });
      this.active = true;
      return true;
    } catch (err) {
      console.error('[Camera] Start failed:', err);
      this.stream = null;
      return false;
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.video.srcObject = null;
    this.active = false;
  }

  pause() {
    this.stream?.getTracks().forEach(t => { if (t.kind === 'video') t.enabled = false; });
  }

  resume() {
    this.stream?.getTracks().forEach(t => { if (t.kind === 'video') t.enabled = true; });
  }

  getResolution() {
    if (!this.video.videoWidth) return '—';
    return `${this.video.videoWidth}×${this.video.videoHeight}`;
  }

  isReady() {
    return this.active && this.video.readyState >= 2;
  }

  /** Capture the current frame to a canvas, returns dataURL */
  captureFrame(width, height) {
    const c = document.createElement('canvas');
    c.width = width || this.video.videoWidth;
    c.height = height || this.video.videoHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(this.video, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.92);
  }
}
