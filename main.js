import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Note: dat.gui is loaded via <script> in index.html, using global dat.GUI
// Future Modularization Plan:
// - sceneSetup.js: Scene, camera, renderer, Earth, stars, moon, lighting
// - capManagement.js: Cap creation, stacking, merging, coordinate conversions
// - uiControls.js: GUI, HTML UI, pop-up console
// - main.js: Import and orchestrate modules

// Initialize core components
const scene = new THREE.Scene();
console.log("🚀 main.js loaded");
window.addEventListener("DOMContentLoaded", () => {
  scene.background = new THREE.Color(0x000000); // Default background color
});
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lights early to ensure Earth renders
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
scene.add(hemisphereLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000);
scene.add(sunLight);

// Raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Camera helper for debugging
const cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);

// Texture loader with error handling
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("");

// Texture file path variables
let earthMapPath = './textures/dLHeJw.jpg';
let earthBumpMapPath = './textures/earthbump.jpg';
let earthCloudPath = './textures/earthCloud.png';
let moonMapPath = './textures/moonmap.jpg'; // Default moon texture
let moonBumpMapPath = './textures/moonbump.jpg'; // Default moon bump map
let starMapPath = './textures/starmap.jpg'; // Default star map

// Earth setup with debug logs
const sphereRadius = 6371;
const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
const earthTexture = textureLoader.load(earthMapPath, () => console.log('Earth texture loaded'), undefined, (err) => console.error('Earth texture failed:', err));
const earthBumpMap = textureLoader.load(earthBumpMapPath, () => console.log('Earth bump map loaded'), undefined, (err) => console.error('Earth bump map failed:', err));
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthTexture,
  bumpMap: earthBumpMap,
  bumpScale: 0.05,
  color: 0x0000ff,
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.set(0, 0, 0);
scene.add(earthMesh);

// Cloud layer
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64);
const cloudTexture = textureLoader.load(earthCloudPath);
const cloudMaterial = new THREE.MeshPhongMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
});
const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);

// Earth group
const earthGroup = new THREE.Group();
earthGroup.add(earthMesh, cloudMesh);
scene.add(earthGroup);

// Wireframe Moon setup
const moonGeometry = new THREE.SphereGeometry(1737, 32, 32); // Moon radius ~1737 km
const moonMaterial = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(384400, 0, 0); // Approx. Earth-Moon distance
scene.add(moon);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 🌍 Coordinates
function latLonToXY(lat, lon) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const x = sphereRadius * Math.cos(latRad) * Math.sin(lonRad);
  const y = sphereRadius * Math.sin(latRad);
  const z = sphereRadius * Math.cos(latRad) * Math.cos(lonRad);
  return { x, y, z };
}

function xyToLatLon(x, y) {
  const r = Math.sqrt(x * x + y * y);
  const lat = Math.asin(y / sphereRadius) * (180 / Math.PI);
  const lon = Math.atan2(x, r * Math.cos(Math.asin(y / sphereRadius))) * (180 / Math.PI);
  return { lat, lon };
}

// 🧠 Cap data
const houstonCoords = latLonToXY(29.76, -95.36);
let capArray = JSON.parse(localStorage.getItem("capArray")) || [
  {
    x: houstonCoords.x,
    y: houstonCoords.y,
    z: houstonCoords.z,
    h: 0,
    size: 2,
    direction: "NW",
    xScaler: 4,
    yScaler: 4,
    hScaler: 0,
    sizeScaler: 2,
    mesh: null,
  },
];
let primaryCapIndex = 0;
let secondaryCapIndex = 0;
let deploymentType = "single-band";

const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.05, 0.1, 0.2, 0.5, 1];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
  N: 0xff0000,
  NE: 0xffa500,
  E: 0xffff00,
  SE: 0x00ff00,
  S: 0x00ffff,
  SW: 0x0000ff,
  W: 0x800080,
  NW: 0xff00ff,
};
const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { Tiny: 0, Small: 1, Medium: 2, Large: 3, Huge: 4 };
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
controls.maxDistance = (16 * sphereRadius) / Math.tan((camera.fov * (Math.PI / 180)) / 2);
controls.rotateSpeed = 0.5;
controls.enablePan = true;
controls.enableZoom = true;
let resolution = 5;

// City key
const cityKey = [
  { name: "Houston, TX", lat: 29.76, lon: -95.36 },
  { name: "New York, NY", lat: 40.71, lon: -74.01 },
  { name: "London, UK", lat: 51.51, lon: -0.13 },
  { name: "Tokyo, JP", lat: 35.68, lon: 139.76 },
  { name: "Sydney, AU", lat: -33.87, lon: 151.21 },
];

