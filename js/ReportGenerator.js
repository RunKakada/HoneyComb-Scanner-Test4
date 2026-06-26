/**
 * ReportGenerator — Builds professional engineering report HTML
 * AI Honeycomb Inspector v5 Professional
 * Construction Intelligence Laboratory (CI-Lab)
 *
 * NOTE: Called ONCE when user clicks "Generate Report". Never called
 * while form fields are being edited.
 */

import { UIController } from './UIController.js';
import { getSeverity, getSeverityColor } from './Renderer.js';

const fmt = UIController;

export class ReportGenerator {
  /**
   * @param {InspectionSession} session
   * @param {Object} formData  - project info from modal form
   * @returns {string} HTML string for #report-content
   */
  generate(session, formData) {
    const now        = new Date();
    const dateStr    = now.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
    const timeStr    = now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
    const severity   = session.overallSeverity;
    const sevColor   = getSeverityColor(severity);
    const duration   = session.elapsedSeconds;
    const avgConf    = session.averageConfidence;
    const allDets    = session.captures.flatMap(c => c.detections);

    return `
      ${this._cover(session, formData, dateStr, timeStr, severity)}
      ${this._executiveSummary(session, formData, severity, avgConf, duration, dateStr)}
      ${this._statistics(session, duration)}
      ${this._detectionOverview(session)}
      ${this._capturedImages(session)}
      ${this._defectAnalysis(allDets)}
      ${this._engineeringAssessment(session, severity, formData)}
      ${this._riskAssessment(severity)}
      ${this._repairRecommendation(severity)}
      ${this._repairMethodStatement()}
      ${this._inspectorVerification(formData, session.id, dateStr)}
      ${this._footer(session.id, dateStr, timeStr)}
    `;
  }

  // ── 1. Cover Page ─────────────────────────────────────────────
  _cover(session, form, dateStr, timeStr, severity) {
    const projName = form.project || 'Unnamed Project';
    const inspector = form.inspector || 'Not Specified';
    const company = form.company || '—';
    const location = form.location || '—';
    return `
    <div class="rpt-cover">
      <div class="rpt-cover-logos">
        <div class="rpt-cover-logo-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L40 13V31L24 40L8 31V13L24 4Z" fill="rgba(255,255,255,0.3)"/>
            <path d="M24 16L32 21V27L24 32L16 27V21L24 16Z" fill="white"/>
          </svg>
        </div>
        <div class="rpt-cover-logo-text">
          <span class="rpt-cover-logo-name">AI Honeycomb Inspector</span>
          <span class="rpt-cover-logo-sub">Construction Intelligence Laboratory (CI-Lab)</span>
        </div>
      </div>
      <div class="rpt-cover-badge">INSPECTION REPORT — VERSION 5 PROFESSIONAL</div>
      <div>
        <div class="rpt-cover-title">Concrete Surface<br>Defect Inspection Report</div>
        <div style="margin-top:8px;font-size:15px;opacity:.75;">${projName}</div>
      </div>
      <div class="rpt-cover-meta">
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Inspection No.</span>
          <span class="rpt-cover-meta-value" style="font-family:var(--font-mono);font-size:12px;">${session.id}</span>
        </div>
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Date Generated</span>
          <span class="rpt-cover-meta-value">${dateStr} at ${timeStr}</span>
        </div>
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Inspector</span>
          <span class="rpt-cover-meta-value">${inspector}</span>
        </div>
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Organisation</span>
          <span class="rpt-cover-meta-value">${company}</span>
        </div>
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Location</span>
          <span class="rpt-cover-meta-value">${location}</span>
        </div>
        <div class="rpt-cover-meta-row">
          <span class="rpt-cover-meta-label">Overall Severity</span>
          <span class="rpt-cover-meta-value" style="color:${this._severityLightColor(severity)}">${severity === 'None' ? 'No Defects Detected' : severity}</span>
        </div>
      </div>
    </div>`;
  }

