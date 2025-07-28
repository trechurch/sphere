// managers/colorPickerManager.js

export function initColorPickerManager(settings) {
  setupUIPaletteBindings(settings);
  setupOpticsBindings(settings);
}

// 🎨 Interface styling bindings
function setupUIPaletteBindings(settings) {
  const uiFields = {
    uiBorderColor: "--border-color",
    uiPanelColor: "--panel-bg",
    uiBackgroundColor: "--control-bg",
    uiTextColor: "--text-color",
    uiHighlightColor: "--highlight-color"
  };

  for (const [key, cssVar] of Object.entries(uiFields)) {
    const input = document.getElementById(key);
    if (input) {
      input.value = settings[key];
      input.oninput = (e) => {
        const val = e.target.value;
        settings[key] = val;
        document.documentElement.style.setProperty(cssVar, val);
      };
    }
  }
}

// 🔭 Scene optics bindings
function setupOpticsBindings(settings) {
  const opticsFields = {
    wireOuterColor: updateWireOuter,
    wireInnerColor: updateWireInner,
    capColor: updateCapMaterial,
    tierColor: updateTierMaterial
  };

  for (const [key, updater] of Object.entries(opticsFields)) {
    const input = document.getElementById(key);
    if (input) {
      input.value = settings[key];
      input.oninput = (e) => {
        const val = e.target.value;
        settings[key] = val;
        updater(val);
      };
    }
  }

  // Texture loaders
  document.getElementById("loadEarthTexture").onclick = () => loadTexture("earth", settings);
  document.getElementById("loadMoonTexture").onclick = () => loadTexture("moon", settings);
  document.getElementById("loadStarfield").onclick = () => loadTexture("stars", settings);
  document.getElementById("loadCloudLayer").onclick = () => loadTexture("clouds", settings);
}