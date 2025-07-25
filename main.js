javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Note: dat.gui is loaded via <script> in index.html, using global dat.GUI
// Future Modularization Plan:
// - sceneSetup.js: Scene, camera, renderer, Earth, stars, moon, lighting
// - capManagement.js: Cap creation, stacking, merging, coordinate conversions
// - uiControls.js: GUI, HTML UI, pop-up console
// - main.js: Import and orchestrate modules

// Initialize core components
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Raycaster for mouse picking
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Camera helper for debugging
const cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Star field
const starGeometry = new THREE.SphereGeometry(150000, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({
    map: textureLoader.load('textures/galaxy.png'),
    side: THREE.BackSide
});
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starMesh);

// Moon setup
const moonGeometry = new THREE.SphereGeometry(1737.4, 32, 32);
const moonTexture = new THREE.TextureLoader().load('textures/moon-4k-18.jpg');
const moonBumpMap = new THREE.TextureLoader().load('textures/MoonBumpmap.png');
const moonMaterial = new THREE.MeshPhongMaterial({
    map: moonTexture,
    bumpMap: moonBumpMap,
    bumpScale: 0.05,
    color: 0x888888
});
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.position.set(0, 0, 384400);
scene.add(moon);

// Earth setup
const sphereRadius = 6371;
const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
const earthTexture = new THREE.TextureLoader().load('textures/earth-4k.jpg');
const earthBumpMap = new THREE.TextureLoader().load('textures/earth-bump-4k.jpg');
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthBumpMap,
    bumpScale: 0.05,
    color: 0x0000ff
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.set(0, 0, 0);

// Cloud layer
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64);
const cloudTexture = new THREE.TextureLoader().load('textures/earth-clouds-4k.png');
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
});
const cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);

// Earth group
const earthGroup = new THREE.Group();
earthGroup.add(earthMesh, cloudMesh);
scene.add(earthGroup);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000);
scene.add(sunLight);

// Camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
controls.maxDistance = (16 * sphereRadius) / Math.tan(camera.fov * (Math.PI / 180) / 2);
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
    { name: "Sydney, AU", lat: -33.87, lon: 151.21 }
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
    rotateSpeed: 0.5, // Added for advanced GUI
    dampingFactor: 0.05, // Added for advanced GUI
    zoomSpeed: 1.0, // Added for advanced GUI
    resetCamera: () => resetCameraToDefault(),
    toggleUI: () => toggleControlPanel(),
    toggleCamera: () => { settings.useOrthographic = !settings.useOrthographic; updateCamera(); },
    toggleAdvancedControls: () => toggleAdvancedControls()
};

// Coordinate conversions
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

// Cap data
const houstonCoords = latLonToXY(29.76, -95.36);
let capArray = JSON.parse(localStorage.getItem('capArray')) || [
    { x: houstonCoords.x, y: houstonCoords.y, z: houstonCoords.z, h: 0, size: 2, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null }
];
let primaryCapIndex = 0, secondaryCapIndex = 0;
let deploymentType = 'single-band';
const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.05, 0.1, 0.2, 0.5, 1];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
    "N": 0xff0000, "NE": 0xffa500, "E": 0xffff00, "SE": 0x00ff00,
    "S": 0x00ffff, "SW": 0x0000ff, "W": 0x800080, "NW": 0xff00ff
};
const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { "Tiny": 0, "Small": 1, "Medium": 2, "Large": 3, "Huge": 4 };

// Cap stacking and merging
function getStackedHeight(x, y, z) {
    const existingCaps = capArray.filter(cap =>
        Math.abs(cap.x - x) < 1e-3 && Math.abs(cap.y - y) < 1e-3 && Math.abs(cap.z - z) < 1e-3
    );
    return existingCaps.length * 10;
}

function checkAndMergeCaps(newCap) {
    if (settings.enableDebugLogging) console.log('Checking merge for cap:', newCap);
    const mergeableCaps = capArray.filter(cap =>
        cap !== newCap && cap.h === newCap.h &&
        Math.abs(cap.x - newCap.x) < 500 * cap.size * sizeScalers[cap.sizeScaler]
    );
    if (mergeableCaps.length > 0) {
        const mergedSize = Math.max(newCap.size, ...mergeableCaps.map(cap => cap.size));
        newCap.size = mergedSize * 1.1;
        mergeableCaps.forEach(cap => {
            if (cap.mesh) earthGroup.remove(cap.mesh);
            capArray.splice(capArray.indexOf(cap), 1);
            if (settings.enableDebugLogging) console.log('Merged cap:', cap);
        });
    }
}