  // ── 2. Executive Summary ──────────────────────────────────────
  _executiveSummary(session, form, severity, avgConf, duration, dateStr) {
    const statusPill = this._severityPill(severity);
    const struct = [form.structType, form.structId].filter(Boolean).join(' — ') || '—';
    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Executive Summary</div>
          <div class="rpt-section-desc">Overview of inspection findings and key metrics</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="font-size:13px;color:var(--gray-500);font-weight:600;">Overall Status</span>
        ${statusPill}
      </div>
      <table class="rpt-info-table">
        <tbody>
          ${this._infoRow('Project Name', form.project || '—')}
          ${this._infoRow('Subject', form.subject || '—')}
          ${this._infoRow('Location', form.location || '—')}
          ${this._infoRow('Structural Element', struct)}
          ${this._infoRow('Inspector', form.inspector || '—')}
          ${this._infoRow('Organisation / Company', form.company || '—')}
          ${this._infoRow('Weather Conditions', form.weather || '—')}
          ${this._infoRow('Inspection Date', dateStr)}
          ${this._infoRow('Inspection Duration', fmt.formatTime(duration))}
          ${this._infoRow('Captured Frames', `${session.captureCount} photo${session.captureCount !== 1 ? 's' : ''}`)}
          ${this._infoRow('Total Defects Detected', `${session.totalHoneycombs}`)}
          ${this._infoRow('Average AI Confidence', fmt.formatPercent(avgConf))}
          ${this._infoRow('Overall Severity', severity === 'None' ? 'No Defects' : severity)}
        </tbody>
      </table>
      ${form.remark ? `<div style="margin-top:16px;padding:14px 16px;background:var(--gray-50);border-radius:var(--r-md);border-left:3px solid var(--blue-600);">
        <div style="font-size:11px;font-weight:700;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Remarks</div>
        <div style="font-size:13px;color:var(--gray-700);line-height:1.6;">${form.remark}</div>
      </div>` : ''}
    </div>`;
  }

  // ── 3. Statistics ─────────────────────────────────────────────
  _statistics(session, duration) {
    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Inspection Statistics</div>
          <div class="rpt-section-desc">Quantitative summary of all detection data</div>
        </div>
      </div>
      <div class="rpt-summary-grid">
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Total Honeycombs</div>
          <div class="rpt-summary-value" style="color:${getSeverityColor(session.overallSeverity)}">${session.totalHoneycombs}</div>
          <div class="rpt-summary-sub">across all captures</div>
        </div>
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Largest Area</div>
          <div class="rpt-summary-value">${fmt.formatArea(session.largestArea)}</div>
          <div class="rpt-summary-sub">single defect</div>
        </div>
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Total Area</div>
          <div class="rpt-summary-value">${fmt.formatArea(session.totalArea)}</div>
          <div class="rpt-summary-sub">all defects combined</div>
        </div>
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Avg. Confidence</div>
          <div class="rpt-summary-value">${fmt.formatPercent(session.averageConfidence)}</div>
          <div class="rpt-summary-sub">AI detection certainty</div>
        </div>
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Inspection Time</div>
          <div class="rpt-summary-value">${fmt.formatTime(duration)}</div>
          <div class="rpt-summary-sub">elapsed duration</div>
        </div>
        <div class="rpt-summary-card">
          <div class="rpt-summary-label">Captured Photos</div>
          <div class="rpt-summary-value">${session.captureCount}</div>
          <div class="rpt-summary-sub">frames analysed</div>
        </div>
      </div>
    </div>`;
  }

