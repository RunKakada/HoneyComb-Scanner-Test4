/**
 * app.js — Application entry point & orchestrator
 * AI Honeycomb Inspector v5 Professional
 * Construction Intelligence Laboratory (CI-Lab)
 *
 * Module dependency graph:
 *   app.js
 *   ├── UIController
 *   ├── StorageManager
 *   ├── AIDetector
 *   ├── InspectionController
 *   │   ├── CameraModule
 *   │   ├── Renderer
 *   │   └── InspectionSession
 *   ├── ReportGenerator
 *   └── HistoryController
 */

import { UIController }         from './modules/UIController.js';
import { StorageManager }       from './modules/StorageManager.js';
import { AIDetector }           from './modules/AIDetector.js';
import { InspectionController } from './modules/InspectionController.js';
import { ReportGenerator }      from './modules/ReportGenerator.js';
import { HistoryController }    from './modules/HistoryController.js';

class App {
  constructor() {
    this.ui          = new UIController();
    this.detector    = new AIDetector();
    this.inspection  = null;  // lazy-init on first "Start Inspection"
    this.report      = new ReportGenerator();
    this.history     = new HistoryController(this.ui);

    // Cached form data (populated only on "Generate Report" click)
    this._formData = null;
  }

  async boot() {
    this._bindNav();
    this._bindReportForm();
    this._bindExport();
    this._bindHistory();
    this._bindAbout();

    // Load AI model in background
    this._loadAIModel();
  }

  // ── AI Model Loading ──────────────────────────────────────────
  async _loadAIModel() {
    this.ui.setHomeStatus('ai-model-status', 'Loading…');
    this.ui.setHomeDot('ai-dot', '');

    const ok = await this.detector.load((msg) => {
      this.ui.setHomeStatus('ai-model-status', msg);
    });

    if (ok) {
      this.ui.setHomeStatus('ai-model-status', 'YOLOv8 Ready ✓');
      this.ui.setHomeDot('ai-dot', 'ok');
    } else {
      this.ui.setHomeStatus('ai-model-status', 'Load Failed');
      this.ui.setHomeDot('ai-dot', 'error');
      this.ui.toast('AI model failed to load — check Model/best.onnx path', 'error', 5000);
    }
  }

  // ── Navigation ────────────────────────────────────────────────
  _bindNav() {
    // Home → Inspection
    document.getElementById('btn-start-inspection').addEventListener('click', () => {
      this._startInspection();
    });

    // Inspection → Home (back)
    document.getElementById('btn-back-home').addEventListener('click', () => {
      if (this.inspection?.hasCaptures) {
        if (!confirm('Leave inspection? Unsaved captures will be lost.')) return;
      }
      this.inspection?.stopInspection();
      this.ui.showScreen('home');
      this._updateCameraStatus(false);
    });

    // Report → Inspection (back)
    document.getElementById('btn-back-inspection').addEventListener('click', () => {
      this.ui.showScreen('inspection');
    });

    // History
    document.getElementById('btn-history').addEventListener('click', () => {
      this.history.render();
      this.ui.showScreen('history');
    });
    document.getElementById('btn-back-home-hist').addEventListener('click', () => {
      this.ui.showScreen('home');
    });

    // About modal
    document.getElementById('btn-about').addEventListener('click', () => {
      document.getElementById('modal-about').style.display = 'flex';
    });
    document.getElementById('btn-close-about').addEventListener('click', () => {
      document.getElementById('modal-about').style.display = 'none';
    });
    document.getElementById('btn-close-about-btn').addEventListener('click', () => {
      document.getElementById('modal-about').style.display = 'none';
    });

    // Open report form button (in inspection toolbar)
    document.getElementById('btn-open-report-form').addEventListener('click', () => {
      this._openReportForm();
    });
  }

  async _startInspection() {
    // Lazy-init the inspection controller
    if (!this.inspection) {
      this.inspection = new InspectionController(this.ui);
      await this.inspection.init(this.detector);
    }

    this.ui.showScreen('inspection');
    this.ui.showLoading('Initialising camera…');

    await this.inspection.startInspection();

    this.ui.hideLoading();
    this._updateCameraStatus(true);
  }

  _updateCameraStatus(active) {
    const cam = this.inspection?.camera;
    if (active && cam?.active) {
      this.ui.setHomeStatus('camera-status', cam.getResolution());
      this.ui.setHomeDot('cam-dot', 'ok');
    } else {
      this.ui.setHomeStatus('camera-status', 'Not Connected');
      this.ui.setHomeDot('cam-dot', '');
    }
  }