// Create cap
function createCap(cap) {
    if (settings.enableDebugLogging) console.log('Creating cap:', cap);
    if (cap.mesh) earthGroup.remove(cap.mesh);
    const { lat, lon } = xyToLatLon(cap.x * xyScalers[cap.xScaler], cap.y * xyScalers[cap.yScaler]);
    const positionVector = new THREE.Vector3(...Object.values(latLonToXY(lat, lon))).normalize();
    const scaledHeight = cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector);
    const capMesh = new THREE.Group();
    capMesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));
    const capGeo = new THREE.SphereGeometry(500 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction] || 0xff0000,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const capMeshMain = new THREE.Mesh(capGeo, capMat);
    const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
    const directionGeo = new THREE.SphereGeometry(500 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, Math.PI / 2);
    const directionMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction] || 0xff0000,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    const directionMesh = new THREE.Mesh(directionGeo, directionMat);
    capMesh.add(capMeshMain, directionMesh);
    capMesh.quaternion.copy(quaternion);
    capMesh.userData = { size: cap.size * sizeScalers[cap.sizeScaler], originalPosition: { x: cap.x, y: cap.y, h: cap.h, z: cap.z } };
    cap.mesh = capMesh;
    earthGroup.add(capMesh);
    checkAndMergeCaps(cap);
}

// Focus camera
function focusCameraOnCap(cap) {
    if (!cap.mesh) return;
    const capPosition = new THREE.Vector3();
    cap.mesh.getWorldPosition(capPosition);
    const camDistance = sphereRadius * 2;
    const cameraPosition = capPosition.clone().normalize().multiplyScalar(sphereRadius + camDistance);
    camera.position.copy(cameraPosition);
    if (!settings.preserveTarget) controls.target.copy(capPosition);
    controls.update();
}

// Update and focus
function updateAndFocus(cap) {
    createCap(cap);
    focusCameraOnCap(cap);
}

// Camera controls
function updateCameraControls() {
    const speed = 10 / resolution;
    document.querySelectorAll('.cam-arrows button').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.id.replace('strafe-', '').replace('-', '');
            const x = { up: 0, down: 0, left: -1, right: 1, 'up-left': -1, 'up-right': 1, 'down-left': -1, 'down-right': 1 }[dir] || 0;
            const y = { up: 1, down: -1, left: 0, right: 0, 'up-left': 1, 'up-right': 1, 'down-left': -1, 'down-right': -1 }[dir] || 0;
            camera.position.x += x * speed;
            camera.position.y += y * speed;
            controls.target.x += x * speed;
            controls.target.y += y * speed;
            controls.update();
        });
    });
    ['macro', 'micro', 'basic'].forEach(type => {
        document.getElementById(`${type}-zoom`).addEventListener('input', (e) => {
            const zoom = parseInt(e.target.value) / 50;
            camera.position.multiplyScalar(zoom);
            controls.update();
        });
    });
    document.getElementById('resolution').addEventListener('input', (e) => {
        resolution = parseInt(e.target.value);
    });
}

// Update optics
function updateOptics() {
    earthMesh.material.wireframe = document.getElementById('wireframe-toggle').checked;
    starMesh.visible = document.getElementById('stars-toggle').checked;
    moon.visible = document.getElementById('moon-toggle').checked;
    updateCapView();
}

