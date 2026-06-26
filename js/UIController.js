/**
 * UIController — Screen navigation, toasts, loading overlay
 * AI Honeycomb Inspector v5 Professional
 */

export class UIController {
  constructor() {
    this.screens = {
      home:       document.getElementById('screen-home'),
      inspection: document.getElementById('screen-inspection'),
      report:     document.getElementById('screen-report'),
      history:    document.getElementById('screen-history'),
    };
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingMsg     = document.getElementById('loading-msg');
    this.toastContainer = document.getElementById('toast-container');
    this.currentScreen  = 'home';
  }

  /** Navigate to a named screen */
  showScreen(name) {
    if (!this.screens[name]) return;
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[name].classList.add('active');
    this.currentScreen = name;
  }

  showLoading(msg = 'Loading…') {
    this.loadingMsg.textContent = msg;
    this.loadingOverlay.style.display = 'flex';
  }

  hideLoading() {
    this.loadingOverlay.style.display = 'none';
  }

  toast(msg, type = 'default', duration = 2800) {
    const el = document.createElement('div');
    el.className = `toast${type !== 'default' ? ` toast-${type}` : ''}`;
    el.textContent = msg;
    this.toastContainer.appendChild(el);
    setTimeout(() => el.remove(), duration + 300);
  }

  /** Set the ai/camera status dots on home screen */
  setHomeDot(id, state) {
    // state: 'ok' | 'warn' | 'error' | ''
    const dot = document.getElementById(id);
    if (!dot) return;
    dot.className = `status-dot ${state}`;
  }

  setHomeStatus(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /** Format seconds → MM:SS */
  static formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /** Format area in px² to a human string */
  static formatArea(px) {
    if (!px) return '—';
    if (px >= 1_000_000) return `${(px / 1_000_000).toFixed(2)} Mpx²`;
    if (px >= 1_000) return `${(px / 1000).toFixed(1)} kpx²`;
    return `${px} px²`;
  }

  static formatPercent(val) {
    return `${Math.round((val || 0) * 100)}%`;
  }

  static formatDate(ts) {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
