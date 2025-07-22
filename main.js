import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';

const sphereRadius = 6371; // Earth's radius in km
let scene, camera, renderer, controls, earthMesh, cloudMesh, raycaster, mouse, cameraHelper;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const earthGroup = new THREE.Group();
scene.add(earthGroup);

raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);

const textureLoader = new THREE.TextureLoader();

// Starfield
const starGeometry = new THREE.SphereGeometry(150000, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({ map: textureLoader.load('texture/galaxy.png'), side: THREE.BackSide });
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starMesh);

// Earth mesh
const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({ map: textureLoader.load('texture/earthmap1k.jpg'), bumpMap: textureLoader.load('texture/earthbump.jpg'), bumpScale: 0.5 });
earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.position.set(0, 0, 0);
earthGroup.add(earthMesh);

// Cloud mesh
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64);
const cloudMaterial = new THREE.MeshPhongMaterial({ map: textureLoader.load('texture/earthCloud.png'), transparent: true, opacity: 0.8 });
cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(cloudMesh);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000);
scene.add(sunLight);

// Camera controls
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
const fovInRadians = camera.fov * (Math.PI / 180);
controls.maxDistance = (16 * sphereRadius) / Math.tan(fovInRadians / 2);
controls.rotateSpeed = 0.5;
controls.enablePan = false;
controls.target.set(0, 0, 0);

// Settings
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

function latLonToVector3(lat, lon, height = 0) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const radius = sphereRadius + height;
    const x = radius * Math.cos(latRad) * Math.sin(lonRad);
    const y = radius * Math.sin(latRad);
    const z = radius * Math.cos(latRad) * Math.cos(lonRad);
    return new THREE.Vector3(x, y, z);
}

function vector3ToLatLon(vector) {
    const r = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    const lat = Math.asin(vector.y / r) * (180 / Math.PI);
    const lon = Math.atan2(vector.x, vector.z) * (180 / Math.PI);
    return { lat, lon };
}

// Initial cap at Houston, Texas
const houstonCoords = { lat: 29.76, lon: -95.36 };
let caps = [{
    lat: houstonCoords.lat, lon: houstonCoords.lon, h: 0, size: 0.1, direction: "N",
    xScaler: 4, yScaler: 4, hScaler: 4, sizeScaler: 2, mesh: null,
}];

// Color cycle for caps
const capColors = [
    0xff0000, // Red
    0x00ff00, // Green
    0x0000ff, // Blue
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff, // Cyan
];

const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.05, 0.1, 0.2, 0.5, 1];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
    "N": 0xffffff, "NE": 0xffffff, "E": 0xffffff, "SE": 0xffffff,
    "S": 0xffffff, "SW": 0xffffff, "W": 0xffffff, "NW": 0xffffff
};
const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { "Tiny": 0, "Small": 1, "Medium": 2, "Large": 3, "Huge": 4 };

function resetCameraToDefault() {
    camera.position.set(0, 0, sphereRadius * 3);
    controls.target.set(0, 0, 0);
    controls.update();
}

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

function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];
    const positionVector = latLonToVector3(cap.lat * xyScalers[cap.xScaler], cap.lon * xyScalers[cap.yScaler], scaledHeight);
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector.clone().normalize());

    const capMesh = new THREE.Group();
    capMesh.position.copy(positionVector);

    // Spherical cap with same curvature as Earth
    const capRadius = sphereRadius + scaledHeight;
    const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
    const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    const capMeshMain = new THREE.Mesh(capGeo, capMat);

    // Directional indicator
    const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
    const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1); // Slightly larger
    const directionMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction],
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    const directionMesh = new THREE.Mesh(directionGeo, directionMat);

    capMesh.add(capMeshMain);
    capMesh.add(directionMesh);
    capMesh.quaternion.copy(quaternion);

    capMesh.userData.size = cap.size * sizeScalers[cap.sizeScaler];
    capMesh.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capMesh;
    earthGroup.add(capMesh);
}

function updateCap(cap, index) {
    createCap(cap, index);
}

function updateAndFocus(cap, index, forceFocus = false) {
    const oldLat = cap.mesh?.userData.originalPosition.lat || cap.lat;
    const oldLon = cap.mesh?.userData.originalPosition.lon || cap.lon;
    updateCap(cap, index);
    if (forceFocus || Math.abs(cap.lat - oldLat) > 0.1 || Math.abs(cap.lon - oldLon) > 0.1) {
        focusCameraOnCap(cap);
    }
}

function onMouseClick(event) {
    if (!settings.pickCap) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(earthMesh);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        const { lat, lon } = vector3ToLatLon(point);
        const selectedCap = caps[settings.selectedCapIndex];
        if (selectedCap) {
            selectedCap.lat = lat;
            selectedCap.lon = lon;
            selectedCap.h = 0;
            updateAndFocus(selectedCap, settings.selectedCapIndex, true);
            renderHtmlCapsUI();
        }
    }
}
document.addEventListener('click', onMouseClick);

