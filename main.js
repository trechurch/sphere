// --- Basic Scene Setup ---
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js';

const sphereRadius = 6371; // Earth's radius in km
let scene, camera, renderer, controls, earthMesh, cloudMesh, raycaster, mouse, cameraHelper;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// [No change] Raycaster and mouse for picking
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();

// [No change] Camera helper for debugging
cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);

// [No change] TextureLoader
const textureLoader = new THREE.TextureLoader();

// --- 3D Object Creation ---
// [No change] Galaxy starfield
const starGeometry = new THREE.SphereGeometry(150000, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load('texture/galaxy.png'), side: THREE.BackSide });
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starMesh);

// [No change] Earth mesh
const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({ map: textureLoader.load('texture/earthmap1k.jpg'), bumpMap: textureLoader.load('texture/earthbump.jpg'), bumpScale: 0.5 });
earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.set(0, 0, 0);
earthGroup.add(earthMesh);

// [No change] Cloud mesh
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64);
const cloudMaterial = new THREE.MeshPhongMaterial({ map: textureLoader.load('texture/earthCloud.png'), transparent: true, opacity: 0.8 });
cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(cloudMesh);

// --- Lighting ---
// [No change] Ambient and directional lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000);
scene.add(sunLight);

// --- Camera and Controls ---
// [Addition] Enhanced camera controls for granular inspection
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
const fovInRadians = camera.fov * (Math.PI / 180);
controls.maxDistance = (16 * sphereRadius) / Math.tan(fovInRadians / 2);
controls.rotateSpeed = 0.5;
controls.enablePan = true; // [Alteration] Enable panning for better inspection
controls.enableZoom = true;
controls.target.set(0, 0, 0);

// --- Data and State Management ---
// [Addition] City key data
const cityKey = [
    { name: "Houston, TX", lat: 29.76, lon: -95.36 },
    { name: "New York, NY", lat: 40.71, lon: -74.01 },
    { name: "London, UK", lat: 51.51, lon: -0.13 },
    { name: "Tokyo, JP", lat: 35.68, lon: 139.76 },
    { name: "Sydney, AU", lat: -33.87, lon: 151.21 }
];

// [No change] Settings object
const settings = {
    backgroundColor: "#000000",
    rotateSphere: true,
    preserveTarget: false,
    pickCap: false,
    selectedCapIndex: 0,
    useOrthographic: false,
    resetCamera: () => { resetCameraToDefault(); },
    toggleUI: () => toggleControlPanel(),
    toggleCamera: () => { settings.useOrthographic = !settings.useOrthographic; updateCamera(); }
};

// [No change] Camera update function
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

// [No change] Coordinate conversion functions
function latLonToXY(lat, lon) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const x = sphereRadius * Math.cos(latRad) * Math.sin(lonRad);
    const y = sphereRadius * Math.sin(latRad);
    const z = sphereRadius * Math.cos(latRad) * Math.cos(lonRad);
    return { x, y, z };
}

// [No change] XY to LatLon conversion
function xyToLatLon(x, y) {
    const r = Math.sqrt(x * x + y * y);
    const lat = Math.asin(y / sphereRadius) * (180 / Math.PI);
    const lon = Math.atan2(x, r * Math.cos(Math.asin(y / sphereRadius))) * (180 / Math.PI);
    return { lat, lon };
}

// [Alteration] Initial cap at Houston with stacking support
const houstonCoords = latLonToXY(29.76, -95.36);
let caps = [{
    x: houstonCoords.x, y: houstonCoords.y, z: houstonCoords.z, h: 1, size: 2, direction: "NW",
    xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null
}];

// [No change] Scalers and directions
const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.05, 0.1, 0.2, 0.5, 1];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
    "N": 0xff0000, "NE": 0xffa500, "E": 0xffff00, "SE": 0x00ff00,
    "S": 0x00ffff, "SW": 0x0000ff, "W": 0x800080, "NW": 0xff00ff
};
const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { "Tiny": 0, "Small": 1, "Medium": 2, "Large": 3, "Huge": 4 };

// [Addition] Cap stacking and merging logic
function getStackedHeight(x, y, z) {
    const existingCaps = caps.filter(cap => 
        Math.abs(cap.x - x) < 1e-3 && 
        Math.abs(cap.y - y) < 1e-3 && 
        Math.abs(cap.z - z) < 1e-3
    );
    return existingCaps.length * 10; // Stack by incrementing height by 10 units
}

