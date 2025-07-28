// main.js

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  loadTextureConfig,
  loadTextures,
  showTextureSelectorUI,
  saveTextureConfig,
} from "./managers/textureManager.js";

import {
  initScene,
  initEarthGroup,
  initMoon,
  initOrbitControls,
} from "./modules/sceneSetup.js";

import {
  initDatGUI,
  initHtmlUI,
  bindColorPanel,
  bindAdvancedPanel,
  bindOpticsPanel,
  syncWithSettings,
} from "./modules/uiControls.js";

import {
  renderHtmlCapsUI,
  updateCapSelectDropdown,
  updateAndFocus,
  focusCameraOnCap,
} from "./modules/capUi.js";

import {
  createSphericalCap,
  getStackedHeight,
} from "./managers/capPlacementManager.js";

import {
  saveSettingsToFile,
  loadSettingsFromFile,
} from "./managers/fileManager.js";

let settings = {
  enableDebugLogging: false,
  rotateSphere: false,
  pickCap: false,
  selectedCapIndex: 0,
  useOrthographic: false,
  resetCamera: false,
    backgroundColor: '#000000',
  // ...any other required flags
};
// populate from config if available
let capArray = []; // your deployed caps live here
let texturePaths = loadTextureConfig();
let textures = await loadTextures(texturePaths);

if (!textures || textures.useDefaults) {
  showTextureSelectorUI(async (selectedPaths) => {
    saveTextureConfig(selectedPaths);
    textures = await loadTextures(selectedPaths);
    bootApp(textures);
  });
} else {
  bootApp(textures);
}

function bootApp(textures) {
  const { scene, camera, renderer } = initScene();
  const controls = initOrbitControls(camera, renderer);
  const earthGroup = initEarthGroup(textures);
  const moon = initMoon(textures);

  scene.add(earthGroup, moon);

  initDatGUI(settings, scene, camera, controls);
  initHtmlUI(settings);
  bindColorPanel(settings);
  bindAdvancedPanel(settings);
  bindOpticsPanel(settings);
  syncWithSettings(settings);

  // Initial cap rendering and UI population
  renderHtmlCapsUI(capArray, settings);
  updateCapSelectDropdown(capArray);

  // Example: Deploy a new cap
  const cap = {
    id: Date.now(),
    mesh: null,
    size: 1, // ← Required by sizeScalers["scaleKey"]
    sizeScaler: "size", // ← Matches sizeScalers["size"]
    x: 0,
    y: 0,
    h: 1,
    z: 0, // ← Positioning keys for stacking
    hScaler: "alt", // ← Matches xyScalers["alt"]
    direction: "north", // ← Optional: affects color
    tierLevel: 0, // ← Needed for multi-tier spacing
  };
  const directionColors = { north: 0x00ff00 };
  const tierSettings = {
    multiTierLevels: 3,
    multiTierSpacing: 0.5,
    singleBandIntensity: 80,
  };
  const sizeScalers = { size: 1 };
  const xyScalers = { alt: 1 };

createSphericalCap(cap, {
  radius: 5,
  sizeScalers,
  deploymentType: 'multi-tier',
  directionColors,
  tierSettings,
  xyScalers,
  getStackedHeight,
  earthGroup,
  debug: settings.enableDebugLogging,
});

  capArray.push(cap);
  renderHtmlCapsUI(capArray, settings);

  animate();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
}