// Settings
const settings = {
  backgroundColor: "#000000",
  rotateSphere: true,
  preserveTarget: false,
  pickCap: false,
  selectedCapIndex: 0,
  useOrthographic: false,
  enableValidation: true,
  enableDebugLogging: true,
  rotateSpeed: 0.5,
  dampingFactor: 0.05,
  zoomSpeed: 1.0,
  resetCamera: () => resetCameraToDefault(),
  toggleUI: () => toggleControlPanel(),
  toggleCamera: () => {
    settings.useOrthographic = !settings.useOrthographic;
    updateCamera();
  },
  toggleAdvancedControls: () => toggleAdvancedControls(),
  panelBgColor: "#ffffff",
  panelTextColor: "#000000",
  panelBorderColor: "#000000",
  buttonBgColor: "#ffffff",
};

// Default settings for tiered deployments
const tierSettings = {
  singleBandIntensity: 50,
  singleTierHeight: 50,
  singleTierDensity: 5,
  multiTierLevels: 3,
  multiTierSpacing: 50,
};

// Cap stacking and merging
function getStackedHeight(x, y, z) {
  const existingCaps = capArray.filter(
    (cap) =>
      Math.abs(cap.x - x) < 1e-3 &&
      Math.abs(cap.y - y) < 1e-3 &&
      Math.abs(cap.z - z) < 1e-3
  );
  return (
    existingCaps.length *
    10 *
    (deploymentType === "single-tier"
      ? tierSettings.singleTierHeight / 50
      : 1)
  );
}

function checkAndMergeCaps(newCap) {
  if (settings.enableDebugLogging)
    console.log("Checking merge for cap:", newCap);
  const mergeThreshold =
    deploymentType === "single-tier"
      ? 500 * tierSettings.singleTierDensity
      : 500;
  const mergeableCaps = capArray.filter(
    (cap) =>
      cap !== newCap &&
      cap.h === newCap.h &&
      Math.abs(cap.x - newCap.x) <
        mergeThreshold * cap.size * sizeScalers[cap.sizeScaler]
  );
  if (mergeableCaps.length > 0) {
    const mergedSize = Math.max(
      newCap.size,
      ...mergeableCaps.map((cap) => cap.size)
    );
    newCap.size = mergedSize * 1.1;
    mergeableCaps.forEach((cap) => {
      if (cap.mesh) earthGroup.remove(cap.mesh);
      capArray.splice(capArray.indexOf(cap), 1);
      if (settings.enableDebugLogging) console.log("Merged cap:", cap);
    });
  }
}

function createCap(cap) {
  if (settings.enableDebugLogging) console.log("Creating cap:", cap);
  if (cap.mesh) earthGroup.remove(cap.mesh);
  const { lat, lon } = xyToLatLon(
    cap.x * xyScalers[cap.xScaler],
    cap.y * xyScalers[cap.yScaler]
  );
  const positionVector = new THREE.Vector3(
    ...Object.values(latLonToXY(lat, lon))
  ).normalize();
  let scaledHeight =
    cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
  if (deploymentType === "multi-tier") {
    scaledHeight += tierSettings.multiTierSpacing * (cap.tierLevel || 0);
  }
  const upVector = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    upVector,
    positionVector
  );
  const capMesh = new THREE.Group();
  capMesh.position.copy(
    positionVector.multiplyScalar(sphereRadius + scaledHeight)
  );
  const capSize =
    deploymentType === "multi-tier"
      ? cap.size * (tierSettings.multiTierLevels / 3)
      : cap.size;
  const capGeo = new THREE.SphereGeometry(
    500 * capSize * sizeScalers[cap.sizeScaler],
    32,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2
  );
  const capMat = new THREE.MeshBasicMaterial({
    color: directionColors[cap.direction] || 0xff0000,
    transparent: true,
    opacity:
      deploymentType === "single-band"
        ? tierSettings.singleBandIntensity / 100
        : 0.9,
    side: THREE.DoubleSide,
  });
  const capMeshMain = new THREE.Mesh(capGeo, capMat);
  const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
  const directionGeo = new THREE.SphereGeometry(
    500 * capSize * sizeScalers[cap.sizeScaler],
    32,
    16,
    directionAngle - Math.PI / 8,
    Math.PI / 4,
    0,
    Math.PI / 2
  );
  const directionMat = new THREE.MeshBasicMaterial({
    color: directionColors[cap.direction] || 0xff0000,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const directionMesh = new THREE.Mesh(directionGeo, directionMat);
  capMesh.add(capMeshMain, directionMesh);
  capMesh.quaternion.copy(quaternion);
  capMesh.userData = {
    size: capSize * sizeScalers[cap.sizeScaler],
    originalPosition: { x: cap.x, y: cap.y, h: cap.h, z: cap.z },
  };
  cap.mesh = capMesh;
  earthGroup.add(capMesh);
  checkAndMergeCaps(cap);
}

function focusCameraOnCap(cap) {
  if (!cap.mesh) return;
  const capPosition = new THREE.Vector3();
  cap.mesh.getWorldPosition(capPosition);
  const camDistance = sphereRadius * 2;
  const cameraPosition = capPosition
    .clone()
    .normalize()
    .multiplyScalar(sphereRadius + camDistance);
  camera.position.copy(cameraPosition);
  if (!settings.preserveTarget) controls.target.copy(capPosition);
  controls.update();
}

function updateAndFocus(cap) {
  createCap(cap);
  focusCameraOnCap(cap);
}

function updateCameraControls() {
  const speed = 10 / resolution;
  document.querySelectorAll(".cam-arrows button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.id.replace("strafe-", "").replace("-", "");
      const x =
        {
          up: 0,
          down: 0,
          left: -1,
          right: 1,
          "up-left": -1,
          "up-right": 1,
          "down-left": -1,
          "down-right": 1,
        }[dir] || 0;
      const y =
        {
          up: 1,
          down: -1,
          left: 0,
          right: 0,
          "up-left": 1,
          "up-right": 1,
          "down-left": -1,
          "down-right": -1,
        }[dir] || 0;
      camera.position.x += x * speed;
      camera.position.y += y * speed;
      controls.target.x += x * speed;
      controls.target.y += y * speed;
      controls.update();
    });
  });
  ["macro", "micro", "basic"].forEach((type) => {
    document.getElementById(`${type}-zoom`).addEventListener("input", (e) => {
      const zoom = parseInt(e.target.value) / 50;
      camera.position.multiplyScalar(zoom);
      controls.update();
    });
  });
  document.getElementById("resolution").addEventListener("input", (e) => {
    resolution = parseInt(e.target.value);
  });
}

