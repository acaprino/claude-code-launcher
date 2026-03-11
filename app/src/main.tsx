import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Global handlers to prevent a single unhandled error from destabilizing the app.
// These catch errors that escape ErrorBoundaries (async errors, event handlers, etc.).
window.addEventListener("unhandledrejection", (e) => {
  console.error("[unhandled rejection]", e.reason);
  // Do not call e.preventDefault() — suppressing the default would hide real bugs
  // (e.g., unexpected Tauri IPC rejections) with no visible trace in production.
});

window.addEventListener("error", (e) => {
  console.error("[uncaught error]", e.error ?? e.message);
  // Don't preventDefault here — let React error boundaries handle render errors.
  // This only catches truly global errors that escape all boundaries.
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
