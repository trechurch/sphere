// modules/uiControls.js
import * as dat from 'dat.gui';

export function initDatGUI(settings, scene, camera, controls) {
  const gui = new dat.GUI();
  gui.add(settings, 'enableDebugLogging').name('Debug Logs');
  // Add more as needed
}

export function initHtmlUI(settings) {
  document.getElementById('resetView').addEventListener('click', () => {
    settings.resetCamera = true;
  });
}

export function bindColorPanel(settings) {
  // Hook up color inputs (cap, tier, lines, etc.)
}

export function bindAdvancedPanel(settings) {
  // Attach advanced deployment settings (rotation, layering, etc.)
}

export function bindOpticsPanel(settings) {
  // Optics, lighting, or visibility toggles
}

export function syncWithSettings(settings) {
  // Read settings object and update GUI + HTML
}