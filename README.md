# AI Honeycomb Inspector v5 Professional
**Construction Intelligence Laboratory (CI-Lab)**

## Project Structure

```
honeycomb/
├── index.html              — Main entry point (single HTML shell)
├── css/
│   └── main.css            — Complete design system & all component styles
├── js/
│   ├── app.js              — Application bootstrap & orchestrator
│   └── modules/
│       ├── AIDetector.js          — YOLOv8 ONNX inference (preprocess → detect → NMS)
│       ├── CameraModule.js        — getUserMedia lifecycle
│       ├── Renderer.js            — Canvas overlay drawing + capture rendering
│       ├── InspectionSession.js   — Session state (captures, statistics)
│       ├── InspectionController.js— rAF detection loop, toolbar, capture logic
│       ├── ReportGenerator.js     — Full engineering report HTML builder
│       ├── HistoryController.js   — History screen render
│       ├── UIController.js        — Screen navigation, toasts, loading overlay
│       └── StorageManager.js      — localStorage persistence
└── Model/
    └── best.onnx           — YOLOv8 ONNX model (DO NOT MODIFY)
```

## Serving

Serve from a local web server (required for ES modules and WASM):

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .

# VS Code: Live Server extension
```

Then open: http://localhost:8080

## Key Architecture Decisions

- **AI pauses while Report Form is open** — no wasted inference cycles
- **Report generates once**, only when "Generate Report" is clicked
- **Captures are immutable** — stored data never changes after capture
- **Modular ES6 modules** — each concern is isolated
- **No framework dependencies** — vanilla JS, ONNX Runtime Web, jsPDF, html2canvas