// Update cap view
function updateCapView() {
    const deployView = document.getElementById('deploy-view').checked;
    earthGroup.children.forEach(child => {
        if (child.userData && child.userData.originalPosition) {
            earthGroup.remove(child);
        }
    });
    capArray.forEach(cap => {
        const { lat, lon } = xyToLatLon(cap.x * xyScalers[cap.xScaler], cap.y * xyScalers[cap.yScaler]);
        const positionVector = new THREE.Vector3(...Object.values(latLonToXY(lat, lon))).normalize();
        const scaledHeight = cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
        const capMesh = new THREE.Group();
        capMesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));
        if (deployView) {
            const geo = new THREE.SphereGeometry(500 * cap.size * sizeScalers[cap.sizeScaler], 32, 32);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
            const colors = [];
            const positions = geo.getAttribute('position').array;
            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];
                const z = positions[i + 2];
                colors.push(x > 0 ? 1 : x < 0 ? 1 : 0, y > 0 ? 0 : y < 0 ? 1 : 0, z > 0 ? 0 : z < 0 ? 1 : 0);
            }
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            capMesh.add(new THREE.Mesh(geo, mat));
        } else {
            const capGeo = new THREE.SphereGeometry(500 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const capMat = new THREE.MeshBasicMaterial({
                color: directionColors[cap.direction] || 0xff0000,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            const capMeshMain = new THREE.Mesh(capGeo, capMat);
            const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
            const directionGeo = new THREE.SphereGeometry(500 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, Math.PI / 2);
            const directionMat = new THREE.MeshBasicMaterial({
                color: directionColors[cap.direction] || 0xff0000,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide
            });
            const directionMesh = new THREE.Mesh(directionGeo, directionMat);
            capMesh.add(capMeshMain, directionMesh);
        }
        capMesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), positionVector));
        capMesh.userData = { size: cap.size * sizeScalers[cap.sizeScaler], originalPosition: { x: cap.x, y: cap.y, h: cap.h, z: cap.z } };
        cap.mesh = capMesh;
        earthGroup.add(capMesh);
    });
    document.getElementById('color-key').classList.toggle('hidden', !deployView);
}

// Mouse click for cap placement
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
            if (settings.enableDebugLogging) console.log('Updated cap position:', selectedCap);
            updateAndFocus(selectedCap);
            renderHtmlCapsUI();
        }
    }
}
document.addEventListener('click', onMouseClick);

// Camera type toggle
function updateCamera() {
    scene.remove(cameraHelper);
    if (settings.useOrthographic) {
        camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 200000);
    } else {
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
    }
    camera.position.set(0, 0, sphereRadius * 3);
    controls.object = camera;
    cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);
    resetCameraToDefault();
}

// Reset camera
function resetCameraToDefault() {
    camera.position.set(0, 0, sphereRadius * 3);
    controls.target.set(0, 0, 0);
    controls.update();
}

// UI setup
const datGuiContainer = document.getElementById('dat-gui-container');
const htmlControlsContainer = document.getElementById('html-controls');
const toggleToDatGuiBtn = document.getElementById('toggle-to-dat-gui');
const capsContainer = document.getElementById('caps-container');
const capTemplate = document.getElementById('cap-template');
const gui = new dat.GUI({ autoPlace: false });
datGuiContainer.appendChild(gui.domElement);
datGuiContainer.classList.add('controls');
gui.addColor(settings, "backgroundColor").onChange(v => scene.background = new THREE.Color(v));
gui.add(settings, "rotateSphere").name("Rotate Earth").onChange(v => settings.rotateSphere = v);
gui.add(settings, "preserveTarget").onChange(v => settings.preserveTarget = v);
gui.add(settings, "resetCamera").name("Reset Camera");
gui.add(settings, "pickCap").name("Pick Cap Location").onChange(v => settings.pickCap = v);
gui.add(settings, "useOrthographic").name("Use Orthographic Camera").onChange(v => settings.toggleCamera());
const capIndexController = gui.add(settings, "selectedCapIndex", 0, Math.max(0, capArray.length - 1)).name("Select Cap").step(1)
    .onChange(v => {
        settings.selectedCapIndex = Math.floor(v);
        if (capArray[settings.selectedCapIndex]) focusCameraOnCap(capArray[settings.selectedCapIndex]);
    });
gui.add(settings, 'toggleUI').name('Switch to HTML UI');
const advancedFolder = gui.addFolder('Advanced Settings');
advancedFolder.add(settings, 'rotateSpeed', 0.1, 2.0).name('Rotation Speed').onChange(v => controls.rotateSpeed = v);
advancedFolder.add(settings, 'dampingFactor', 0.01, 0.1).name('Damping Factor').onChange(v => controls.dampingFactor = v);
advancedFolder.add(settings, 'zoomSpeed', 0.5, 2.0).name('Zoom Speed').onChange(v => controls.zoomSpeed = v);

// Pop-up management console
function toggleAdvancedControls() {
    const panel = document.getElementById('advanced-controls-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        document.getElementById('validation-toggle').checked = settings.enableValidation;
        document.getElementById('logging-toggle').checked = settings.enableDebugLogging;
    }
}
document.getElementById('advanced-controls-trigger').addEventListener('click', settings.toggleAdvancedControls);
document.getElementById('validation-toggle').addEventListener('change', (e) => {
    settings.enableValidation = e.target.checked;
    if (settings.enableDebugLogging) console.log('Validation toggled:', settings.enableValidation);
});
document.getElementById('logging-toggle').addEventListener('change', (e) => {
    settings.enableDebugLogging = e.target.checked;
    console.log('Debug logging toggled:', settings.enableDebugLogging);
});

