import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';

const sphereRadius = 6371; // Earth's radius in km
const moonDistance = 20000; // Closer for testing
let scene, camera, renderer, controls, earthMesh, cloudMesh, moonMesh, moonDebugMesh, raycaster, mouse, cameraHelper;
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000);
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
const starGeometry = new THREE.SphereGeometry(800000, 64, 64);
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

// Moon mesh
const moonGeometry = new THREE.SphereGeometry(1737.4, 32, 32);
const moonMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('texture/moonmap.jpg'), // Use moon texture
    emissive: 0x444444,
    emissiveIntensity: 0.5,
    shininess: 10
});
moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
moonMesh.position.set(0, 0, moonDistance); // Initial position on Z-axis
scene.add(moonMesh);

// Moon debug wireframe
const moonDebugGeometry = new THREE.SphereGeometry(1737.4, 16, 16);
const moonDebugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
moonDebugMesh = new THREE.Mesh(moonDebugGeometry, moonDebugMaterial);
moonDebugMesh.position.copy(moonMesh.position);
scene.add(moonDebugMesh);

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
controls.maxDistance = 800000;
controls.rotateSpeed = 0.5;
controls.enablePan = false;
controls.target.set(0, 0, 0);

// Settings
const settings = {
    backgroundColor: "#000000",
    rotateSphere: true,
    focalAnchor: "earth-core",
    pickCap: false,
    selectedCapIndex: 0,
    useOrthographic: false,
    resetCamera: () => { lerpCamera("earth-core"); },
    toggleUI: () => toggleControlPanel(),
    toggleCamera: () => { settings.useOrthographic = !settings.useOrthographic; updateCamera(); }
};

// Camera lerp state
let cameraLerp = {
    active: false,
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    targetTarget: new THREE.Vector3(),
    progress: 0,
    duration: 1000 // ms
};

function updateCamera() {
    scene.remove(cameraHelper);
    if (settings.useOrthographic) {
        camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, 0.1, 1000000);
    } else {
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000000);
    }
    camera.position.set(0, 0, sphereRadius * 3);
    controls.object = camera;
    cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);
    lerpCamera(settings.focalAnchor);
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

// City coordinates
const cityCoords = {
    "houston": { lat: 29.76, lon: -95.36 },
    "new-york": { lat: 40.71, lon: -74.01 },
    "london": { lat: 51.51, lon: -0.13 }
};

// Initial caps
let caps = [
    { lat: cityCoords.houston.lat, lon: cityCoords.houston.lon, h: 0, size: 1, direction: "N", xScaler: 4, yScaler: 4, hScaler: 4, sizeScaler: 2, mesh: null },
    { lat: cityCoords["new-york"].lat, lon: cityCoords["new-york"].lon, h: 0, size: 1, direction: "N", xScaler: 4, yScaler: 4, hScaler: 4, sizeScaler: 2, mesh: null }
];

// Color cycle for caps
const capColors = [
    0xff0000, // Red
    0x00ff00, // Green
    0x0000ff, // Blue
    0xffff00, // Yellow
    0xff00ff, // Magenta
    0x00ffff // Cyan
];

const xyScalers = [0.1, 1, 10, 100, 1000];
const sizeScalers = [0.5, 1, 2, 5, 10]; // Increased for visibility
const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const directionColors = {
    "N": 0xffffff, "NE": 0xffffff, "E": 0xffffff, "SE": 0xffffff,
    "S": 0xffffff, "SW": 0xffffff, "W": 0xffffff, "NW": 0xffffff
};
const xyScalerLabels = { "0.1x": 0, "1x": 1, "10x": 2, "100x": 3, "1000x": 4 };
const sizeScalerLabels = { "Tiny": 0, "Small": 1, "Medium": 2, "Large": 3, "Huge": 4 };

function resetCameraToDefault() {
    lerpCamera("earth-core");
}

