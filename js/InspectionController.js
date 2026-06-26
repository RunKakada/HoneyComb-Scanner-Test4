/**
 * InspectionController — Manages the inspection screen loop
 * AI Honeycomb Inspector v5 Professional
 *
 * Responsibilities:
 *  - Drive the rAF detection loop
 *  - Update status bar (FPS, elapsed, detections)
 *  - Handle capture / freeze / overlay / reset
 *  - Pause AI while Report Form modal is open
 *  - Hand off to ReportGenerator only after form submit
 */

import { CameraModule }      from './CameraModule.js';
import { AIDetector }        from './AIDetector.js';
import { Renderer, getSeverity } from './Renderer.js';
import { InspectionSession } from './InspectionSession.js';
import { UIController }      from './UIController.js';

export class InspectionController {
  constructor(ui) {
    this.ui = ui;

    // Sub-modules (initialised in init())
    this.camera   = null;
    this.detector = null;
    this.renderer = null;
    this.session  = null;

    // State
    this.frozen    = false;
    this.overlayOn = true;
    this.paused    = false;   // true while report form is open
    this.running   = false;
    this.rafId     = null;

    // FPS counter
    this._fpsFrames = 0;
    this._fpsLast   = 0;
    this._fps       = 0;

    // Elapsed timer
    this._elapsedInterval = null;

    // DOM refs (cached once)
    this._video         = document.getElementById('camera-video');
    this._canvas        = document.getElementById('detection-canvas');
    this._noCameraMsg   = document.getElementById('no-camera-msg');
    this._detBadge      = document.getElementById('det-live-badge');
    this._strip         = document.getElementById('capture-strip');
    this._stripEmpty    = document.getElementById('capture-empty');
    this._btnCapture    = document.getElementById('btn-capture');
    this._btnReport     = document.getElementById('btn-open-report-form');
    this._btnFreeze     = document.getElementById('btn-freeze');
    this._btnOverlay    = document.getElementById('btn-overlay');
    this._btnReset      = document.getElementById('btn-reset');

    // Status bar elements
    this._elFps      = document.getElementById('insp-fps');
    this._elRes      = document.getElementById('insp-resolution');
    this._elDet      = document.getElementById('insp-det-count');
    this._elElapsed  = document.getElementById('insp-elapsed');
    this._elAiDot    = document.getElementById('insp-ai-dot');
    this._elAiLabel  = document.getElementById('insp-ai-label');
  }

  async init(aiDetector) {
    this.detector = aiDetector;
    this.camera   = new CameraModule(this._video);
    this.renderer = new Renderer(this._canvas);
    this.session  = new InspectionSession();
    this._bindButtons();
  }

  async startInspection() {
    this.session.reset();
    this._clearStrip();
    this._btnReport.disabled = true;
    this.running = false;
    this.frozen  = false;
    this.paused  = false;

    const ok = await this.camera.start();
    if (!ok) {
      this._noCameraMsg.classList.add('visible');
      this.ui.toast('Camera unavailable — check permissions', 'error');
      return;
    }
    this._noCameraMsg.classList.remove('visible');
    this._elRes.textContent = this.camera.getResolution();

    // Start AI loop
    this.running = true;
    this._fpsLast = performance.now();
    this.rafId = requestAnimationFrame(this._loop.bind(this));

    // Elapsed timer
    this._elapsedInterval = setInterval(() => {
      this._elElapsed.textContent = UIController.formatTime(this.session.elapsedSeconds);
    }, 1000);

    this._setAiStatus(this.detector.ready ? 'active' : 'warn', this.detector.ready ? 'AI Active' : 'Model Loading');
  }