// [Addition] Check for mergeable caps
function checkAndMergeCaps(newCap) {
    const mergeableCaps = caps.filter(cap => 
        cap !== newCap && 
        cap.h === newCap.h && 
        Math.abs(cap.x - newCap.x) < 500 * cap.size * sizeScalers[cap.sizeScaler]
    );
    if (mergeableCaps.length > 0) {
        const mergedSize = Math.max(newCap.size, ...mergeableCaps.map(cap => cap.size));
        newCap.size = mergedSize * 1.1; // Slightly larger to cover merged caps
        mergeableCaps.forEach(cap => {
            if (cap.mesh) earthGroup.remove(cap.mesh);
            caps.splice(caps.indexOf(cap), 1);
        });
    }
}

// --- Core 3D and UI Functions ---
// [No change] Reset camera
function resetCameraToDefault() {
    camera.position.set(0, 0, sphereRadius * 3);
    controls.target.set(0, 0, 0);
    controls.update();
}

// [No change] Focus on cap
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

// [Alteration] Create cap with stacking and merging
function createCap(cap) {
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

    capMesh.add(capMeshMain);
    capMesh.add(directionMesh);
    capMesh.quaternion.copy(quaternion);

    capMesh.userData.size = cap.size * sizeScalers[cap.sizeScaler];
    capMesh.userData.originalPosition = { x: cap.x, y: cap.y, h: cap.h, z: cap.z };
    cap.mesh = capMesh;
    earthGroup.add(capMesh);

    checkAndMergeCaps(cap); // [Addition] Check for merging after creation
}

// [No change] Update and focus cap
function updateAndFocus(cap) {
    createCap(cap);
    focusCameraOnCap(cap);
}

// [No change] Mouse click handling
function onMouseClick(event) {
    if (!settings.pickCap) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earthMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const selectedCap = caps[settings.selectedCapIndex];
        if (selectedCap) {
            selectedCap.x = point.x;
            selectedCap.y = point.y;
            selectedCap.z = point.z;
            selectedCap.h = getStackedHeight(point.x, point.y, point.z);
            updateAndFocus(selectedCap);
            renderHtmlCapsUI();
        }
    }
}
document.addEventListener('click', onMouseClick);

// --- UI Panel Initialization and Binding ---
// [No change] DOM elements
const datGuiContainer = document.getElementById('dat-gui-container');
const htmlControlsContainer = document.getElementById('html-controls');
const toggleToDatGuiBtn = document.getElementById('toggle-to-dat-gui');
const capsContainer = document.getElementById('caps-container');
const capTemplate = document.getElementById('cap-template');

const gui = new GUI({ autoPlace: false });
datGuiContainer.appendChild(gui.domElement);
datGuiContainer.classList.add('controls');
gui.addColor(settings, "backgroundColor").onChange(v => scene.background = new THREE.Color(v));
gui.add(settings, "rotateSphere").name("Rotate Earth").onChange(v => settings.rotateSphere = v);
gui.add(settings, "preserveTarget").onChange(v => settings.preserveTarget = v);
gui.add(settings, "resetCamera").name("Reset Camera");
gui.add(settings, "pickCap").name("Pick Cap Location").onChange(v => settings.pickCap = v);
gui.add(settings, "useOrthographic").name("Use Orthographic Camera").onChange(v => settings.toggleCamera());
const capIndexController = gui.add(settings, "selectedCapIndex", 0, Math.max(0, caps.length - 1)).name("Select Cap").step(1)
    .onChange(v => {
        settings.selectedCapIndex = Math.floor(v);
        if (caps[settings.selectedCapIndex]) focusCameraOnCap(caps[settings.selectedCapIndex]);
    });
gui.add(settings, 'toggleUI').name('Switch to HTML UI');

// [Addition] City key rendering
function renderCityKey() {
    const cityKeyContainer = document.getElementById('city-key');
    cityKeyContainer.innerHTML = '';
    cityKey.forEach(city => {
        const cityDiv = document.createElement('div');
        cityDiv.className = 'control-row';
        cityDiv.innerHTML = `<label>${city.name}: (${city.lat.toFixed(2)}, ${city.lon.toFixed(2)})</label>`;
        cityDiv.addEventListener('click', () => {
            const coords = latLonToXY(city.lat, city.lon);
            caps.push({
                x: coords.x, y: coords.y, z: coords.z, h: getStackedHeight(coords.x, coords.y, coords.z),
                size: 2, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null
            });
            settings.selectedCapIndex = caps.length - 1;
            capIndexController.setValue(settings.selectedCapIndex);
            capIndexController.max(caps.length - 1);
            renderHtmlCapsUI();
            updateAndFocus(caps[caps.length - 1]);
        });
        cityKeyContainer.appendChild(cityDiv);
    });
}