function lerpCamera(anchor) {
    cameraLerp.active = true;
    cameraLerp.progress = 0;
    cameraLerp.startPosition.copy(camera.position);
    cameraLerp.startTarget.copy(controls.target);

    switch (anchor) {
        case "earth-core":
            cameraLerp.targetPosition.set(0, 0, sphereRadius * 3);
            cameraLerp.targetTarget.set(0, 0, 0);
            break;
        case "north-pole":
            cameraLerp.targetPosition.set(0, sphereRadius * 3, 0);
            cameraLerp.targetTarget.set(0, sphereRadius, 0);
            break;
        case "south-pole":
            cameraLerp.targetPosition.set(0, -sphereRadius * 3, 0);
            cameraLerp.targetTarget.set(0, -sphereRadius, 0);
            break;
        case "binary-center":
            cameraLerp.targetPosition.set(moonDistance / 2, 0, sphereRadius * 10);
            cameraLerp.targetTarget.set(moonDistance / 2, 0, 0);
            break;
        default: // Cap index
            const capIndex = parseInt(anchor.split('-')[1]);
            if (caps[capIndex] && caps[capIndex].mesh) {
                const capPosition = new THREE.Vector3();
                caps[capIndex].mesh.getWorldPosition(capPosition);
                cameraLerp.targetPosition.copy(capPosition.clone().normalize().multiplyScalar(sphereRadius * 2));
                cameraLerp.targetTarget.copy(capPosition);
            } else {
                cameraLerp.targetPosition.set(0, 0, sphereRadius * 3);
                cameraLerp.targetTarget.set(0, 0, 0);
            }
    }
}

function focusCameraOnCap(cap) {
    if (!cap.mesh) return;
    const capPosition = new THREE.Vector3();
    cap.mesh.getWorldPosition(capPosition);
    cameraLerp.targetPosition.copy(capPosition.clone().normalize().multiplyScalar(sphereRadius * 2));
    cameraLerp.targetTarget.copy(capPosition);
    cameraLerp.active = true;
    cameraLerp.progress = 0;
    cameraLerp.startPosition.copy(camera.position);
    cameraLerp.startTarget.copy(controls.target);
}


<div class="control-grid">
    <div class="control-row-stacked">
        <label>Direction</label>
        <select ata-property="direction">

        </select>
    </div>
    <div class="control-row-stacked">
        <label>Shape</label>
        <select data-property="shape">
            <option value="sphere-cap">Sphere Cap</option>
            <option value="cylinder">Cylinder</option>
        </select>
    </div>
</div>



// In main.js, inside the renderHtmlCapsUI function

// 1. Add 'shape' to the controlsMap array
const controlsMap = [
    // ... other controls
    { prop: 'direction', type: 'select', options: directions },
    { prop: 'shape', type: 'select', options: { 'Sphere Cap': 'sphere-cap', 'Cylinder': 'cylinder' } }, // Add this line
];

// 2. Modify the event listener for 'select' elements to handle string values
el.addEventListener('change', (e) => {
    const val = e.target.value;
    // Check if the source option values are numeric (like for scalers) or strings (like for shape)
    if (Array.isArray(options) || isNaN(parseInt(Object.values(options)[0]))) {
        cap[prop] = val; // Handle string values for direction and shape
    } else {
        cap[prop] = parseInt(val); // Handle numeric values for scalers
    }
    updateAndFocus(cap, index);
});
function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];

    // Create the main group that will be positioned and oriented
    const capGroup = new THREE.Group();
    capGroup.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capGroup;
    earthGroup.add(capGroup);
document.getElementById('add-cap-btn').addEventListener('click', () => {
    // ...
    caps.push({
        lat: cityCoords.houston.lat, lon: cityCoords.houston.lon, h: 0, size: 0.1, direction: "N",
        xScaler: 4, yScaler: 4, hScaler: 4, sizeScaler: 2, mesh: null, shape: 'sphere-cap' // Add shape for new caps
    });
    // ...
});
    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // --- Shape-specific logic ---
    if (cap.shape === 'sphere-cap') {
        const capRadius = 100; // Visual radius of the cap sphere
        // To make it sit on the surface, we place its CENTER at a height equal to its radius.
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight + capRadius);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
        const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // The geometry is centered in the group, which is already lifted by capRadius, so its bottom sits on the surface.
        capGroup.add(capMeshMain);

        // Add back the direction indicator
        const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
        const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1);
        const directionMat = new THREE.MeshBasicMaterial({
            color: directionColors[cap.direction], transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        const directionMesh = new THREE.Mesh(directionGeo, directionMat);
        capGroup.add(directionMesh);

    } else if (cap.shape === 'cylinder') {
        const capHeight = 250;
        const capRadius = 40;
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 32);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // Move the cylinder up by half its height so its base sits on the group's origin (the surface).
        capMeshMain.position.y = capHeight / 2;
        capGroup.add(capMeshMain);
    }

    console.log(`Cap ${index + 1} (${cap.shape}) created at lat: ${cap.lat}, lon: ${cap.lon}`);
