/**
 * HistoryController — Renders and manages inspection history
 * AI Honeycomb Inspector v5 Professional
 */

import { StorageManager } from './StorageManager.js';
import { UIController }   from './UIController.js';
import { getSeverityColor } from './Renderer.js';

export class HistoryController {
  constructor(ui) {
    this.ui = ui;
    this._list = document.getElementById('history-list');
  }

  render() {
    const history = StorageManager.getHistory();
    this._list.innerHTML = '';

    if (!history.length) {
      this._list.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
          </svg>
          <p>No inspection history yet.</p>
          <p class="empty-sub">Completed inspections will appear here.</p>
        </div>`;
      return;
    }

    history.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      const color = getSeverityColor(item.severity || 'LOW');
      const duration = UIController.formatTime(item.duration || 0);
      const date = UIController.formatDate(new Date(item.date).getTime());

      el.innerHTML = `
        <div class="history-item-thumb" style="background:var(--gray-100);display:flex;align-items:center;justify-content:center;color:var(--gray-400);font-size:11px;font-weight:700;">
          ${item.captures || 0}<br>📷
        </div>
        <div class="history-item-info">
          <div class="history-item-title">${item.project || 'Unnamed Project'}</div>
          <div class="history-item-meta">${item.inspector || '—'} · ${date}</div>
          <div class="history-item-meta" style="margin-top:3px;">
            ${item.totalHoneycombs || 0} defect${item.totalHoneycombs !== 1 ? 's' : ''} · ${duration}
          </div>
        </div>
        <div class="history-item-badge">
          <span class="rpt-status-pill ${this._pillClass(item.severity)}" style="font-size:11px;padding:3px 10px;">
            ${item.severity || '—'}
          </span>
        </div>`;
      this._list.appendChild(el);
    });
  }

  clearAll() {
    if (!confirm('Clear all inspection history? This cannot be undone.')) return;
    StorageManager.clearHistory();
    this.render();
    this.ui.toast('History cleared');
  }

  _pillClass(sev) {
    return { LOW:'pill-green', MODERATE:'pill-amber', HIGH:'pill-orange', CRITICAL:'pill-red', None:'pill-blue' }[sev] || 'pill-blue';
  }
}