function updateOptics() {
  earthMesh.material.wireframe =
    document.getElementById("wireframe-toggle").checked;
  moon.visible = document.getElementById("moon-toggle").checked;
  updateCapView();
  // Note: starMesh will be added when star map is implemented
}

function updateCapView() {
  const deployView = document.getElementById("deploy-view").checked;
  earthGroup.children.forEach((child) => {
    if (child.userData && child.userData.originalPosition) {
      earthGroup.remove(child);
    }
  });
  capArray.forEach((cap) => {
    const { lat, lon } = xyToLatLon(
      cap.x * xyScalers[cap.xScaler],
      cap.y * xyScalers[cap.yScaler]
    );
    const positionVector = new THREE.Vector3(
      ...Object.values(latLonToXY(lat, lon))
    ).normalize();
    let scaledHeight =
      cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
    if (deploymentType === "multi-tier") {
      scaledHeight += tierSettings.multiTierSpacing * (cap.tierLevel || 0);
    }
    const capMesh = new THREE.Group();
    capMesh.position.copy(
      positionVector.multiplyScalar(sphereRadius + scaledHeight)
    );
    if (deployView) {
      const geo = new THREE.SphereGeometry(
        500 * cap.size * sizeScalers[cap.sizeScaler],
        32,
        32
      );
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        vertexColors: true,
      });
      const colors = [];
      const positions = geo.getAttribute("position").array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        colors.push(
          x > 0 ? 1 : x < 0 ? 1 : 0,
          y > 0 ? 0 : y < 0 ? 1 : 0,
          z > 0 ? 0 : z < 0 ? 1 : 0
        );
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      capMesh.add(new THREE.Mesh(geo, mat));
    } else {
      const capSize =
        deploymentType === "multi-tier"
          ? cap.size * (tierSettings.multiTierLevels / 3)
          : cap.size;
      const capGeo = new THREE.SphereGeometry(
        500 * capSize * sizeScalers[cap.sizeScaler],
        32,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2
      );
      const capMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction] || 0xff0000,
        transparent: true,
        opacity:
          deploymentType === "single-band"
            ? tierSettings.singleBandIntensity / 100
            : 0.9,
        side: THREE.DoubleSide,
      });
      const capMeshMain = new THREE.Mesh(capGeo, capMat);
      const directionAngle =
        directions.indexOf(cap.direction) * (Math.PI / 4);
      const directionGeo = new THREE.SphereGeometry(
        500 * capSize * sizeScalers[cap.sizeScaler],
        32,
        16,
        directionAngle - Math.PI / 8,
        Math.PI / 4,
        0,
        Math.PI / 2
      );
      const directionMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction] || 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      });
      const directionMesh = new THREE.Mesh(directionGeo, directionMat);
      capMesh.add(capMeshMain, directionMesh);
    }
    capMesh.quaternion.copy(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        positionVector
      )
    );
    capMesh.userData = {
      size: cap.size * sizeScalers[cap.sizeScaler],
      originalPosition: { x: cap.x, y: cap.y, h: cap.h, z: cap.z },
    };
    cap.mesh = capMesh;
    earthGroup.add(capMesh);
  });
  document
    .getElementById("color-pallet-panel")
    .classList.toggle("hidden", !deployView);
}

function onMouseClick(event) {
  if (!settings.pickCap) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(earthMesh);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const selectedCap = capArray[settings.selectedCapIndex];
    if (selectedCap) {
      selectedCap.x = point.x;
      selectedCap.y = point.y;
      selectedCap.z = point.z;
      selectedCap.h = getStackedHeight(point.x, point.y, point.z);
      selectedCap.tierLevel = 0; // Initialize tier level for multi-tier
      if (settings.enableDebugLogging)
        console.log("Updated cap position:", selectedCap);
      updateAndFocus(selectedCap);
      renderHtmlCapsUI();
    }
  }
}
document.addEventListener("click", onMouseClick);

