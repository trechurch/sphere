// --- Basic Scene Setup ---
const sphereRadius = 6371; // Earth's radius in km
let scene, camera, renderer, controls, earthMesh, cloudMesh;

scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200000); // Increased far plane for starfield
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Use a TextureLoader for all textures
const textureLoader = new THREE.TextureLoader();

// --- 3D Object Creation ---

// Galaxy starfield
const starGeometry = new THREE.SphereGeometry(150000, 64, 64); // A very large sphere
const starMaterial = new THREE.MeshBasicMaterial({
    map: textureLoader.load('texture/galaxy.png'),
    side: THREE.BackSide // Render on the inside of the sphere
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
const cloudGeometry = new THREE.SphereGeometry(sphereRadius + 15, 64, 64); // Slightly larger than Earth
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('texture/earthCloud.png'),
    transparent: true,
    opacity: 0.8
});
cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(cloudMesh);


// --- Lighting ---

// Ambient light to softly illuminate the entire scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Directional light to simulate the Sun
const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(-15000, 5000, 10000); // Position the light source far away
scene.add(sunLight);


// --- Camera and Controls ---
controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Set camera zoom limits
controls.minDistance = sphereRadius + 100; // Stop just above the surface

// Calculate max distance for the Earth to be 1/16th of the view
const fovInRadians = camera.fov * (Math.PI / 180);
controls.maxDistance = (16 * sphereRadius) / Math.tan(fovInRadians / 2);


// --- Data and State Management ---
const settings = {
    backgroundColor: "#000000",
    rotateSphere: true, // Let's have it rotate by default
    preserveTarget: false,
    resetCamera: () => {
        if (caps.length > 0) focusCameraOnCap(caps[caps.length - 1]);
        else resetCameraToDefault();
    },
    toggleUI: () => toggleControlPanel()
};

function latLonToXY(lat, lon) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    const y = sphereRadius * Math.sin(latRad);
    const x = sphereRadius * Math.cos(latRad) * Math.sin(lonRad);
    return { x, y };
}

const houstonCoords = latLonToXY(29.76, -95.36);
let caps = [{
    x: houstonCoords.x, y: houstonCoords.y, z: 0, size: 2, direction: "N",
    xScaler: 4, yScaler: 4, zScaler: 0, sizeScaler: 2, mesh: null,
}];

const xyScalers = [0.1, 0.3, 0.5, 0.7, 1];
const sizeScalers = [0.00028, 0.00088, 0.0028, 0.0396, 0.992];
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const xyScalerLabels = { "0.1x": 0, "0.3x": 1, "0.5x": 2, "0.7x": 3, "1x": 4 };
const sizeScalerLabels = { "Neighborhood": 0, "Small Town": 1, "Large City": 2, "State": 3, "Continent": 4 };

// --- Core 3D and UI Functions ---
function resetCameraToDefault() {
    camera.position.set(0, 0, sphereRadius * 3);
    if (!settings.preserveTarget) controls.target.set(0, 0, 0);
    controls.update();
}

function focusCameraOnCap(cap) {
    if (!cap.mesh) return;
    const capPosition = new THREE.Vector3();
    cap.mesh.getWorldPosition(capPosition);
    const camDistance = cap.mesh.userData.size * sphereRadius * 3 + sphereRadius;
    const cameraPosition = capPosition.clone().normalize().multiplyScalar(sphereRadius + Math.max(camDistance, 500));
    camera.position.copy(cameraPosition);
    controls.target.copy(capPosition);
    controls.update();
}

function createCap(cap) {
    if (cap.mesh) earthGroup.remove(cap.mesh);
    const scaledX = cap.x * xyScalers[cap.xScaler];
    const scaledY = cap.y * xyScalers[cap.yScaler];
    const scaledHeight = Math.max(0, cap.z * xyScalers[cap.zScaler]);
    const scaledSize = Math.max(0.0001, cap.size * sizeScalers[cap.sizeScaler]);
    const positionVector = new THREE.Vector3(scaledX, scaledY, Math.sqrt(Math.max(0, sphereRadius * sphereRadius - scaledX * scaledX - scaledY * scaledY))).normalize();
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, positionVector);
    const capMesh = new THREE.Group();
    capMesh.position.copy(positionVector.multiplyScalar(sphereRadius));
    capMesh.quaternion.copy(quaternion);
    const capGeo = new THREE.SphereGeometry(sphereRadius + scaledHeight + 5, 32, 16, 0, Math.PI * 2, 0, scaledSize); // Elevated caps
    const capEdges = new THREE.EdgesGeometry(capGeo);
    const capMat = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.9 });
    const capLines = new THREE.LineSegments(capEdges, capMat);
    capMesh.add(capLines);
    capMesh.userData.size = scaledSize;
    cap.mesh = capMesh;
    earthGroup.add(capMesh);
}