function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];

    // Create the main group that will be positioned and oriented
    const capGroup = new THREE.Group();
    capGroup.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capGroup;
    earthGroup.add(capGroup);

    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // --- Shape-specific logic ---
    if (cap.shape === 'sphere-cap') {
        const capRadius = 100; // Visual radius of the cap sphere
        // To make it sit on the surface, we place its CENTER at a height equal to its radius.
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight + capRadius);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
        const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // The geometry is centered in the group, which is already lifted by capRadius, so its bottom sits on the surface.
        capGroup.add(capMeshMain);

        // Add back the direction indicator
        const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
        const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1);
        const directionMat = new THREE.MeshBasicMaterial({
            color: directionColors[cap.direction], transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        const directionMesh = new THREE.Mesh(directionGeo, directionMat);
        capGroup.add(directionMesh);

    } else if (cap.shape === 'cylinder') {
        const capHeight = 250;
        const capRadius = 40;
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 32);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // Move the cylinder up by half its height so its base sits on the group's origin (the surface).
        capMeshMain.position.y = capHeight / 2;
        capGroup.add(capMeshMain);
    }

    console.log(`Cap ${index + 1} (${cap.shape}) created at lat: ${cap.lat}, lon: ${cap.lon}`);
}
function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];

    // Create the main group that will be positioned and oriented
    const capGroup = new THREE.Group();
    capGroup.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capGroup;
    earthGroup.add(capGroup);

    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // --- Shape-specific logic ---
    if (cap.shape === 'sphere-cap') {
        const capRadius = 100; // Visual radius of the cap sphere
        // To make it sit on the surface, we place its CENTER at a height equal to its radius.
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight + capRadius);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
        const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // The geometry is centered in the group, which is already lifted by capRadius, so its bottom sits on the surface.
        capGroup.add(capMeshMain);

        // Add back the direction indicator
        const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
        const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1);
        const directionMat = new THREE.MeshBasicMaterial({
            color: directionColors[cap.direction], transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        const directionMesh = new THREE.Mesh(directionGeo, directionMat);
        capGroup.add(directionMesh);

    } else if (cap.shape === 'cylinder') {
        const capHeight = 250;
        const capRadius = 40;
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 32);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // Move the cylinder up by half its height so its base sits on the group's origin (the surface).
        capMeshMain.position.y = capHeight / 2;
        capGroup.add(capMeshMain);
    }

    console.log(`Cap ${index + 1} (${cap.shape}) created at lat: ${cap.lat}, lon: ${cap.lon}`);
function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];

    // Create the main group that will be positioned and oriented
    const capGroup = new THREE.Group();
    capGroup.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capGroup;
    earthGroup.add(capGroup);

    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // --- Shape-specific logic ---
    if (cap.shape === 'sphere-cap') {
        const capRadius = 100; // Visual radius of the cap sphere
        // To make it sit on the surface, we place its CENTER at a height equal to its radius.
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight + capRadius);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
        const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // The geometry is centered in the group, which is already lifted by capRadius, so its bottom sits on the surface.
        capGroup.add(capMeshMain);

        // Add back the direction indicator
        const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
        const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1);
        const directionMat = new THREE.MeshBasicMaterial({
            color: directionColors[cap.direction], transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        const directionMesh = new THREE.Mesh(directionGeo, directionMat);
        capGroup.add(directionMesh);

    } else if (cap.shape === 'cylinder') {
        const capHeight = 250;
        const capRadius = 40;
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 32);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // Move the cylinder up by half its height so its base sits on the group's origin (the surface).
        capMeshMain.position.y = capHeight / 2;
        capGroup.add(capMeshMain);
    }

    console.log(`Cap ${index + 1} (${cap.shape}) created at lat: ${cap.lat}, lon: ${cap.lon}`);
}


