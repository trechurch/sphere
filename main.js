// --- Basic Scene Setup ---
const sphereRadius = 6371; // Earth's radius in km
let scene, camera, renderer, controls, earthMesh, cloudMesh, raycaster, mouse;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Initialize raycaster and mouse for picking
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();

// Use a TextureLoader for all textures
const textureLoader = new THREE.TextureLoader();

// --- 3D Object Creation ---

// Galaxy starfield
const starGeometry = new THREE.SphereGeometry(150000, 64, 64);
const starMaterial = new THREE.MeshBasicMaterial({
    map: textureLoader.load('texture/galaxy.png'),
    side: THREE.BackSide
});
const starMesh = new THREE.Mesh(starGeometry, starMaterial);
scene.add(starMesh);

// Earth mesh
const earthGeometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('texture/earthmap1k.jpg'),
    bumpMap: textureLoader.load('texture/earthbump.jpg'),
    bumpScale: 0.5
});
earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earthMesh);

// Cloud mesh
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64);
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('texture/earthCloud.png'),
    transparent: true,
    opacity: 0.8
});
cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(cloudMesh);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000);
scene.add(sunLight);

// --- Camera and Controls ---
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
const fovInRadians = camera.fov * (Math.PI / 180);
controls.maxDistance = (16 * sphereRadius) / Math.tan(fovInRadians / 2);
controls.rotateSpeed = 0.5;
controls.enablePan = false;

// --- Data and State Management ---
const settings = {
    backgroundColor: "#000000",
    rotateSphere: true,
    preserveTarget: false,
    pickCap: false,
    selectedCapIndex: 0,
    resetCamera: () => {
        resetCameraToDefault();
    },
    toggleUI: () => toggleControlPanel()
};

function latLonToXY(lat, lon) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const y = sphereRadius * Math.sin(latRad);
    const x = sphereRadius * Math.cos(latRad) * Math.sin(lonRad);
    const z = sphereRadius * Math.cos(latRad) * Math.cos(lonRad);
    return { x, y, z };
}

const houstonCoords = latLonToXY(29.76, -95.36);
let caps = [{
    x: houstonCoords.x, y: houstonCoords.y, z: 0, size: 2, direction: "N",
    xScaler: 4, yScaler: 4, zScaler: 0, sizeScaler: 2, mesh: null,
}];

const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.0028, 0.0088, 0.028, 0.396, 0.992];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
    "N": 0xff0000, "NE": 0xffa500, "E": 0xffff00, "SE": 0x00ff00,
    "S": 0x00ffff, "SW": 0x0000ff, "W": 0x800080, "NW": 0xff00ff
};

const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { "Neighborhood": 0, "Small Town": 1, "Large City": 2, "State": 3, "Continent": 4 };

// --- Core 3D and UI Functions ---
function resetCameraToDefault() {
    camera.position.set(0, 0, sphereRadius * 3);
    controls.target.set(0, 0, 0); // Always reset to Earth's center
    controls.update();
}

function focusCameraOnCap(cap) {
    if (!cap.mesh) return;
    const capPosition = new THREE.Vector3();
    cap.mesh.getWorldPosition(capPosition);
    const camDistance = sphereRadius * 3;
    const cameraPosition = capPosition.clone().normalize().multiplyScalar(sphereRadius + camDistance);
    camera.position.copy(cameraPosition);
    controls.target.copy(capPosition);
    controls.update();
}

function createCap(cap) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const positionVector = new THREE.Vector3(cap.x, cap.y, cap.z).normalize();
    const scaledHeight = cap.z * xyScalers[cap.zScaler];
    const scaledSize = cap.size * sizeScalers[cap.sizeScaler];

    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector);

    const capMesh = new THREE.Group();
    capMesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));

    const capGeo = new THREE.SphereGeometry(100 * scaledSize, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capEdges = new THREE.EdgesGeometry(capGeo);
    
    const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
    const capMat = new THREE.LineBasicMaterial({ 
        color: directionColors[cap.direction] || 0xff0000, 
        transparent: true, 
        opacity: 0.9 
    });
    const capLines = new THREE.LineSegments(capEdges, capMat);
    
    const directionGeo = new THREE.SphereGeometry(100 * scaledSize, 32, 16, 
        directionAngle - Math.PI/8, Math.PI/4, 0, Math.PI / 2);
    const directionMat = new THREE.MeshBasicMaterial({
        color: directionColors[cap.direction] || 0xff0000,
        transparent: true,
        opacity: 0.7
    });
    const directionMesh = new THREE.Mesh(directionGeo, directionMat);
    
    capMesh.add(capLines);
    capMesh.add(directionMesh);
    capMesh.quaternion.copy(quaternion);
    
    capMesh.userData.size = scaledSize;
    capMesh.userData.originalPosition = { x: cap.x, y: cap.y, z: cap.z };
    cap.mesh = capMesh;
    earthGroup.add(capMesh);
}

function updateAndFocus(cap) {
    createCap(cap);
    focusCameraOnCap(cap);
}

// --- Mouse Click Handling for Cap Placement ---
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
            updateAndFocus(selectedCap);
            renderHtmlCapsUI();
        }
    }
}

document.addEventListener('click', onMouseClick);

// --- UI Panel Initialization and Binding ---
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
        selectCapDropdow
n.add(option);
    });
    selectCapDropdown.value = settings.selectedCapIndex;
}

document.getElementById('add-cap-btn').addEventListener('click', () => {
    caps.push({
        x: (Math.random() - 0.5) * 8000, y: (Math.random() - 0.5) * 8000, z: 0, size: 1, direction: "N",
        xScaler: 4, yScaler: 4, zScaler: 0, sizeScaler: 1, mesh: null,
    });
    settings.selectedCapIndex = caps.length - 1;
    capIndexController.setValue(settings.selectedCapIndex);
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
            { prop: 'z', type: 'range', min: 0, max: 100, step: 1 },
            { prop: 'size', type: 'range', min: 0.1, max: 5, step: 0.1 },
            { prop: 'xScaler', type: 'select', options: xyScalerLabels },
            { prop: 'yScaler', type: 'select', options: xyScalerLabels },
            { prop: 'zScaler', type: 'select', options: xyScalerLabels },
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

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = Date.now() * 0.0001;

    if (settings.rotateSphere) {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.25);
        earthMesh.quaternion.copy(rotationQuaternion);
        cloudMesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.28));

        caps.forEach(cap => {
            if (cap.mesh) {
                const originalPos = new THREE.Vector3(cap.x, cap.y, cap.z).normalize();
                const rotatedPos = originalPos.clone().applyQuaternion(rotationQuaternion);
                const scaledHeight = cap.z * xyScalers[cap.zScaler];
                cap.mesh.position.copy(rotatedPos.multiplyScalar(sphereRadius + scaledHeight));
                const upVector = new THREE.Vector3(0, 1, 0);
                const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, rotatedPos.normalize());
                cap.mesh.quaternion.copy(quaternion);
            }
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

// Set initial state
scene.background = null;
resetCameraToDefault();
renderHtmlCapsUI();
caps.forEach(createCap);
focusCameraOnCap(caps[0]);
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});