// City key rendering
function renderCityKey() {
    const cityKeyContainer = document.getElementById('city-key');
    cityKeyContainer.innerHTML = '';
    cityKey.forEach(city => {
        const cityDiv = document.createElement('div');
        cityDiv.className = 'control-row';
        cityDiv.innerHTML = `<label>${city.name}: (${city.lat.toFixed(2)}, ${city.lon.toFixed(2)})</label>`;
        cityDiv.addEventListener('click', () => {
            const coords = latLonToXY(city.lat, city.lon);
            capArray.push({
                x: coords.x, y: coords.y, z: coords.z, h: getStackedHeight(coords.x, coords.y, coords.z),
                size: 2, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null
            });
            settings.selectedCapIndex = capArray.length - 1;
            capIndexController.setValue(settings.selectedCapIndex);
            capIndexController.max(capArray.length - 1);
            renderHtmlCapsUI();
            updateAndFocus(capArray[capArray.length - 1]);
            if (settings.enableDebugLogging) console.log('Added city cap:', city.name, capArray[capArray.length - 1]);
        });
        cityKeyContainer.appendChild(cityDiv);
    });
}

// File management
document.getElementById('save-caps-btn').addEventListener('click', () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const data = JSON.stringify(capArray.map(cap => ({
        x: cap.x, y: cap.y, z: cap.z, h: cap.h, size: cap.size, direction: cap.direction,
        xScaler: cap.xScaler, yScaler: cap.yScaler, hScaler: cap.hScaler, sizeScaler: cap.sizeScaler
    })));
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capArray_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (settings.enableDebugLogging) console.log('Saved caps to file:', `capArray_${timestamp}.json`);
});

document.getElementById('load-caps-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const loadedCaps = JSON.parse(event.target.result);
            capArray.forEach(cap => { if (cap.mesh) earthGroup.remove(cap.mesh); });
            capArray = loadedCaps.map(cap => ({ ...cap, mesh: null }));
            settings.selectedCapIndex = 0;
            capIndexController.setValue(0);
            capIndexController.max(capArray.length - 1);
            renderHtmlCapsUI();
            capArray.forEach(createCap);
            if (capArray[0]) focusCameraOnCap(capArray[0]);
            if (settings.enableDebugLogging) console.log('Loaded caps:', capArray);
        };
        reader.readAsText(file);
    }
});

// HTML UI setup
htmlControlsContainer.classList.add('controls');
document.getElementById('bg-color').addEventListener('input', (e) => {
    scene.background = e.target.value === '#000000' ? null : new THREE.Color(e.target.value);
});
document.getElementById('rotate-sphere').addEventListener('change', (e) => settings.rotateSphere = e.target.checked);
document.getElementById('rotate-sphere').checked = settings.rotateSphere;
document.getElementById('preserve-target').addEventListener('change', (e) => settings.preserveTarget = e.target.checked);
document.getElementById('reset-camera-btn').addEventListener('click', settings.resetCamera);

const pickCapContainer = document.createElement('div');
pickCapContainer.className = 'control-row';
pickCapContainer.innerHTML = `
    <label>Pick Cap Location</label>
    <div>
        <input type="checkbox" id="pick-cap">
        <select id="select-cap"></select>
    </div>
`;
const capsFieldset = capsContainer.parentElement;
capsFieldset.insertBefore(pickCapContainer, capsContainer);
const pickCapCheckbox = document.getElementById('pick-cap');
const selectCapDropdown = document.getElementById('select-cap');
pickCapCheckbox.addEventListener('change', (e) => {
    settings.pickCap = e.target.checked;
});
selectCapDropdown.addEventListener('change', (e) => {
    settings.selectedCapIndex = parseInt(e.target.value);
    capIndexController.setValue(settings.selectedCapIndex);
    if (capArray[settings.selectedCapIndex]) focusCameraOnCap(capArray[settings.selectedCapIndex]);
});

function updateCapSelectDropdown() {
    selectCapDropdown.innerHTML = '';
    capArray.forEach((_, index) => {
        const option = new Option(`Cap ${index + 1}`, index);
        selectCapDropdown.add(option);
    });
    selectCapDropdown.value = settings.selectedCapIndex;
}