function createCap(cap, index) {
    if (cap.mesh) earthGroup.remove(cap.mesh);

    const scaledHeight = cap.h * xyScalers[cap.hScaler];

    // Create the main group that will be positioned and oriented
    const capGroup = new THREE.Group();
    capGroup.userData.originalPosition = { lat: cap.lat, lon: cap.lon, h: cap.h };
    cap.mesh = capGroup;
    earthGroup.add(capGroup);

    const capMat = new THREE.MeshBasicMaterial({
        color: capColors[index % capColors.length],
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });

    // --- Shape-specific logic ---
    if (cap.shape === 'sphere-cap') {
        const capRadius = 100; // Visual radius of the cap sphere
        // To make it sit on the surface, we place its CENTER at a height equal to its radius.
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight + capRadius);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const thetaLength = cap.size * sizeScalers[cap.sizeScaler] * Math.PI / 180;
        const capGeo = new THREE.SphereGeometry(capRadius, 32, 16, 0, Math.PI * 2, 0, thetaLength);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // The geometry is centered in the group, which is already lifted by capRadius, so its bottom sits on the surface.
        capGroup.add(capMeshMain);

        // Add back the direction indicator
        const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
        const directionGeo = new THREE.SphereGeometry(capRadius, 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, thetaLength * 1.1);
        const directionMat = new THREE.MeshBasicMaterial({
            color: directionColors[cap.direction], transparent: true, opacity: 0.5, side: THREE.DoubleSide
        });
        const directionMesh = new THREE.Mesh(directionGeo, directionMat);
        capGroup.add(directionMesh);

    } else if (cap.shape === 'cylinder') {
        const capHeight = 250;
        const capRadius = 40;
        const positionVector = latLonToVector3(cap.lat, cap.lon, scaledHeight);
        const normalVector = positionVector.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalVector);

        capGroup.position.copy(positionVector);
        capGroup.quaternion.copy(quaternion);

        const capGeo = new THREE.CylinderGeometry(capRadius, capRadius, capHeight, 32);
        const capMeshMain = new THREE.Mesh(capGeo, capMat);
        // Move the cylinder up by half its height so its base sits on the group's origin (the surface).
        capMeshMain.position.y = capHeight / 2;
        capGroup.add(capMeshMain);
    }

    console.log(`Cap ${index + 1} (${cap.shape}) created at lat: ${cap.lat}, lon: ${cap.lon}`);
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

function updateCapSelectDropdown() {
    const selectCapDropdown = document.getElementById('select-cap');
    selectCapDropdown.innerHTML = '';
    caps.forEach((_, index) => {
        const option = new Option(`Cap ${index + 1}`, index);
        selectCapDropdown.add(option);
    });
    selectCapDropdown.value = settings.selectedCapIndex;
}

function updateFocalAnchorDropdown() {
    const focalAnchorSelect = document.getElementById('focal-anchor');
    focalAnchorSelect.innerHTML = '';
    const staticOptions = [
        { value: "earth-core", label: "Earth Core" },
        { value: "north-pole", label: "North Pole" },
        { value: "south-pole", label: "South Pole" },
        { value: "binary-center", label: "Binary Center" }
    ];
    staticOptions.forEach(opt => {
        const option = new Option(opt.label, opt.value);
        focalAnchorSelect.add(option);
    });
    caps.forEach((_, index) => {
        const option = new Option(`Cap ${index + 1}`, `cap-${index}`);
        focalAnchorSelect.add(option);
    });
    focalAnchorSelect.value = settings.focalAnchor;
}