  // ── Report Form ───────────────────────────────────────────────
  _openReportForm() {
    // Pause AI while form is open — no wasted processing
    this.inspection?.pauseAI();

    // Pre-fill from saved settings
    const settings = StorageManager.getSettings();
    const inspEl = document.getElementById('f-inspector');
    const compEl = document.getElementById('f-company');
    if (!inspEl.value && settings.inspector) inspEl.value = settings.inspector;
    if (!compEl.value && settings.company)   compEl.value = settings.company;

    document.getElementById('modal-report-form').style.display = 'flex';
  }

  _closeReportForm() {
    document.getElementById('modal-report-form').style.display = 'none';
    // Resume AI when form is dismissed
    this.inspection?.resumeAI();
  }

  _bindReportForm() {
    document.getElementById('btn-close-form').addEventListener('click', () => {
      this._closeReportForm();
    });
    document.getElementById('btn-cancel-form').addEventListener('click', () => {
      this._closeReportForm();
    });

    // Close on backdrop click
    document.getElementById('modal-report-form').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-report-form')) {
        this._closeReportForm();
      }
    });

    // Generate Report — ONLY triggered here, never while typing
    document.getElementById('btn-generate-report').addEventListener('click', () => {
      this._generateReport();
    });
  }

  _generateReport() {
    // Collect form data ONCE at click time
    this._formData = {
      project:    document.getElementById('f-project').value.trim()   || 'Unnamed Project',
      subject:    document.getElementById('f-subject').value.trim(),
      location:   document.getElementById('f-location').value.trim(),
      structType: document.getElementById('f-struct-type').value,
      structId:   document.getElementById('f-struct-id').value.trim(),
      inspector:  document.getElementById('f-inspector').value.trim(),
      company:    document.getElementById('f-company').value.trim(),
      weather:    document.getElementById('f-weather').value,
      remark:     document.getElementById('f-remark').value.trim(),
    };

    // Persist inspector / company for next time
    StorageManager.saveSettings({
      ...StorageManager.getSettings(),
      inspector: this._formData.inspector,
      company:   this._formData.company,
    });

    // Save to history
    if (this.inspection?.session) {
      StorageManager.saveInspection(
        this.inspection.session.toHistoryRecord(this._formData)
      );
    }

    // Close form
    document.getElementById('modal-report-form').style.display = 'none';
    // Don't resume AI — inspection is effectively done, we move to report screen
    this.inspection?.stopInspection();

    // Build report HTML
    this.ui.showLoading('Generating report…');
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const html = this.report.generate(this.inspection.session, this._formData);
          document.getElementById('report-content').innerHTML = html;
          this.ui.hideLoading();
          this.ui.showScreen('report');
        } catch (err) {
          console.error('[Report] Generation error:', err);
          this.ui.hideLoading();
          this.ui.toast('Report generation failed', 'error');
        }
      }, 80);
    });
  }

  // ── PDF Export ────────────────────────────────────────────────
  _bindExport() {
    document.getElementById('btn-export-pdf').addEventListener('click', () => {
      this._exportPDF();
    });
  }

  async _exportPDF() {
    this.ui.showLoading('Preparing PDF…');
    try {
      const { jsPDF } = window.jspdf;
      const reportEl = document.getElementById('report-content');

      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const pageW  = pdf.internal.pageSize.getWidth();
      const pageH  = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imgW   = pageW - margin * 2;
      const imgH   = (canvas.height * imgW) / canvas.width;

      let yPos = margin;
      let remaining = imgH;

      // Multi-page support
      const pageContent = pageH - margin * 2;
      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageContent);
        const srcY   = (imgH - remaining) * (canvas.height / imgH);
        const srcH   = sliceH * (canvas.height / imgH);

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width  = canvas.width;
        sliceCanvas.height = srcH;
        const sCtx = sliceCanvas.getContext('2d');
        sCtx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        if (remaining < imgH) pdf.addPage();
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sliceH);
        remaining -= sliceH;
      }

      const sessionId = this.inspection?.session?.id || 'report';
      const project   = (this._formData?.project || 'inspection').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${project}_${sessionId}.pdf`);
      this.ui.hideLoading();
      this.ui.toast('PDF exported successfully', 'success');
    } catch (err) {
      console.error('[PDF] Export error:', err);
      this.ui.hideLoading();
      this.ui.toast('PDF export failed — please try again', 'error');
    }
  }

  // ── History ───────────────────────────────────────────────────
  _bindHistory() {
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      this.history.clearAll();
    });
  }

  // ── About ─────────────────────────────────────────────────────
  _bindAbout() {
    // Close about modal on backdrop click
    document.getElementById('modal-about').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-about')) {
        document.getElementById('modal-about').style.display = 'none';
      }
    });
  }
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.boot().catch(console.error);

  // Expose for debugging
  window.__hci = app;
});