document.getElementById('add-cap-btn').addEventListener('click', () => {
    const newCap = {
        x: houstonCoords.x, y: houstonCoords.y, z: houstonCoords.z,
        h: getStackedHeight(houstonCoords.x, houstonCoords.y, houstonCoords.z),
        size: 2, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null
    };
    capArray.push(newCap);
    settings.selectedCapIndex = capArray.length - 1;
    capIndexController.setValue(settings.selectedCapIndex);
    capIndexController.max(capArray.length - 1);
    renderHtmlCapsUI();
    updateAndFocus(capArray[capArray.length - 1]);
    if (settings.enableDebugLogging) console.log('Added new cap:', newCap);
});

function renderHtmlCapsUI() {
    capsContainer.innerHTML = '';
    capArray.forEach((cap, index) => {
        const capUi = capTemplate.content.cloneNode(true).firstElementChild;
        capUi.querySelector('.cap-title').textContent = `Cap ${index + 1}`;
        capUi.dataset.index = index;
        const controlsMap = [
            { prop: 'x', type: 'range', min: -sphereRadius, max: sphereRadius, step: 1 },
            { prop: 'y', type: 'range', min: -sphereRadius, max: sphereRadius, step: 1 },
            { prop: 'h', type: 'range', min: 0, max: 100, step: 1 },
            { prop: 'size', type: 'range', min: 0.1, max: 5, step: 0.1 },
            { prop: 'xScaler', type: 'select', options: xyScalerLabels },
            { prop: 'yScaler', type: 'select', options: xyScalerLabels },
            { prop: 'hScaler', type: 'select', options: xyScalerLabels },
            { prop: 'sizeScaler', type: 'select', options: sizeScalerLabels },
            { prop: 'direction', type: 'select', options: directions },
        ];
        controlsMap.forEach(({prop, type, min, max, step, options}) => {
            const el = capUi.querySelector(`[data-property="${prop}"]`);
            if (type === 'range') {
                el.min = min; el.max = max; el.step = step; el.value = cap[prop];
                const valueDisplay = el.previousElementSibling.querySelector('.value-display');
                if(valueDisplay) valueDisplay.textContent = el.value;
                el.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    cap[prop] = settings.enableValidation ? Math.max(min, Math.min(max, value)) : value;
                    e.target.value = cap[prop];
                    if(valueDisplay) valueDisplay.textContent = e.target.value;
                    updateAndFocus(cap);
                    if (settings.enableDebugLogging) console.log(`Updated cap ${index + 1} ${prop}:`, cap[prop]);
                });
            } else if (type === 'select') {
                const source = Array.isArray(options) ? options : Object.keys(options);
                source.forEach(key => {
                    const value = Array.isArray(options) ? key : options[key];
                    const option = new Option(key, value);
                    el.add(option);
                });
                el.value = cap[prop];
                el.addEventListener('change', (e) => {
                    cap[prop] = Array.isArray(options) ? e.target.value : parseInt(e.target.value);
                    updateAndFocus(cap);
                    if (settings.enableDebugLogging) console.log(`Updated cap ${index + 1} ${prop}:`, cap[prop]);
                });
            }
        });
        capUi.querySelector('.remove-cap-btn').addEventListener('click', () => {
            if (cap.mesh) earthGroup.remove(cap.mesh);
            if (settings.enableDebugLogging) console.log(`Removing cap ${index + 1}:`, cap);
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
    datGuiContainer.classList.toggle('hidden');
    htmlControlsContainer.classList.toggle('hidden');
}
toggleToDatGuiBtn.addEventListener('click', toggleControlPanel);

// Deployment type
document.getElementById('deployment-type').addEventListener('change', (e) => {
    deploymentType = e.target.value;
    ['single-band', 'single-tier', 'multi-tier'].forEach(type => document.getElementById(`${type}-controls`).classList.toggle('hidden', type !== deploymentType));
});

// Color pallet
document.getElementById('color-pallet-trigger').addEventListener('click', () => {
    const panel = document.getElementById('color-pallet-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        const elements = ['Earth', 'Caps', 'Stars', 'Moon'];
        const newer = document.getElementById('newer-colors');
        const older = document.getElementById('older-colors');
        newer.innerHTML = older.innerHTML = elements.map(el => `
            <div class="color-item">
                <span>${el}</span>
                <input type="color" class="newer" value="#ffffff">
                <input type="color" class="older" value="#ffffff">
            </div>
        `).join('');
        document.querySelectorAll('.color-item input').forEach(input => {
            input.addEventListener('change', (e) => {
                const item = e.target.closest('.color-item');
                const olderInput = item.querySelector('.older');
                if (e.target.classList.contains('newer')) olderInput.value = e.target.value;
            });
        });
    }
});

document.getElementById('revert-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        newer.value = newer.nextElementSibling.value;
    });
});