function updateCamera() {
  scene.remove(cameraHelper);
  if (settings.useOrthographic) {
    camera = new THREE.OrthographicCamera(
      window.innerWidth / -2,
      window.innerWidth / 2,
      window.innerHeight / 2,
      window.innerHeight / -2,
      0.1,
      200000
    );
  } else {
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200000
    );
  }
  camera.position.set(0, 0, sphereRadius * 3);
  controls.object = camera;
  cameraHelper = new THREE.CameraHelper(camera);
  scene.add(cameraHelper);
  resetCameraToDefault();
}

const datGuiContainer = document.getElementById("dat-gui-container");
const htmlControlsContainer = document.getElementById("html-controls");
const toggleToDatGuiBtn = document.getElementById("toggle-to-dat-gui");
const capsContainer = document.getElementById("caps-container");
const capTemplate = document.getElementById("cap-template");
const gui = new dat.GUI({ autoPlace: false });
datGuiContainer.appendChild(gui.domElement);
datGuiContainer.classList.add("controls");
gui
  .addColor(settings, "backgroundColor")
  .onChange((v) => (scene.background = new THREE.Color(v)));
gui
  .add(settings, "rotateSphere")
  .name("Rotate Earth")
  .onChange((v) => (settings.rotateSphere = v));
gui
  .add(settings, "preserveTarget")
  .onChange((v) => (settings.preserveTarget = v));
gui.add(settings, "resetCamera").name("Reset Camera");
gui
  .add(settings, "pickCap")
  .name("Pick Cap Location")
  .onChange((v) => (settings.pickCap = v));
gui
  .add(settings, "useOrthographic")
  .name("Use Orthographic Camera")
  .onChange((v) => settings.toggleCamera());
const capIndexController = gui
  .add(settings, "selectedCapIndex", 0, Math.max(0, capArray.length - 1))
  .name("Select Cap")
  .step(1)
  .onChange((v) => {
    settings.selectedCapIndex = Math.floor(v);
    if (capArray[settings.selectedCapIndex])
      focusCameraOnCap(capArray[settings.selectedCapIndex]);
  });
gui.add(settings, "toggleUI").name("Switch to HTML UI");
const advancedFolder = gui.addFolder("Advanced Settings");
advancedFolder
  .add(settings, "rotateSpeed", 0.1, 2.0)
  .name("Rotation Speed")
  .onChange((v) => (controls.rotateSpeed = v));
advancedFolder
  .add(settings, "dampingFactor", 0.01, 0.1)
  .name("Damping Factor")
  .onChange((v) => (controls.dampingFactor = v));
advancedFolder
  .add(settings, "zoomSpeed", 0.5, 2.0)
  .name("Zoom Speed")
  .onChange((v) => (controls.zoomSpeed = v));

function toggleAdvancedControls() {
  const panel = document.getElementById("advanced-controls-panel");
  panel.classList.toggle("hidden");
  if (!panel.classList.contains("hidden")) {
    panel.style.zIndex = "21"; // Bring to front
    document.getElementById("color-pallet-panel").style.zIndex = "20";
    document.getElementById("validation-toggle").checked =
      settings.enableValidation;
    document.getElementById("logging-toggle").checked =
      settings.enableDebugLogging;
  }
}
document
  .getElementById("advanced-controls-trigger")
  .addEventListener("click", settings.toggleAdvancedControls);
document
  .getElementById("validation-toggle")
  .addEventListener("change", (e) => {
    settings.enableValidation = e.target.checked;
    if (settings.enableDebugLogging)
      console.log("Validation toggled:", settings.enableValidation);
  });
document.getElementById("logging-toggle").addEventListener("change", (e) => {
  settings.enableDebugLogging = e.target.checked;
  console.log("Debug logging toggled:", settings.enableDebugLogging);
});

function renderCityKey() {
  const cityKeyContainer = document.getElementById("city-key");
  cityKeyContainer.innerHTML = "";
  cityKey.forEach((city) => {
    const cityDiv = document.createElement("div");
    cityDiv.className = "control-row";
    cityDiv.innerHTML = `<label>${city.name}: (${city.lat.toFixed(
      2
    )}, ${city.lon.toFixed(2)})</label>`;
    cityDiv.addEventListener("click", () => {
      const coords = latLonToXY(city.lat, city.lon);
      capArray.push({
        x: coords.x,
        y: coords.y,
        z: coords.z,
        h: getStackedHeight(coords.x, coords.y, coords.z),
        size: 2,
        direction: "NW",
        xScaler: 4,
        yScaler: 4,
        hScaler: 0,
        sizeScaler: 2,
        mesh: null,
      });
      settings.selectedCapIndex = capArray.length - 1;
      capIndexController.setValue(settings.selectedCapIndex);
      capIndexController.max(capArray.length - 1);
      renderHtmlCapsUI();
      updateAndFocus(capArray[capArray.length - 1]);
      if (settings.enableDebugLogging)
        console.log(
          "Added city cap:",
          city.name,
          capArray[capArray.length - 1]
        );
    });
    cityKeyContainer.appendChild(cityDiv);
  });
}