function updateAndFocus(cap) {
    createCap(cap);
    focusCameraOnCap(cap);
}

// --- UI Panel Initialization and Binding ---

// Get references to all UI elements
const datGuiContainer = document.getElementById('dat-gui-container');
const htmlControlsContainer = document.getElementById('html-controls');
const toggleToDatGuiBtn = document.getElementById('toggle-to-dat-gui');
const capsContainer = document.getElementById('caps-container');
const capTemplate = document.getElementById('cap-template');

// 1. dat.GUI Setup
const gui = new dat.GUI({ autoPlace: false });
datGuiContainer.appendChild(gui.domElement);
datGuiContainer.classList.add('controls');
gui.addColor(settings, "backgroundColor").onChange(v => scene.background = new THREE.Color(v));
// The wireframe color controller is removed
gui.add(settings, "rotateSphere").name("Rotate Earth").onChange(v => settings.rotateSphere = v);
gui.add(settings, "resetCamera").name("Reset Camera");
gui.add(settings, "preserveTarget").onChange(v => settings.preserveTarget = v);
gui.add(settings, 'toggleUI').name('Switch to HTML UI');

// 2. HTML Controls Setup
htmlControlsContainer.classList.add('controls');
document.getElementById('bg-color').addEventListener('input', (e) => {
    // Setting background to null makes it transparent, showing the starfield
    scene.background = e.target.value === '#000000' ? null : new THREE.Color(e.target.value);
});
document.getElementById('rotate-sphere').addEventListener('change', (e) => settings.rotateSphere = e.target.checked);
document.getElementById('rotate-sphere').checked = settings.rotateSphere; // Set initial state
document.getElementById('preserve-target').addEventListener('change', (e) => settings.preserveTarget = e.target.checked);
document.getElementById('reset-camera-btn').addEventListener('click', settings.resetCamera);
document.getElementById('add-cap-btn').addEventListener('click', () => {
    caps.push({
        x: (Math.random() - 0.5) * 8000, y: (Math.random() - 0.5) * 8000, z: 0, size: 1, direction: "N",
        xScaler: 4, yScaler: 4, zScaler: 0, sizeScaler: 1, mesh: null,
    });
    renderHtmlCapsUI();
    updateAndFocus(caps[caps.length - 1]);
});

function renderHtmlCapsUI() {
    capsContainer.innerHTML = ''; // Clear existing controls
    caps.forEach((cap, index) => {
        const capUi = capTemplate.content.cloneNode(true).firstElementChild;
        capUi.querySelector('.cap-title').textContent = `Cap ${index + 1}`;
        capUi.dataset.index = index;

        // Populate and bind controls
        const controlsMap = [
            { prop: 'x', type: 'range', min: -sphereRadius, max: sphereRadius, step: 1 },
            { prop: 'y', type: 'range', min: -sphereRadius, max: sphereRadius, step: 1 },
            { prop: 'z', type: 'range', min: 0, max: 1000, step: 1 },
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
                    createCap(cap); // Don't always focus on dropdown change
                });
            }
        });
        
        capUi.querySelector('.remove-cap-btn').addEventListener('click', () => {
            if (cap.mesh) earthGroup.remove(cap.mesh);
            caps.splice(index, 1);
            renderHtmlCapsUI();
        });

        capsContainer.appendChild(capUi);
    });
}

// 3. Toggle Logic
function toggleControlPanel() {
    datGuiContainer.classList.toggle('hidden');
    htmlControlsContainer.classList.toggle('hidden');
}
toggleToDatGuiBtn.addEventListener('click', toggleControlPanel);

// --- Initial Render and Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // Rotation based on real-time to be more accurate than frame rate
    const elapsedTime = Date.now() * 0.0001;
    
    if (settings.rotateSphere) {
        // Earth's rotation is ~2pi radians in 24 hours.
        // Simplified for visual effect.
        earthMesh.rotation.y = elapsedTime * 0.25;
        cloudMesh.rotation.y = elapsedTime * 0.28; // Clouds move slightly faster
    }
    starMesh.rotation.y = elapsedTime * 0.01;

    controls.update();
    renderer.render(scene, camera);
}

// Set initial state
scene.background = null; // Use starfield as background
resetCameraToDefault();
renderHtmlCapsUI(); // Build the initial HTML UI
caps.forEach(createCap);
focusCameraOnCap(caps[0]);
animate();

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});