document.getElementById('randomize-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .older').forEach(older => {
        older.value = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    });
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        newer.value = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    });
});

document.getElementById('save-colors').addEventListener('click', () => {
    document.getElementById('color-pallet-panel').classList.add('hidden');
});

document.getElementById('discard-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        newer.value = newer.nextElementSibling.value;
    });
    document.getElementById('color-pallet-panel').classList.add('hidden');
});

// Toggles
document.getElementById('optics-toggle').addEventListener('change', (e) => {
    document.getElementById('optic-management').classList.toggle('hidden', !e.target.checked);
    if (e.target.checked) updateOptics();
});
document.getElementById('file-toggle').addEventListener('change', (e) => {
    document.getElementById('file-management').classList.toggle('hidden', !e.target.checked);
});
document.getElementById('rotation-toggle').addEventListener('change', (e) => {
    settings.rotateSphere = e.target.checked;
});
document.getElementById('wireframe-toggle').addEventListener('change', updateOptics);
document.getElementById('moon-toggle').addEventListener('change', (e) => {
    moon.visible = e.target.checked;
});
document.getElementById('orbit-toggle').addEventListener('change', (e) => {
    // Option: Animate moon orbit
});
document.getElementById('stars-toggle').addEventListener('change', (e) => {
    starMesh.visible = e.target.checked;
});
document.getElementById('contrast-toggle').addEventListener('change', (e) => {
    // Option: Adjust material emissive
});
document.getElementById('reset-view').addEventListener('click', resetCameraToDefault);
document.getElementById('maintain-focus').addEventListener('change', (e) => {
    if (e.target.checked) {
        document.getElementById('ortho-focus').checked = false;
        document.getElementById('binary-focus').checked = false;
        const cap = capArray[settings.selectedCapIndex] || {};
        const { x, y, z } = latLonToXY(...Object.values(xyToLatLon(cap.x, cap.y)));
        controls.target.set(x, y, z);
        controls.update();
    }
});
document.getElementById('ortho-focus').addEventListener('change', (e) => {
    if (e.target.checked) {
        document.getElementById('maintain-focus').checked = false;
        document.getElementById('binary-focus').checked = false;
        settings.toggleCamera();
    }
});
document.getElementById('binary-focus').addEventListener('change', (e) => {
    if (e.target.checked) {
        document.getElementById('maintain-focus').checked = false;
        document.getElementById('ortho-focus').checked = false;
        // Option: Focus between Earth/moon or caps
    }
});
document.getElementById('deploy-view').addEventListener('change', updateCapView);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = Date.now() * 0.0001;
    if (settings.rotateSphere) {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.25);
        earthMesh.quaternion.copy(rotationQuaternion);
        cloudMesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.28));
    }
    capArray.forEach(cap => {
        if (cap.mesh) {
            const { lat, lon } = xyToLatLon(cap.x * xyScalers[cap.xScaler], cap.y * xyScalers[cap.yScaler]);
            const positionVector = new THREE.Vector3(...Object.values(latLonToXY(lat, lon))).normalize();
            const scaledHeight = cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
            cap.mesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));
            const upVector = new THREE.Vector3(0, 1, 0);
            cap.mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(upVector, positionVector));
            const scale = 1 + 0.05 * Math.sin(elapsedTime * 2); // Pulse effect
            cap.mesh.scale.set(scale, scale, scale);
        }
    });
    controls.update();
    renderer.render(scene, camera);
}

// Resize handler
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
window.addEventListener('resize', onWindowResize);

// Initialize
scene.background = null;
resetCameraToDefault();
renderHtmlCapsUI();
renderCityKey();
capArray.forEach(createCap);
if (capArray[0]) focusCameraOnCap(capArray[0]);
updateCameraControls();
setInterval(() => localStorage.setItem('capArray', JSON.stringify(capArray)), 30000);
animate();