document.getElementById("save-caps-btn").addEventListener("click", () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const data = JSON.stringify({
    capArray: capArray.map((cap) => ({
      x: cap.x,
      y: cap.y,
      z: cap.z,
      h: cap.h,
      size: cap.size,
      direction: cap.direction,
      xScaler: cap.xScaler,
      yScaler: cap.yScaler,
      hScaler: cap.hScaler,
      sizeScaler: cap.sizeScaler,
    })),
    texturePaths: {
      earthMapPath,
      earthBumpMapPath,
      earthCloudPath,
      moonMapPath,
      moonBumpMapPath,
      starMapPath,
    },
    colors: {
      panelBgColor: settings.panelBgColor,
      panelTextColor: settings.panelTextColor,
      panelBorderColor: settings.panelBorderColor,
      buttonBgColor: settings.buttonBgColor,
    },
  });
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `settings_${timestamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
  if (settings.enableDebugLogging)
    console.log("Saved settings to file:", `settings_${timestamp}.json`);
});

document.getElementById("load-caps-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const loadedData = JSON.parse(event.target.result);
      capArray.forEach((cap) => {
        if (cap.mesh) earthGroup.remove(cap.mesh);
      });
      capArray = loadedData.capArray.map((cap) => ({ ...cap, mesh: null }));
      settings.selectedCapIndex = 0;
      capIndexController.setValue(0);
      capIndexController.max(capArray.length - 1);

      // Load texture paths
      earthMapPath = loadedData.texturePaths.earthMapPath || earthMapPath;
      earthBumpMapPath = loadedData.texturePaths.earthBumpMapPath || earthBumpMapPath;
      earthCloudPath = loadedData.texturePaths.earthCloudPath || earthCloudPath;
      moonMapPath = loadedData.texturePaths.moonMapPath || moonMapPath;
      moonBumpMapPath = loadedData.texturePaths.moonBumpMapPath || moonBumpMapPath;
      starMapPath = loadedData.texturePaths.starMapPath || starMapPath;

      // Reload textures
      earthTexture.dispose();
      earthBumpMap.dispose();
      cloudTexture.dispose();
      earthTexture = textureLoader.load(earthMapPath);
      earthBumpMap = textureLoader.load(earthBumpMapPath);
      cloudTexture = textureLoader.load(earthCloudPath);
      earthMaterial.map = earthTexture;
      earthMaterial.bumpMap = earthBumpMap;
      cloudMaterial.map = cloudTexture;

      // Load colors
      settings.panelBgColor = loadedData.colors.panelBgColor || settings.panelBgColor;
      settings.panelTextColor = loadedData.colors.panelTextColor || settings.panelTextColor;
      settings.panelBorderColor = loadedData.colors.panelBorderColor || settings.panelBorderColor;
      settings.buttonBgColor = loadedData.colors.buttonBgColor || settings.buttonBgColor;
      applyColorSettings();

      renderHtmlCapsUI();
      capArray.forEach(createCap);
      if (capArray[0]) focusCameraOnCap(capArray[0]);
      if (settings.enableDebugLogging) console.log("Loaded settings:", loadedData);
    };
    reader.readAsText(file);
  }
});

htmlControlsContainer.classList.add("controls");
document.getElementById("bg-color").addEventListener("input", (e) => {
  scene.background =
    e.target.value === "#000000" ? null : new THREE.Color(e.target.value);
});
document
  .getElementById("rotate-sphere")
  .addEventListener(
    "change",
    (e) => (settings.rotateSphere = e.target.checked)
  );
document.getElementById("rotate-sphere").checked = settings.rotateSphere;
document
  .getElementById("preserve-target")
  .addEventListener(
    "change",
    (e) => (settings.preserveTarget = e.target.checked)
  );
document
  .getElementById("reset-camera-btn")
  .addEventListener("click", settings.resetCamera);

const pickCapContainer = document.createElement("div");
pickCapContainer.className = "control-row";
pickCapContainer.innerHTML = `
  <label>Pick Cap Location</label>
  <div>
      <input type="checkbox" id="pick-cap">
      <select id="select-cap"></select>
  </div>
`;
const capsFieldset = capsContainer.parentElement;
capsFieldset.insertBefore(pickCapContainer, capsContainer);
const pickCapCheckbox = document.getElementById("pick-cap");
const selectCapDropdown = document.getElementById("select-cap");
pickCapCheckbox.addEventListener("change", (e) => {
  settings.pickCap = e.target.checked;
});
selectCapDropdown.addEventListener("change", (e) => {
  settings.selectedCapIndex = parseInt(e.target.value);
  capIndexController.setValue(settings.selectedCapIndex);
  if (capArray[settings.selectedCapIndex])
    focusCameraOnCap(capArray[settings.selectedCapIndex]);
});

function updateCapSelectDropdown() {
  const selectCapDropdown = document.getElementById("select-cap");
  selectCapDropdown.innerHTML = "";
  capArray.forEach((_, index) => {
    const option = new Option(`Cap ${index + 1}`, index);
    selectCapDropdown.add(option);
  });
  selectCapDropdown.value = settings.selectedCapIndex;
}

document.getElementById("add-cap-btn").addEventListener("click", () => {
  const newCap = {
    x: houstonCoords.x,
    y: houstonCoords.y,
    z: houstonCoords.z,
    h: getStackedHeight(houstonCoords.x, houstonCoords.y, houstonCoords.z),
    size: 2,
    direction: "NW",
    xScaler: 4,
    yScaler: 4,
    hScaler: 0,
    sizeScaler: 2,
    mesh: null,
    tierLevel: 0,
  };
  capArray.push(newCap);
  settings.selectedCapIndex = capArray.length - 1;
  capIndexController.setValue(settings.selectedCapIndex);
  capIndexController.max(capArray.length - 1);
  renderHtmlCapsUI();
  updateAndFocus(capArray[capArray.length - 1]);
  if (settings.enableDebugLogging) console.log("Added new cap:", newCap);
});

document.getElementById("revert-colors").addEventListener("click", () => {
  document.querySelectorAll(".color-item .newer").forEach((newer) => {
    newer.value = newer.nextElementSibling.value;
  });
});

document.getElementById("randomize-colors").addEventListener("click", () => {
  document.querySelectorAll(".color-item .older").forEach((older) => {
    older.value = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  });
  document.querySelectorAll(".color-item .newer").forEach((newer) => {
    newer.value = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  });
});

document.getElementById("save-colors").addEventListener("click", () => {
  document.querySelectorAll(".color-item").forEach((item) => {
    const newerInput = item.querySelector(".newer");
    const olderInput = item.querySelector(".older");
    if (newerInput && olderInput) {
      olderInput.value = newerInput.value;
      if (newerInput.id === "panel-bg-newer") settings.panelBgColor = newerInput.value;
      if (newerInput.id === "panel-text-newer") settings.panelTextColor = newerInput.value;
      if (newerInput.id === "panel-border-newer") settings.panelBorderColor = newerInput.value;
      if (newerInput.id === "button-bg-newer") settings.buttonBgColor = newerInput.value;
    }
  });
  applyColorSettings();
  document.getElementById("color-pallet-panel").classList.add("hidden");
});

document.getElementById("discard-colors").addEventListener("click", () => {
  document.getElementById("revert-colors").click();
  document.getElementById("color-pallet-panel").classList.add("hidden");
});

document.getElementById("revert-colors").addEventListener("click", () => {
  document.querySelectorAll(".color-item").forEach((item) => {
    const newerInput = item.querySelector(".newer");
    const olderInput = item.querySelector(".older");
    if (newerInput && olderInput && newerInput.value !== olderInput.value) {
      newerInput.value = olderInput.value;
      newerInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
});

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("optics-toggle").addEventListener("change", (e) => {
    document
      .getElementById("optic-management")
      .classList.toggle("hidden", !e.target.checked);
    if (e.target.checked) updateOptics();
  });

  document.getElementById("file-toggle").addEventListener("change", (e) => {
    document
      .getElementById("file-management")
      .classList.toggle("hidden", !e.target.checked);
  });

  document
    .getElementById("rotation-toggle")
    .addEventListener("change", (e) => {
      settings.rotateSphere = e.target.checked;
    });

  document
    .getElementById("wireframe-toggle")
    .addEventListener("change", updateOptics);

  document.getElementById("moon-toggle").addEventListener("change", (e) => {
    moon.visible = e.target.checked;
  });

  document.getElementById("orbit-toggle").addEventListener("change", (e) => {
    settings.orbitMoon = e.target.checked;
    if (settings.enableDebugLogging)
      console.log("Moon orbit toggled:", settings.orbitMoon);
  });

  document
    .getElementById("contrast-toggle")
    .addEventListener("change", (e) => {
      const emissiveIntensity = e.target.checked ? 0.5 : 0;
      earthMaterial.emissive.setHex(0x333333);
      earthMaterial.emissiveIntensity = emissiveIntensity;
      moonMaterial.emissive.setHex(0x333333);
      moonMaterial.emissiveIntensity = emissiveIntensity;
      if (settings.enableDebugLogging)
        console.log("Contrast toggled:", emissiveIntensity);
    });

  document.getElementById("reset-view").addEventListener("click", () => {
    camera.position.set(0, 0, sphereRadius * 2);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  document
    .getElementById("maintain-focus")
    .addEventListener("change", (e) => {
      if (e.target.checked) {
        document.getElementById("ortho-focus").checked = false;
        document.getElementById("binary-focus").checked = false;
        const cap = capArray[settings.selectedCapIndex] || {};
        const { x, y, z } = latLonToXY(cap.lat || 29.76, cap.lon || -95.36);
        controls.target.set(x, y, z);
        controls.update();
      }
    });

  document.getElementById("ortho-focus").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("maintain-focus").checked = false;
      document.getElementById("binary-focus").checked = false;
    }
  });

  document.getElementById("binary-focus").addEventListener("change", (e) => {
    if (e.target.checked) {
      document.getElementById("maintain-focus").checked = false;
      document.getElementById("ortho-focus").checked = false;
    }
  });

  document
    .getElementById("deploy-view")
    .addEventListener("change", updateCapView);
});

function animate() {
  requestAnimationFrame(animate);
  const elapsedTime = Date.now() * 0.0001;

  if (settings.orbitMoon) {
    const moonOrbitRadius = 384400;
    const moonOrbitSpeed = elapsedTime * 0.05;
    moon.position.x = Math.cos(moonOrbitSpeed) * moonOrbitRadius;
    moon.position.z = Math.sin(moonOrbitSpeed) * moonOrbitRadius;
  }

  if (settings.rotateSphere) {
    const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      elapsedTime * 0.25
    );
    earthMesh.quaternion.copy(rotationQuaternion);
    cloudMesh.quaternion.copy(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        elapsedTime * 0.28
      )
    );
  }

  capArray.forEach((cap) => {
    if (cap.mesh) {
      const { lat, lon } = xyToLatLon(
        cap.x * xyScalers[cap.xScaler],
        cap.y * xyScalers[cap.yScaler]
      );
      let scaledHeight =
        cap.h * xyScalers[cap.hScaler] +
        getStackedHeight(cap.x, cap.y, cap.z);
      if (deploymentType === "multi-tier") {
        scaledHeight += tierSettings.multiTierSpacing * (cap.tierLevel || 0);
      }

      const normalizedDirection = new THREE.Vector3(
        ...Object.values(latLonToXY(lat, lon))
      ).normalize();

      const upVector = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        upVector,
        normalizedDirection
      );
      cap.mesh.quaternion.copy(quaternion);

      cap.mesh.position.copy(
        normalizedDirection.multiplyScalar(sphereRadius + scaledHeight)
      );

      const baseScale =
        deploymentType === "multi-tier"
          ? tierSettings.multiTierLevels / 3
          : 1;
      const pulseScale = 1 + 0.05 * Math.sin(Date.now() * 0.0001 * 2);
      cap.mesh.scale.set(
        baseScale * pulseScale,
        baseScale * pulseScale,
        baseScale * pulseScale
      );
    }
  });

  controls.update();
  renderer.render(scene, camera);
}

function renderHtmlCapsUI() {
  const capsContainer = document.getElementById("caps-container");
  const capTemplate = document.getElementById("cap-template");
  const selectCapDropdown = document.getElementById("select-cap");
  if (!capsContainer || !capTemplate || !selectCapDropdown) {
    console.error("Required DOM elements missing:", {
      capsContainer,
      capTemplate,
      selectCapDropdown,
    });
    return;
  }
  capsContainer.innerHTML = "";
  selectCapDropdown.innerHTML = "";
  capArray.forEach((cap, index) => {
    const capUi = capTemplate.content.cloneNode(true).firstElementChild;
    capUi.querySelector(".cap-title").textContent = `Cap ${index + 1}`;
    capUi.dataset.index = index;
    const controlsMap = [
      {
        prop: "x",
        type: "range",
        min: -sphereRadius,
        max: sphereRadius,
        step: 1,
      },
      {
        prop: "y",
        type: "range",
        min: -sphereRadius,
        max: sphereRadius,
        step: 1,
      },
      { prop: "h", type: "range", min: 0, max: 100, step: 1 },
      { prop: "size", type: "range", min: 0.1, max: 5, step: 0.1 },
      { prop: "xScaler", type: "select", options: xyScalerLabels },
      { prop: "yScaler", type: "select", options: xyScalerLabels },
      { prop: "hScaler", type: "select", options: xyScalerLabels },
      { prop: "sizeScaler", type: "select", options: sizeScalerLabels },
      { prop: "direction", type: "select", options: directions },
    ];
    controlsMap.forEach(({ prop, type, min, max, step, options }) => {
      const el = capUi.querySelector(`[data-property="${prop}"]`);
      if (!el) {
        console.warn(`Element for ${prop} not found in cap template`);
        return;
      }
      if (type === "range") {
        el.min = min;
        el.max = max;
        el.step = step;
        el.value = cap[prop];
        const valueDisplay = el.previousElementSibling
          ? el.previousElementSibling.querySelector(".value-display")
          : null;
        if (valueDisplay) valueDisplay.textContent = el.value;
        el.addEventListener("input", (e) => {
          const value = parseFloat(e.target.value);
          cap[prop] = settings.enableValidation
            ? Math.max(min, Math.min(max, value))
            : value;
          e.target.value = cap[prop];
          if (valueDisplay) valueDisplay.textContent = e.target.value;
          updateAndFocus(cap);
          if (settings.enableDebugLogging)
            console.log(`Updated cap ${index + 1} ${prop}:`, cap[prop]);
        });
      } else if (type === "select") {
        const source = Array.isArray(options) ? options : Object.keys(options);
        source.forEach((key) => {
          const value = Array.isArray(options) ? key : options[key];
          const option = new Option(key, value);
          el.add(option);
        });
        el.value = cap[prop];
        el.addEventListener("change", (e) => {
          cap[prop] = Array.isArray(options)
            ? e.target.value
            : parseInt(e.target.value);
          updateAndFocus(cap);
          if (settings.enableDebugLogging)
            console.log(`Updated cap ${index + 1} ${prop}:`, cap[prop]);
        });
      }
    });
    capUi.querySelector(".remove-cap-btn").addEventListener("click", () => {
      if (cap.mesh) earthGroup.remove(cap.mesh);
      if (settings.enableDebugLogging)
        console.log(`Removing cap ${index + 1}:`, cap);
      capArray.splice(index, 1);
      if (settings.selectedCapIndex >= capArray.length) {
        settings.selectedCapIndex = Math.max(0, capArray.length - 1);
        capIndexController.setValue(settings.selectedCapIndex);
      }
      capIndexController.max(Math.max(0, capArray.length - 1));
      renderHtmlCapsUI();
      if (capArray.length > 0 && capArray[settings.selectedCapIndex]) {
        focusCameraOnCap(capArray[settings.selectedCapIndex]);
      } else {
        resetCameraToDefault();
      }
    });
    capsContainer.appendChild(capUi);
  });
  updateCapSelectDropdown();
}

function toggleControlPanel() {
  datGuiContainer.classList.toggle("hidden");
  htmlControlsContainer.classList.toggle("hidden");
}
toggleToDatGuiBtn.addEventListener("click", toggleControlPanel);

document.getElementById("deployment-type").addEventListener("change", (e) => {
  deploymentType = e.target.value;
  ["single-band", "single-tier", "multi-tier"].forEach((type) =>
    document
      .getElementById(`${type}-controls`)
      .classList.toggle("hidden", type !== deploymentType)
  );
});

document
  .getElementById("color-pallet-trigger")
  .addEventListener("click", () => {
    const panel = document.getElementById("color-pallet-panel");
    panel.classList.toggle("hidden");
    if (!panel.classList.contains("hidden")) {
      panel.style.zIndex = "21";
      document.getElementById("advanced-controls-panel").style.zIndex = "20";
      const elements = [
        "Panel Background",
        "Panel Text",
        "Panel Border",
        "Button Background",
      ];
      const newer = document.getElementById("newer-colors");
      const older = document.getElementById("older-colors");
      newer.innerHTML = older.innerHTML = elements
        .map(
          (el) => `
            <div class="color-item">
                <span>${el}</span>
                <input type="color" class="newer" id="${el.toLowerCase().replace(' ', '-')}-newer" value="${el === 'Panel Background' ? settings.panelBgColor : el === 'Panel Text' ? settings.panelTextColor : el === 'Panel Border' ? settings.panelBorderColor : settings.buttonBgColor}">
                <input type="color" class="older" id="${el.toLowerCase().replace(' ', '-')}-older" value="${el === 'Panel Background' ? settings.panelBgColor : el === 'Panel Text' ? settings.panelTextColor : el === 'Panel Border' ? settings.panelBorderColor : settings.buttonBgColor}">
            </div>
          `
        )
        .join("");
      document
        .querySelectorAll("#newer-colors .color-item input.newer")
        .forEach((input) => {
          input.addEventListener("change", (e) => {
            const item = e.target.closest(".color-item");
            const elementName = item.querySelector("span").textContent;
            const color = e.target.value;
            const root = document.documentElement;

            let cssVarName = "";
            if (elementName === "Panel Background") cssVarName = "--panel-bg-color";
            else if (elementName === "Panel Text") cssVarName = "--panel-text-color";
            else if (elementName === "Panel Border") cssVarName = "--panel-border-color";
            else if (elementName === "Button Background") cssVarName = "--button-bg-color";

            if (cssVarName) {
              root.style.setProperty(cssVarName, color);
            }
          });
        });
    }
  });

function applyColorSettings() {
  const root = document.documentElement;
  root.style.setProperty("--panel-bg-color", settings.panelBgColor);
  root.style.setProperty("--panel-text-color", settings.panelTextColor);
  root.style.setProperty("--panel-border-color", settings.panelBorderColor);
  root.style.setProperty("--button-bg-color", settings.buttonBgColor);
}

function resetCameraToDefault() {
  if (!camera || !controls) return;
  camera.position.set(0, 0, sphereRadius * 3);
  controls.target.set(0, 0, 0);
  controls.update();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  if (settings.useOrthographic) {
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
  }
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize);

window.onerror = function (msg, src, line, col, err) {
  document.getElementById(
    "error"
  ).textContent = `⚠️ Error at ${src}:${line} → ${msg}`;
  console.error("Global error caught:", err);
};

window.addEventListener("DOMContentLoaded", () => {
  resetCameraToDefault();
  renderHtmlCapsUI();
  renderCityKey();
  capArray.forEach(createCap);
  if (capArray[0]) focusCameraOnCap(capArray[0]);
  updateCameraControls();
  applyColorSettings();
  setInterval(
    () => localStorage.setItem("capArray", JSON.stringify(capArray)),
    30000
  );
  animate();
});