function renderHtmlCapsUI() {
    const capsContainer = document.getElementById('caps-container');
    const capTemplate = document.getElementById('cap-template');
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
            { prop: 'shape', type: 'select', options: { 'Sphere Cap': 'sphere-cap', 'Cylinder': 'cylinder' } },
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
                el.value = Math.max(min, Math.min(max, cap[prop]));
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
            updateFocalAnchorDropdown();
            if (caps.length > 0 && caps[settings.selectedCapIndex]) {
                lerpCamera(`cap-${settings.selectedCapIndex}`);
            } else {
                lerpCamera("earth-core");
            }
        });

        capsContainer.appendChild(capUi);
    });
    updateCapSelectDropdown();
    updateFocalAnchorDropdown();
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
let capIndexController; // Declare globally for access
try {
    const datGuiContainer = document.getElementById('dat-gui-container');
    const htmlControlsContainer = document.getElementById('html-controls');
    const toggleToDatGuiBtn = document.getElementById('toggle-to-dat-gui');
    const capsContainer = document.getElementById('caps-container');
    const capTemplate = document.getElementById('cap-template');
    const focalAnchorSelect = document.getElementById('focal-anchor');
    const cityKeySelect = document.getElementById('city-key');

    if (!GUI) {
        console.error('dat.gui failed to load. Please check the CDN or import map.');
        throw new Error('dat.gui not available');
    }

    const gui = new GUI({ autoPlace: false });
    datGuiContainer.appendChild(gui.domElement);
    datGuiContainer.classList.add('controls');
    gui.addColor(settings, "backgroundColor").onChange(v => scene.background = new THREE.Color(v));
    gui.add(settings, "rotateSphere").name("Rotate Earth").onChange(v => settings.rotateSphere = v);
    gui.add(settings, "resetCamera").name("Reset Camera");
    gui.add(settings, "pickCap").name("Pick Cap Location").onChange(v => settings.pickCap = v);
    gui.add(settings, "useOrthographic").name("Use Orthographic Camera").onChange(v => settings.toggleCamera());
    capIndexController = gui.add(settings, "selectedCapIndex", 0, Math.max(0, caps.length - 1)).name("Select Cap").step(1)
        .onChange(v => {
            settings.selectedCapIndex = Math.floor(v);
            if (caps[settings.selectedCapIndex]) lerpCamera(`cap-${settings.selectedCapIndex}`);
        });
    gui.add(settings, 'toggleUI').name('Switch to HTML UI');

    htmlControlsContainer.classList.add('controls');
    document.getElementById('bg-color').addEventListener('input', (e) => {
        scene.background = e.target.value === '#000000' ? null : new THREE.Color(e.target.value);
    });
    document.getElementById('rotate-sphere').addEventListener('change', (e) => settings.rotateSphere = e.target.checked);
    document.getElementById('rotate-sphere').checked = settings.rotateSphere;
    document.getElementById('reset-camera-btn').addEventListener('click', () => {
        lerpCamera("earth-core");
    });

    focalAnchorSelect.addEventListener('change', (e) => {
        settings.focalAnchor = e.target.value;
        lerpCamera(settings.focalAnchor);
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
        if (caps[settings.selectedCapIndex]) lerpCamera(`cap-${settings.selectedCapIndex}`);
    });

    cityKeySelect.addEventListener('change', (e) => {
        if (e.target.value !== "none") {
            const coords = cityCoords[e.target.value];
            const selectedCap = caps[settings.selectedCapIndex];
            if (selectedCap) {
                selectedCap.lat = coords.lat;
                selectedCap.lon = coords.lon;
                selectedCap.h = 0;
                updateAndFocus(selectedCap, settings.selectedCapIndex, true);
                renderHtmlCapsUI();
            }
        }
    });

    // Initialize UI
    scene.background = null;
    resetCameraToDefault();
    renderHtmlCapsUI();
    caps.forEach((cap, index) => updateCap(cap, index));
    lerpCamera(`cap-0`);
} catch (e) {
    console.error('Error initializing UI:', e);
}

function toggleControlPanel() {
    const datGuiContainer = document.getElementById('dat-gui-container');
    const htmlControlsContainer = document.getElementById('html-controls');
    datGuiContainer.classList.toggle('hidden');
    htmlControlsContainer.classList.toggle('hidden');
}
document.getElementById('toggle-to-dat-gui').addEventListener('click', toggleControlPanel);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = Date.now() * 0.0001;

    if (settings.rotateSphere) {
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.25);
        earthGroup.quaternion.copy(rotationQuaternion);
        cloudMesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), elapsedTime * 0.28));
        moonMesh.position.set(moonDistance * Math.cos(elapsedTime * 0.1), 0, moonDistance * Math.sin(elapsedTime * 0.1));
        moonDebugMesh.position.copy(moonMesh.position);
        // Log moon's screen position
        const moonScreenPos = moonMesh.position.clone().project(camera);
        console.log(`Moon screen position: x=${moonScreenPos.x.toFixed(2)}, y=${moonScreenPos.y.toFixed(2)}, z=${moonScreenPos.z.toFixed(2)}`);
    }

    if (cameraLerp.active) {
        cameraLerp.progress += 16 / cameraLerp.duration;
        if (cameraLerp.progress >= 1) {
            cameraLerp.progress = 1;
            cameraLerp.active = false;
        }
        camera.position.lerpVectors(cameraLerp.startPosition, cameraLerp.targetPosition, cameraLerp.progress);
        controls.target.lerpVectors(cameraLerp.startTarget, cameraLerp.targetTarget, cameraLerp.progress);
        controls.update();
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
});}    }   