// UI elements
try {
    const datGuiContainer = document.getElementById('dat-gui-container');
    const htmlControlsContainer = document.getElementById('html-controls');
    const toggleToDatGuiBtn = document.getElementById('toggle-to-dat-gui');
    const capsContainer = document.getElementById('caps-container');
    const capTemplate = document.getElementById('cap-template');

    if (!GUI) {
        console.error('dat.gui failed to load. Please check the CDN or import map.');
        throw new Error('dat.gui not available');
    }

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

    htmlControlsContainer.classList.add('controls');
    document.getElementById('bg-color').addEventListener('input', (e) => {
        scene.background = e.target.value === '#000000' ? null : new THREE.Color(e.target.value);
    });
    document.getElementById('rotate-sphere').addEventListener('change', (e) => settings.rotateSphere = e.target.checked);
    document.getElementById('rotate-sphere').checked = settings.rotateSphere;
    document.getElementById('preserve-target').addEventListener('change', (e) => settings.preserveTarget = e.target.checked);
    document.getElementById('reset-camera-btn').addEventListener('click', () => {
        resetCameraToDefault();
    });

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

    document.getElementById('add-cap-btn').addEventListener('click', () => {
        const existingCaps = caps.filter(cap => Math.abs(cap.lat - houstonCoords.lat) < 0.01 && Math.abs(cap.lon - houstonCoords.lon) < 0.01);
        const maxHeight = existingCaps.length > 0 ? Math.max(...existingCaps.map(cap => cap.h * xyScalers[cap.hScaler])) : 0;
        const newHeight = maxHeight + 10;
        caps.push({
            lat: houstonCoords.lat, lon: houstonCoords.lon, h: newHeight, size: 0.1, direction: "N",
            xScaler: 4, yScaler: 4, hScaler: 4, sizeScaler: 2, mesh: null,
        });
        settings.selectedCapIndex = caps.length - 1;
        capIndexController.setValue(settings.selectedCapIndex);
        capIndexController.max(caps.length - 1);
        renderHtmlCapsUI();
        updateAndFocus(caps[caps.length - 1], caps.length - 1, true);
    });

    function renderHtmlCapsUI() {
        capsContainer.innerHTML = '';
        caps.forEach((cap, index) => {
            const capUi = capTemplate.content.cloneNode(true).firstElementChild;
            capUi.querySelector('.cap-title').textContent = `Cap ${index + 1}`;
            capUi.dataset.index = index;

            const controlsMap = [
                { prop: 'lat', type: 'range', min: -90, max: 90, step: 0.1 },
                { prop: 'lon', type: 'range', min: -180, max: 180, step: 0.1 },
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
                if (!el) {
                    console.error(`Element for property ${prop} not found in cap UI`);
                    return;
                }
                if (type === 'range') {
                    el.min = min;
                    el.max = max;
                    el.step = step;
                    el.value = Math.max(min, Math.min(max, cap[prop])); // Constrain h >= 0
                    const valueDisplay = el.previousElementSibling?.querySelector('.value-display');
                    if (valueDisplay) valueDisplay.textContent = el.value;
                    el.addEventListener('input', (e) => {
                        cap[prop] = parseFloat(e.target.value);
                        if (valueDisplay) valueDisplay.textContent = e.target.value;
                        updateAndFocus(cap, index);
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
                        updateAndFocus(cap, index);
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

    function toggleControlPanel() {
        datGuiContainer.classList.toggle('hidden');
        htmlControlsContainer.classList.toggle('hidden');
    }
    toggleToDatGuiBtn.addEventListener('click', toggleControlPanel);

    // Initialize UI
    scene.background = null;
    resetCameraToDefault();
    renderHtmlCapsUI();
    caps.forEach((cap, index) => updateCap(cap, index));
    focusCameraOnCap(caps[0]);
} catch (e) {
    console.error('Error initializing UI:', e);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = Date.now() * 0.0001;

    if (settings.rotateSphere) {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.25);
        earthMesh.quaternion.copy(rotationQuaternion);
        cloudMesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.28));
        caps.forEach((cap, index) => {
            if (cap.mesh) {
                const scaledHeight = cap.h * xyScalers[cap.hScaler];
                const positionVector = latLonToVector3(cap.lat * xyScalers[cap.xScaler], cap.lon * xyScalers[cap.yScaler], scaledHeight);
                cap.mesh.position.copy(positionVector);
                const upVector = new THREE.Vector3(0, 1, 0);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector.clone().normalize());
                cap.mesh.quaternion.copy(quaternion);
            }
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// Resize handler
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