/**
 * InspectionSession — Manages state for one inspection session
 * AI Honeycomb Inspector v5 Professional
 */

import { getSeverity } from './Renderer.js';

let sessionCounter = 0;

export class InspectionSession {
  constructor() {
    this.id = this._generateId();
    this.startTime = Date.now();
    this.captures = [];       // Array of CaptureRecord
    this.lastDetections = []; // Live detections (not stored)
  }

  _generateId() {
    const d = new Date();
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    sessionCounter++;
    return `HCI-${yr}${mo}${dy}-${String(sessionCounter).padStart(4, '0')}`;
  }

  get elapsedSeconds() {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  get captureCount() {
    return this.captures.length;
  }

  get totalHoneycombs() {
    return this.captures.reduce((s, c) => s + c.count, 0);
  }

  get largestArea() {
    return this.captures.reduce((max, c) => Math.max(max, c.largestArea), 0);
  }

  get totalArea() {
    return this.captures.reduce((s, c) => s + c.totalArea, 0);
  }

  get averageConfidence() {
    const all = this.captures.flatMap(c => c.detections.map(d => d.confidence));
    if (!all.length) return 0;
    return all.reduce((s, v) => s + v, 0) / all.length;
  }

  get overallSeverity() {
    return getSeverity(this.totalHoneycombs, this.largestArea);
  }

  /**
   * Add a captured frame.
   * @param {string} originalUrl   - JPEG dataURL of raw frame
   * @param {string} detectionUrl  - JPEG dataURL with drawn detections
   * @param {Array}  detections    - array of detection objects (frozen)
   */
  addCapture(originalUrl, detectionUrl, detections) {
    const dets = detections.map(d => ({ ...d })); // deep copy
    const areas = dets.map(d => d.area);
    const record = {
      index: this.captures.length + 1,
      sessionId: this.id,
      timestamp: Date.now(),
      originalUrl,
      detectionUrl,
      detections: dets,
      count: dets.length,
      largestArea: areas.length ? Math.max(...areas) : 0,
      totalArea: areas.reduce((s, a) => s + a, 0),
      averageConfidence: dets.length
        ? dets.reduce((s, d) => s + d.confidence, 0) / dets.length
        : 0,
      severity: getSeverity(dets.length, areas.length ? Math.max(...areas) : 0),
    };
    this.captures.push(record);
    return record;
  }

  reset() {
    this.id = this._generateId();
    this.startTime = Date.now();
    this.captures = [];
    this.lastDetections = [];
  }

  /** Serialize for history storage (strip large dataURLs from history metadata) */
  toHistoryRecord(formData) {
    return {
      id: this.id,
      date: new Date().toISOString(),
      project: formData.project || 'Unnamed Project',
      inspector: formData.inspector || '—',
      captures: this.captureCount,
      totalHoneycombs: this.totalHoneycombs,
      severity: this.overallSeverity,
      duration: this.elapsedSeconds,
      thumbnailUrl: this.captures[0]?.detectionUrl?.slice(0, 200) ?? '',
    };
  }
}