  // ── 4. Detection Overview Table ───────────────────────────────
  _detectionOverview(session) {
    const rows = session.captures.map(c => `
      <tr>
        <td><strong>#${c.index}</strong></td>
        <td>${c.count}</td>
        <td>${fmt.formatArea(c.largestArea)}</td>
        <td>${fmt.formatArea(c.totalArea)}</td>
        <td>${fmt.formatPercent(c.averageConfidence)}</td>
        <td>${this._severityPill(c.severity)}</td>
        <td style="font-family:var(--font-mono);font-size:11px;">${fmt.formatDate(c.timestamp)}</td>
      </tr>`).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Detection Overview</div>
          <div class="rpt-section-desc">Per-capture summary of detected defects</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="rpt-table">
          <thead>
            <tr>
              <th>Photo</th><th>Count</th><th>Largest Area</th><th>Total Area</th>
              <th>Confidence</th><th>Severity</th><th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:20px;">No captures recorded</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  // ── 5. Captured Images ────────────────────────────────────────
  _capturedImages(session) {
    const pairs = session.captures.map(c => `
      <div class="rpt-photo-pair">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <strong style="font-size:15px;color:var(--gray-900);">Photo #${c.index}</strong>
          ${this._severityPill(c.severity)}
        </div>
        <div class="rpt-photo-row">
          <div class="rpt-photo-item">
            <div class="rpt-photo-label">Original Image</div>
            <img class="rpt-photo-img" src="${c.originalUrl}" alt="Original capture ${c.index}" loading="lazy"/>
          </div>
          <div class="rpt-photo-item">
            <div class="rpt-photo-label">AI Detection Result</div>
            <img class="rpt-photo-img" src="${c.detectionUrl}" alt="Detection result ${c.index}" loading="lazy"/>
          </div>
        </div>
        <div class="rpt-photo-meta" style="margin-top:10px;">
          <div class="rpt-photo-meta-item">
            <div class="rpt-photo-meta-k">Honeycombs</div>
            <div class="rpt-photo-meta-v">${c.count}</div>
          </div>
          <div class="rpt-photo-meta-item">
            <div class="rpt-photo-meta-k">Largest Area</div>
            <div class="rpt-photo-meta-v">${fmt.formatArea(c.largestArea)}</div>
          </div>
          <div class="rpt-photo-meta-item">
            <div class="rpt-photo-meta-k">Avg. Confidence</div>
            <div class="rpt-photo-meta-v">${fmt.formatPercent(c.averageConfidence)}</div>
          </div>
          <div class="rpt-photo-meta-item">
            <div class="rpt-photo-meta-k">Captured</div>
            <div class="rpt-photo-meta-v" style="font-size:11px;">${fmt.formatDate(c.timestamp)}</div>
          </div>
        </div>
      </div>`).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Captured Images</div>
          <div class="rpt-section-desc">Original and AI-annotated inspection photographs</div>
        </div>
      </div>
      ${pairs || '<p style="color:var(--gray-400);font-size:14px;">No images captured during this inspection.</p>'}
    </div>`;
  }

  // ── 6. Individual Defect Analysis ────────────────────────────
  _defectAnalysis(allDets) {
    if (!allDets.length) return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div><div class="rpt-section-title">Individual Defect Analysis</div></div>
      </div>
      <p style="color:var(--gray-400);font-size:14px;">No defects were detected in this inspection session.</p>
    </div>`;

    const cards = allDets.map((d, i) => {
      const sev = getSeverity(1, d.area);
      const color = getSeverityColor(sev);
      const repair = this._suggestRepair(sev, d.area);
      const position = this._estimatePosition(d);
      return `
      <div class="rpt-defect-card">
        <div class="rpt-defect-header">
          <span class="rpt-defect-title">Defect #${i + 1} — Honeycomb</span>
          ${this._severityPill(sev)}
        </div>
        <div class="rpt-photo-meta-item">
          <div class="rpt-photo-meta-k">Detected Area</div>
          <div class="rpt-photo-meta-v" style="color:${color}">${fmt.formatArea(d.area)}</div>
        </div>
        <div class="rpt-photo-meta-item">
          <div class="rpt-photo-meta-k">AI Confidence</div>
          <div class="rpt-photo-meta-v">${fmt.formatPercent(d.confidence)}</div>
        </div>
        <div class="rpt-photo-meta-item">
          <div class="rpt-photo-meta-k">Est. Position</div>
          <div class="rpt-photo-meta-v" style="font-size:12px;">${position}</div>
        </div>
        <div class="rpt-photo-meta-item">
          <div class="rpt-photo-meta-k">Suggested Repair</div>
          <div class="rpt-photo-meta-v" style="font-size:11px;line-height:1.4;">${repair}</div>
        </div>
      </div>`;
    }).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Individual Defect Analysis</div>
          <div class="rpt-section-desc">${allDets.length} defect${allDets.length !== 1 ? 's' : ''} identified across all captures</div>
        </div>
      </div>
      <div class="rpt-defect-grid">${cards}</div>
    </div>`;
  }

  // ── 7. AI Engineering Assessment ─────────────────────────────
  _engineeringAssessment(session, severity, form) {
    const count = session.totalHoneycombs;
    const struct = form.structType || 'structural element';
    const avgConf = Math.round(session.averageConfidence * 100);

    let text;
    if (count === 0) {
      text = `No honeycomb defects were detected by the AI model during this inspection of the ${struct}. The concrete surface appears to be free of visible surface voids within the inspected area. Field verification is recommended to confirm these findings, as surface coverage may be limited by camera angle and lighting conditions.`;
    } else if (severity === 'LOW') {
      text = `The AI model detected ${count} honeycomb defect${count !== 1 ? 's' : ''} on the ${struct} with an average detection confidence of ${avgConf}%. The defects are classified as LOW severity based on quantity and estimated area. These minor surface imperfections are likely confined to the cover zone and may not significantly compromise structural integrity. However, field verification by a qualified engineer is required before any determination of structural capacity is made.`;
    } else if (severity === 'MODERATE') {
      text = `A total of ${count} honeycomb defect${count !== 1 ? 's' : ''} were identified on the ${struct} with an average AI confidence of ${avgConf}%. The defects are classified as MODERATE severity. This level of surface voiding may indicate inadequate concrete consolidation during placement. The affected areas may expose reinforcement to environmental conditions, increasing the risk of corrosion over time. A detailed physical inspection and cover depth measurement are strongly recommended.`;
    } else if (severity === 'HIGH') {
      text = `The inspection of the ${struct} identified ${count} honeycomb defect${count !== 1 ? 's' : ''} classified as HIGH severity (AI confidence: ${avgConf}%). The extent of surface voiding detected suggests potential deep-seated honeycombing that may compromise the structural cross-section. Immediate investigation by a licensed structural engineer is advised. Core extraction, rebound hammer testing, or GPR scanning may be required to determine the full depth and extent of the defects.`;
    } else {
      text = `CRITICAL severity honeycomb defects (${count} instances, AI confidence: ${avgConf}%) were detected on the ${struct}. The scale and distribution of defects indicate a significant concrete placement or compaction failure. Structural capacity may be severely impaired. Immediate restriction of use, detailed engineering investigation, and likely structural repair or replacement should be considered. This report must be escalated to a licensed structural engineer without delay.`;
    }

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">AI Engineering Assessment</div>
          <div class="rpt-section-desc">AI-generated structural commentary — not a substitute for engineering judgement</div>
        </div>
      </div>
      <div class="rpt-assessment-box">${text}</div>
      <div class="rpt-disclaimer">
        ⚠ <strong>Disclaimer:</strong> This assessment is generated automatically by AI based on visual detection data only. It does not constitute a structural engineering opinion. All findings must be reviewed and verified by a qualified and licensed civil or structural engineer before any decisions affecting structural safety or repair are made.
      </div>
    </div>`;
  }

  // ── 8. Risk Assessment ────────────────────────────────────────
  _riskAssessment(severity) {
    const levels = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
    const levelIdx = levels.indexOf(severity === 'None' ? 'LOW' : severity);
    const pct = severity === 'None' ? 5 : [20, 45, 72, 95][levelIdx];
    const color = getSeverityColor(severity === 'None' ? 'LOW' : severity);

    const reasons = {
      None:     'No defects were detected during this inspection. The surface appears intact. Routine monitoring is still recommended as AI visual detection is limited to visible surface areas.',
      LOW:      'Minor surface honeycombing detected. Defects are limited in number and area. Structural performance is unlikely to be immediately affected, but monitoring and minor repair are recommended.',
      MODERATE: 'Multiple or moderately-sized honeycombs detected. Potential for reinforcement exposure and moisture ingress exists. Repair should be scheduled and structural assessment conducted.',
      HIGH:     'Significant honeycombing detected across multiple locations. Risk of reduced structural section, reinforcement exposure, and long-term durability loss is elevated. Prompt engineering investigation required.',
      CRITICAL: 'Extensive and/or large-area honeycombs detected indicating major concrete placement failure. Immediate risk to structural integrity is possible. Load restrictions and urgent structural investigation are mandatory.',
    };

    const indicators = levels.map((l, i) => `
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <div style="width:100%;height:8px;border-radius:4px;background:${i <= levelIdx && severity !== 'None' ? getSeverityColor(l) : 'var(--gray-200)'};"></div>
        <span style="font-size:10px;font-weight:600;color:${i === levelIdx && severity !== 'None' ? getSeverityColor(l) : 'var(--gray-400)'};">${l}</span>
      </div>`).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Risk Assessment</div>
          <div class="rpt-section-desc">Structural risk level based on detected defects</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
        ${indicators}
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <span style="font-size:28px;font-weight:800;color:${color};">${severity === 'None' ? 'MINIMAL' : severity}</span>
        <span style="font-size:13px;color:var(--gray-500);">Risk Level</span>
      </div>
      <p style="font-size:14px;color:var(--gray-700);line-height:1.7;">${reasons[severity] || reasons.None}</p>
    </div>`;
  }

  // ── 9. Repair Recommendation ──────────────────────────────────
  _repairRecommendation(severity) {
    const repairMap = {
      None:     { method: 'Monitoring Only', desc: 'No immediate repair is required. Schedule periodic visual inspections every 6 months. Document and photograph the inspected surfaces for baseline comparison.' },
      LOW:      { method: 'Surface Patch Repair', desc: 'Apply surface patch repair to affected areas using compatible repair mortar. Clean and prepare the surface per repair material manufacturer specifications. Monitor repaired areas during subsequent inspections.' },
      MODERATE: { method: 'Epoxy Injection + Surface Patch', desc: 'Perform epoxy injection for any voids with depth, followed by surface patch repair. Structural assessment should be conducted to confirm that the repair restores required section capacity.' },
      HIGH:     { method: 'Full Structural Repair', desc: 'Full removal of defective concrete, reinstatement of concrete section, and possible section enlargement may be required. A licensed structural engineer must design the repair scheme.' },
      CRITICAL: { method: 'Immediate Engineering Intervention', desc: 'Halt loading or use of affected structure pending full engineering investigation. Repair scheme must be designed by a licensed structural engineer. Possible partial or full replacement of affected element.' },
    };

    const rec = repairMap[severity] || repairMap.None;
    const materials = [
      { name: 'Non-shrink Repair Mortar', use: 'Primary repair fill material' },
      { name: 'Epoxy Bonding Agent', use: 'Interface bonding to parent concrete' },
      { name: 'Polymer-modified Mortar', use: 'Surface finish and topping' },
      { name: 'Curing Compound', use: 'Moisture retention during cure' },
    ];

    const matCards = materials.map(m => `
      <div class="rpt-repair-item">
        <div class="rpt-repair-dot"></div>
        <div><strong>${m.name}</strong><br><span style="font-size:12px;color:var(--gray-400);">${m.use}</span></div>
      </div>`).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Repair Recommendation</div>
          <div class="rpt-section-desc">General guidance based on detected severity — not project-specific engineering approval</div>
        </div>
      </div>
      <div style="background:var(--blue-50);border-radius:var(--r-lg);padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:var(--blue-600);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">Recommended Method</div>
        <div style="font-size:17px;font-weight:700;color:var(--gray-900);margin-bottom:8px;">${rec.method}</div>
        <div style="font-size:13px;color:var(--gray-600);line-height:1.7;">${rec.desc}</div>
      </div>
      <div style="margin-top:4px;">
        <div style="font-size:12px;font-weight:700;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;">Recommended Materials</div>
        <div class="rpt-defect-grid">${matCards}</div>
      </div>
      <div class="rpt-disclaimer" style="margin-top:16px;">
        These repair recommendations are general guidance only and are presented for preliminary assessment purposes. They must not be used as project-specific repair specifications without review and approval by a qualified engineer.
      </div>
    </div>`;
  }

  // ── 10. General Repair Method Statement ──────────────────────
  _repairMethodStatement() {
    const steps = [
      { n: 1, title: 'Inspection & Marking', desc: 'Identify and clearly mark all honeycomb defect boundaries. Photograph and document each area.' },
      { n: 2, title: 'Demarcation', desc: 'Saw-cut the perimeter of the repair area to a minimum depth of 20 mm to create a square or rectangular boundary.' },
      { n: 3, title: 'Remove Loose Concrete', desc: 'Mechanically remove all loose, contaminated, or defective concrete using chisels, needle guns, or hydro-demolition.' },
      { n: 4, title: 'Surface Cleaning', desc: 'Clean the repair surface using compressed air, water jet, or wire brushing to remove dust, oil, and carbonation laitance.' },
      { n: 5, title: 'Apply Bonding Agent', desc: 'Apply an approved epoxy or cementitious bonding agent to the prepared substrate and allow to become tacky per manufacturer instructions.' },
      { n: 6, title: 'Apply Repair Mortar', desc: 'Place and compact repair mortar in layers not exceeding the specified thickness. Ensure full contact with the bonded substrate.' },
      { n: 7, title: 'Finish Surface', desc: 'Finish the repaired surface to match the surrounding profile. Allow sufficient setting time before any loading.' },
      { n: 8, title: 'Curing', desc: 'Apply curing compound or wet burlap immediately after surface finishing. Maintain curing for a minimum of 7 days.' },
    ];

    const stepEls = steps.map((s, i) => `
      ${i > 0 ? '<div class="rpt-workflow-arrow">→</div>' : ''}
      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;max-width:90px;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--blue-600);color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;">${s.n}</div>
        <div style="font-size:11px;font-weight:600;color:var(--gray-700);">${s.title}</div>
      </div>`).join('');

    const stepDetails = steps.map(s => `
      <div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--gray-100);">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--blue-50);color:var(--blue-600);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${s.n}</div>
        <div>
          <div style="font-size:14px;font-weight:700;color:var(--gray-800);margin-bottom:3px;">${s.title}</div>
          <div style="font-size:13px;color:var(--gray-600);line-height:1.6;">${s.desc}</div>
        </div>
      </div>`).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">General Repair Method Statement</div>
          <div class="rpt-section-desc">Standard procedure for honeycomb concrete repair</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:var(--gray-50);border-radius:var(--r-lg);padding:20px;margin-bottom:20px;overflow-x:auto;">
        ${stepEls}
      </div>
      <div>${stepDetails}</div>
    </div>`;
  }

  // ── 11. Inspector Verification ────────────────────────────────
  _inspectorVerification(form, sessionId, dateStr) {
    const initials = (form.inspector || 'IN')
      .split(' ').slice(0,2).map(n => n[0]?.toUpperCase() || '').join('');

    // Simple QR-code-like placeholder (actual QR would need a library)
    const qrGrid = Array.from({length: 7}, () =>
      Array.from({length: 7}, () => Math.random() > 0.5 ? '1' : '0').join('')
    ).join('');

    return `
    <div class="rpt-page">
      <div class="rpt-section-header">
        <div class="rpt-section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div>
          <div class="rpt-section-title">Inspector Verification</div>
          <div class="rpt-section-desc">Inspection sign-off and document authentication</div>
        </div>
      </div>
      <div class="rpt-qr-section">
        <div>
          <table class="rpt-info-table" style="min-width:280px;">
            <tbody>
              ${this._infoRow('Inspector', form.inspector || '—')}
              ${this._infoRow('Organisation', form.company || '—')}
              ${this._infoRow('Inspection ID', `<span style="font-family:var(--font-mono);font-size:12px;">${sessionId}</span>`)}
              ${this._infoRow('Date', dateStr)}
            </tbody>
          </table>
          <div class="rpt-sig-line"></div>
          <div class="rpt-sig-label">Authorised Signature</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div class="rpt-qr-placeholder" style="width:90px;height:90px;font-size:9px;display:grid;grid-template-columns:repeat(7,1fr);gap:1px;padding:6px;">
            ${Array.from({length: 49}, (_, i) => `<div style="background:${(i%3===0||i%7===0)?'#111':'transparent'};border-radius:1px;"></div>`).join('')}
          </div>
          <div style="font-size:10px;color:var(--gray-400);text-align:center;">Document ID<br><span style="font-family:var(--font-mono);">${sessionId.slice(-8)}</span></div>
        </div>
      </div>
    </div>`;
  }

  // ── 12. Footer ────────────────────────────────────────────────
  _footer(sessionId, dateStr, timeStr) {
    return `
    <div class="rpt-footer">
      <div>
        <div class="rpt-footer-brand">AI Honeycomb Inspector Professional</div>
        <div class="rpt-footer-text">Construction Intelligence Laboratory (CI-Lab) · Version 5 Professional</div>
      </div>
      <div style="text-align:right;">
        <div class="rpt-footer-text">Generated: ${dateStr} ${timeStr}</div>
        <div class="rpt-footer-text" style="font-family:var(--font-mono);font-size:10px;">${sessionId}</div>
      </div>
    </div>`;
  }

  // ── Helpers ───────────────────────────────────────────────────
  _infoRow(label, value) {
    return `<tr><td class="rpt-info-td-label">${label}</td><td class="rpt-info-td-value">${value}</td></tr>`;
  }

  _severityPill(sev) {
    const map = {
      None:     'pill-blue',
      LOW:      'pill-green',
      MODERATE: 'pill-amber',
      HIGH:     'pill-orange',
      CRITICAL: 'pill-red',
    };
    const cls = map[sev] || 'pill-blue';
    const dot = `<span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>`;
    return `<span class="rpt-status-pill ${cls}">${dot} ${sev === 'None' ? 'No Defects' : sev}</span>`;
  }

  _severityLightColor(sev) {
    return { LOW:'#86EFAC', MODERATE:'#FDE68A', HIGH:'#FDBA74', CRITICAL:'#FCA5A5', None:'#BAE6FD' }[sev] || '#BAE6FD';
  }

  _suggestRepair(sev, area) {
    if (sev === 'LOW')      return 'Surface patch with repair mortar';
    if (sev === 'MODERATE') return 'Epoxy injection + patch repair';
    if (sev === 'HIGH')     return 'Full concrete section repair';
    if (sev === 'CRITICAL') return 'Immediate engineering investigation';
    return 'Monitoring only';
  }

  _estimatePosition(det) {
    if (!det.x1 && !det.y1) return 'Unknown';
    const cx = (det.x1 + det.x2) / 2;
    const cy = (det.y1 + det.y2) / 2;
    const hPos = cx < 400 ? 'Left' : cx < 800 ? 'Centre' : 'Right';
    const vPos = cy < 300 ? 'Upper' : cy < 500 ? 'Mid' : 'Lower';
    return `${vPos}-${hPos}`;
  }
}