  stopInspection() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.camera.stop();
    clearInterval(this._elapsedInterval);
    this.renderer.clear();
  }

  /** Called before opening report form — pauses AI loop */
  pauseAI() {
    this.paused = true;
    this._setAiStatus('warn', 'AI Paused');
  }

  /** Called after report form closes (cancel or generate) */
  resumeAI() {
    this.paused = false;
    if (this.running && !this.frozen) {
      this._setAiStatus('active', 'AI Active');
    }
  }

  // ── Detection Loop ────────────────────────────────────────────
  async _loop(now) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this._loop.bind(this));

    if (this.paused || this.frozen || !this.camera.isReady()) return;

    // FPS
    this._fpsFrames++;
    if (now - this._fpsLast >= 1000) {
      this._fps = this._fpsFrames;
      this._fpsFrames = 0;
      this._fpsLast = now;
      this._elFps.textContent = `${this._fps} FPS`;
    }

    // Run detection (async, but we await so we don't pile up)
    const detections = await this.detector.detect(this._video);
    this.session.lastDetections = detections;

    const count = detections.length;
    const areas = detections.map(d => d.area);
    const largest = areas.length ? Math.max(...areas) : 0;
    const sev = getSeverity(count, largest);

    // Draw overlay
    this.renderer.draw(detections, this._video.videoWidth, this._video.videoHeight);

    // Update live badge
    if (count > 0) {
      this._detBadge.style.display = 'block';
      document.getElementById('badge-count').textContent = count;
      document.getElementById('badge-area').textContent = UIController.formatArea(largest);
      document.getElementById('badge-sev').textContent = sev;
    } else {
      this._detBadge.style.display = 'none';
    }

    // Status bar
    this._elDet.textContent = `${count} Found`;
  }

  // ── Capture ───────────────────────────────────────────────────
  async capture() {
    if (!this.camera.isReady()) {
      this.ui.toast('Camera not ready', 'warn');
      return;
    }

    // Flash effect
    this._flashEffect();

    const w = this._video.videoWidth;
    const h = this._video.videoHeight;
    const originalUrl  = this.camera.captureFrame(w, h);
    const detections   = [...(this.session.lastDetections || [])];
    const detectionUrl = await this.renderer.renderToImage(originalUrl, detections, w, h);

    const record = this.session.addCapture(originalUrl, detectionUrl, detections);
    this._addThumb(record);

    // Enable report button after first capture
    this._btnReport.disabled = false;

    this.ui.toast(`Photo #${record.index} captured — ${record.count} defect${record.count !== 1 ? 's' : ''} detected`, 'success');
  }

  _flashEffect() {
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed;inset:0;background:white;opacity:.8;z-index:50;
      pointer-events:none;animation:flashFade .3s ease forwards;
    `;
    if (!document.querySelector('#flash-style')) {
      const style = document.createElement('style');
      style.id = 'flash-style';
      style.textContent = '@keyframes flashFade{to{opacity:0}}';
      document.head.appendChild(style);
    }
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 350);
  }

  _addThumb(record) {
    this._stripEmpty.style.display = 'none';
    const thumb = document.createElement('div');
    thumb.className = 'capture-thumb';
    thumb.innerHTML = `
      <img src="${record.detectionUrl}" alt="Capture ${record.index}"/>
      <div class="capture-thumb-badge">${record.count}</div>
    `;
    thumb.title = `Photo #${record.index} — ${record.count} defect(s)`;
    this._strip.appendChild(thumb);
    this._strip.scrollLeft = this._strip.scrollWidth;
  }

  _clearStrip() {
    this._strip.innerHTML = '';
    const empty = document.createElement('div');
    empty.id = 'capture-strip-empty';
    empty.className = 'capture-strip-empty';
    empty.textContent = 'No captures yet — tap 📸 to capture';
    this._strip.appendChild(empty);
    this._stripEmpty = empty;
  }

  // ── Button Bindings ───────────────────────────────────────────
  _bindButtons() {
    this._btnCapture.addEventListener('click', () => this.capture());

    this._btnFreeze.addEventListener('click', () => {
      this.frozen = !this.frozen;
      this._btnFreeze.classList.toggle('active', this.frozen);
      if (this.frozen) {
        this.camera.pause();
        this._setAiStatus('warn', 'Frozen');
        this.ui.toast('Feed frozen');
      } else {
        this.camera.resume();
        this._setAiStatus('active', 'AI Active');
        this.ui.toast('Feed resumed');
      }
    });

    this._btnOverlay.addEventListener('click', () => {
      this.overlayOn = !this.overlayOn;
      this.renderer.setOverlay(this.overlayOn);
      this._btnOverlay.classList.toggle('active', this.overlayOn);
      this.ui.toast(this.overlayOn ? 'Overlay on' : 'Overlay off');
    });

    this._btnReset.addEventListener('click', () => {
      if (!confirm('Reset this inspection? All captures will be cleared.')) return;
      this.session.reset();
      this._clearStrip();
      this._btnReport.disabled = true;
      this._btnFreeze.classList.remove('active');
      this.frozen = false;
      this.camera.resume();
      this.renderer.clear();
      this._elElapsed.textContent = '00:00';
      this._setAiStatus('active', 'AI Active');
      this.ui.toast('Inspection reset');
    });
  }

  _setAiStatus(state, label) {
    this._elAiDot.className = `insp-status-dot ${state}`;
    this._elAiLabel.textContent = label;
  }

  get hasCaptures() {
    return this.session.captureCount > 0;
  }
}
