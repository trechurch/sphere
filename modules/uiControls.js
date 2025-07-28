// modules/uiControls.js// === DOM Element References ===
// const resetCameraBtn = document.getElementById('reset-camera-btn');
// const resetViewBtn = document.getElementById('reset-view');
// // Add more UI elements here as needed// === Event Bindings ===
// if (resetCameraBtn) {  
// resetCameraBtn.addEventListener('click', () => {    
// settings.resetCamera = true;  });}if (resetViewBtn) {  
// resetViewBtn.addEventListener('click', () => {    
// settings.resetCamera = true;  });}
// export function updateUIControls(data) {  
// // Sync logic}export function initDatGUI(settings, scene, camera, controls) {  
// const gui = new dat.GUI();  
// gui.add(settings, 
// "enableDebugLogging").name("Debug Logs");  
// // 🌍 Earth controls  const earthFolder = gui.addFolder("Earth");  
// earthFolder    
// .addColor(settings, "backgroundColor")    
// .name("Background")    .onChange((val) => (scene.background = new THREE.Color(val)));  
// earthFolder    
// .add(settings, "rotateSphere")    
// .name("Rotate Earth")    
// .onChange((v) => (settings.rotateSphere = v));  
// // 🧠 Cap controls  const capFolder = gui.addFolder("Cap Behavior");  
// capFolder    .add(settings, "pickCap")    
// .name("Pick Cap")    
// .onChange((v) => (settings.pickCap = v));  
// capFolder.add(settings, "selectedCapIndex", 0, 10)
// .step(1).name("Cap Index");  
// // 🔍 Camera controls  const cameraFolder = gui.addFolder("Camera");  
// cameraFolder    .add(settings, "useOrthographic")    
// .name("Use Orthographic")    
// .onChange(() => settings.toggleCamera());  
// cameraFolder.add(settings, "resetCamera").name("Reset");  
// // 🧪 Debug controls  const debugFolder = gui.addFolder("Debug");  
// debugFolder.add(settings, "enableDebugLogging").name("Debug Logs");  
// gui.close(); // collapsed by default}export function initHtmlUI(settings) {  
// document.getElementById("resetView").addEventListener("click", () => {    
// settings.resetCamera = true;  });}export function bindColorPanel(settings) {  
// // Hook up color inputs (cap, tier, lines, etc.)}export function bindAdvancedPanel(settings) 
// {  // Attach advanced deployment settings (rotation, layering, etc.)}export function bindOpticsPanel(settings) {
// Optics, lighting, or visibility toggles
//export function syncWithSettings(settings) {
// Read settings object and update GUI + HTML
// modules/uiControls.js
// === DOM Element References ===

const resetCameraBtn = document.getElementById('reset-camera-btn');

const resetViewBtn = document.getElementById('reset-view');

// Add more UI elements here as needed

// === Event Bindings ===

if (resetCameraBtn) {

resetCameraBtn.addEventListener('click', () => {

settings.resetCamera = true;

});

} else {   console.error('resetCameraBtn is null. Check the DOM structure.'); }

if (resetViewBtn) {

resetViewBtn.addEventListener('click', () => {

settings.resetCamera = true;

});

} else {   console.error('resetViewBtn is null. Check the DOM structure.'); }

export function updateUIControls(data) {

// Sync logic

}

export function initDatGUI(settings, scene, camera, controls) {

const gui = new dat.GUI();

gui.add(settings, "enableDebugLogging").name("Debug Logs");

// 🌍 Earth controls

const earthFolder = gui.addFolder("Earth");

earthFolder

.addColor(settings, "backgroundColor")

.name("Background")

.onChange((val) => (scene.background = new THREE.Color(val)));

earthFolder

.add(settings, "rotateSphere")

.name("Rotate Earth")

.onChange((v) => (settings.rotateSphere = v));

// 🧠 Cap controls

const capFolder = gui.addFolder("Cap Behavior");

capFolder

.add(settings, "pickCap")

.name("Pick Cap")

.onChange((v) => (settings.pickCap = v));

capFolder.add(settings, "selectedCapIndex", 0, 10).step(1).name("Cap Index");

// 🔍 Camera controls

const cameraFolder = gui.addFolder("Camera");

cameraFolder

.add(settings, "useOrthographic")

.name("Use Orthographic")

.onChange(() => settings.toggleCamera());

cameraFolder.add(settings, "resetCamera").name("Reset");

// 🧪 Debug controls

const debugFolder = gui.addFolder("Debug");

debugFolder.add(settings, "enableDebugLogging").name("Debug Logs");

gui.close(); // collapsed by default

}

export function initHtmlUI(settings) {

const resetView = document.getElementById("resetView");

if (resetView) {     resetView.addEventListener("click", () => {

settings.resetCamera = true;

});

} else {     console.error('resetView is null. Check the DOM structure.');   }

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