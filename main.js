// main.js

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import {
  loadTextureConfig,
  loadTextures,
  showTextureSelectorUI,
  saveTextureConfig
} from './modules/textureManager.js';

import {
  initScene,
  initEarthGroup,
  initMoon,
  initOrbitControls
} from './modules/sceneSetup.js';

import {
  initDatGUI,
  initHtmlUI,
  bindColorPanel,
  bindAdvancedPanel,
  bindOpticsPanel,
  syncWithSettings
} from './modules/uiControls.js';

import {
  renderHtmlCapsUI,
  updateCapSelectDropdown,
  updateAndFocus,
  focusCameraOnCap
} from './modules/capUI.js';

import {
  createSphericalCap,
  getStackedHeight
} from './managers/capPlacementManager.js';

import {
  saveSettingsToFile,
  loadSettingsFromFile
} from './modules/fileManager.js';

let settings = {};       // populate from config if available
let capArray = [];       // your deployed caps live here
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
  const cap = { id: Date.now(), mesh: null };
  createSphericalCap(cap, {
    radius: 5,
    sizeScalers: { width: 1, height: 1 },
    deploymentType: 'standard',
    directionColors: {},
    tierSettings: {},
    xyScalers: {},
    getStackedHeight,
    earthGroup,
    debug: settings.enableDebugLogging
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