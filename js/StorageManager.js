/**
 * StorageManager — Handles all localStorage persistence
 * AI Honeycomb Inspector v5 Professional
 */

const KEYS = {
  HISTORY: 'hci_inspection_history',
  SETTINGS: 'hci_settings',
};

const DEFAULT_SETTINGS = {
  inspector: '',
  company: '',
  overlayEnabled: true,
  confidenceThreshold: 0.35,
};

export class StorageManager {
  // ── Settings ─────────────────────────────────────────────────
  static getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  static saveSettings(settings) {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch { return false; }
  }

  // ── History ──────────────────────────────────────────────────
  static getHistory() {
    try {
      const raw = localStorage.getItem(KEYS.HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  static saveInspection(inspection) {
    try {
      const history = StorageManager.getHistory();
      history.unshift(inspection);
      // Keep last 50 inspections
      if (history.length > 50) history.splice(50);
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
      return true;
    } catch { return false; }
  }

  static deleteInspection(id) {
    try {
      const history = StorageManager.getHistory().filter(i => i.id !== id);
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
      return true;
    } catch { return false; }
  }

  static clearHistory() {
    try {
      localStorage.removeItem(KEYS.HISTORY);
      return true;
    } catch { return false; }
  }
}