// [Addition] File interface
document.getElementById('save-caps-btn').addEventListener('click', () => {
    const data = JSON.stringify(caps.map(cap => ({
        x: cap.x, y: cap.y, z: cap.z, h: cap.h, size: cap.size, direction: cap.direction,
        xScaler: cap.xScaler, yScaler: cap.yScaler, hScaler: cap.hScaler, sizeScaler: cap.sizeScaler
    })));
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'caps.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('load-caps-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const loadedCaps = JSON.parse(event.target.result);
            caps.forEach(cap => { if (cap.mesh) earthGroup.remove(cap.mesh); });
            caps = loadedCaps.map(cap => ({ ...cap, mesh: null }));
            settings.selectedCapIndex = 0;
            capIndexController.setValue(0);
            capIndexController.max(caps.length - 1);
            renderHtmlCapsUI();
            caps.forEach(createCap);
            if (caps[0]) focusCameraOnCap(caps[0]);
        };
        reader.readAsText(file);
    }
});

// [No change] HTML UI setup
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
    if (caps[settings.selectedCapIndex]) focusCameraOnCap(caps[settings.selectedCapIndex]);
});

function updateCapSelectDropdown() {
    selectCapDropdown.innerHTML = '';
    caps.forEach((_, index) => {
        const option = new Option(`Cap ${index + 1}`, index);
        selectCapDropdown.add(option);
    });
    selectCapDropdown.value = settings.selectedCapIndex;
}

// [Alteration] Add new cap at Houston with stacking
document.getElementById('add-cap-btn').addEventListener('click', () => {
    const newCap = {
        x: houstonCoords.x, y: houstonCoords.y, z: houstonCoords.z,
        h: getStackedHeight(houstonCoords.x, houstonCoords.y, houstonCoords.z),
        size: 2, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 0, sizeScaler: 2, mesh: null
    };
    caps.push(newCap);
    settings.selectedCapIndex = caps.length - 1;
    capIndexController.setValue(settings.selectedCapIndex);
    capIndexController.max(caps.length - 1);
    renderHtmlCapsUI();
    updateAndFocus(caps[caps.length - 1]);
});

function renderHtmlCapsUI() {
    capsContainer.innerHTML = '';
    caps.forEach((cap, index) => {
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
                    cap[prop] = parseFloat(e.target.value);
                    if(valueDisplay) valueDisplay.textContent = e.target.value;
                    updateAndFocus(cap);
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
                });
            }
        });

        capUi.querySelector('.remove-cap-btn').addEventListener('click', () => {
            if (cap.mesh) earthGroup.remove(cap.mesh);
            caps.splice(index, 1);
            if (settings.selectedCapIndex >= caps.length) {
                settings.selectedCapIndex = Math.max(0, caps.length - 1);
                capIndexController.setValue(settings.selectedCapIndex);
            }
            capIndexController.max(Math.max(0, caps.length - 1));
            renderHtmlCapsUI();
            if (caps.length > 0 && caps[settings.selectedCapIndex]) {
                focusCameraOnCap(caps[settings.selectedCapIndex]);
            } else {
                resetCameraToDefault();
            }
        });

        capsContainer.appendChild(capUi);
    });
    updateCapSelectDropdown();
}

// [No change] Toggle control panel
function toggleControlPanel() {
    datGuiContainer.classList.toggle('hidden');
    htmlControlsContainer.classList.toggle('hidden');
}
toggleToDatGuiBtn.addEventListener('click', toggleControlPanel);

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = Date.now() * 0.0001;

    if (settings.rotateSphere) {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.25);
        earthMesh.quaternion.copy(rotationQuaternion);
        cloudMesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.28));
    }

    caps.forEach(cap => {
        if (cap.mesh) {
            const { lat, lon } = xyToLatLon(cap.x * xyScalers[cap.xScaler], cap.y * xyScalers[cap.yScaler]);
            const positionVector = new THREE.Vector3(...Object.values(latLonToXY(lat, lon))).normalize();
            const scaledHeight = cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
            cap.mesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));
            const upVector = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector);
            cap.mesh.quaternion.copy(quaternion);
        }
    });

    controls.update();
    renderer.render(scene, camera);
}

// --- Initialization ---
scene.background = null;
resetCameraToDefault();
renderHtmlCapsUI();
renderCityKey(); // [Addition] Initialize city key
caps.forEach(createCap);
focusCameraOnCap(caps[0]);
animate();

// [No change] Resize handler
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    if (settings.useOrthographic) {
        camera.left = window.innerWidth / -2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = window.innerHeight / -2;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});