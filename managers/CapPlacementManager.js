// managers.capPlacementManager.js
// Handles UI bindings and state updates for cap placement

import { getCapArray, addCap, createDefaultCap } from '../shared/capArray.js';

addCap(createDefaultCap());  // Adds a default cap
const heightOffset = getStackedHeight(getCapArray()); // Reads the array safely


capArray.push(createDefaultCap());
// Conversion utility
function xyToLatLon(x, y) {
  // Replace this with real projection math when ready
  return { lat: y, lon: x };
}

// Outside any class
export function getStackedHeight(capArray, direction) {
  const sameDirectionCaps = getCapArray().filter(cap => cap.direction === direction);
  return sameDirectionCaps.length * 2.5; // example spacing
}
export class capPlacementManager {
  constructor() {
    this.primaryIndex = null;
    this.secondaryIndex = null;
    this.uiElements = {};
  }

  initUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`capPlacementManager: Missing container #${containerId}`);
      return;
    }

    // Store references to UI controls
    this.uiElements = {
      latInput: container.querySelector('#latitude-input'),
      lonInput: container.querySelector('#longitude-input'),
      altInput: container.querySelector('#altitude-input'),
      sizeSelect: container.querySelector('#size-select'),
      placeBtn: container.querySelector('#click-to-place'),
    };

    // Bind listeners
    this.uiElements.placeBtn.addEventListener('click', () => {
      this.commitPlacement();
    });
  }

  commitPlacement() {
    const capData = {
      latitude: parseFloat(this.uiElements.latInput.value),
      longitude: parseFloat(this.uiElements.lonInput.value),
      altitude: parseFloat(this.uiElements.altInput.value),
      size: this.uiElements.sizeSelect.value,
      scaler: {
        lat: 1,
        lon: 1,
        alt: 1,
        size: 1,
      },
      id: `cap-${Date.now()}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    capArray.push(capData);
    this.primaryIndex = capArray.length - 1;
    console.log(`New cap placed:`, capData);
    this.persistState();
  }

  loadCap(index) {
    if (!capArray[index]) return;
    const cap = capArray[index];
    this.uiElements.latInput.value = cap.latitude;
    this.uiElements.lonInput.value = cap.longitude;
    this.uiElements.altInput.value = cap.altitude;
    this.uiElements.sizeSelect.value = cap.size;
    this.primaryIndex = index;
  }

  deleteCap(index) {
    if (!capArray[index]) return;
    capArray.splice(index, 1);
    console.log(`Cap deleted at index ${index}`);
    this.primaryIndex = null;
    this.persistState();
  }

  persistState() {
    // Future-proof: Hook into FileManager or localStorage
    // For now, just a console log to confirm persist trigger
    console.log(`Cap array state updated:`, JSON.stringify(capArray, null, 2));
  }
}
const cap = {
  x: 100,
  y: 50,
  h: 20,
  z: 1,
  hScaler: "default",
  tierLevel: 2
};
const { lat, lon } = xyToLatLon(cap.x, cap.y);
function latLonToXY(lat, lon) {
  // Stub logic—use real projection here if needed
  return { x: lon, y: lat };
}
import * as THREE from "three";

// Create a spherical, surface-hugging cap
export function createSphericalCap(cap, {
  radius,
  sizeScalers,
  deploymentType,
  directionColors,
  tierSettings,
  getStackedHeight,
  earthGroup,
  xyScalers,
  debug = false,
}) {
  const capSize = deploymentType === "multi-tier"
    ? cap.size * (tierSettings.multiTierLevels / 3)
    : cap.size;

  const capExtent = 500 * capSize * sizeScalers[cap.sizeScaler];
  const capAngle = Math.min(capExtent / radius, Math.PI / 2);

  const capGeo = new THREE.SphereGeometry(
    radius, 32, 32,
    0, Math.PI * 2,
    0, capAngle
  );
  const capMat = new THREE.MeshBasicMaterial({
    color: directionColors[cap.direction] || 0xff0000,
    transparent: true,
    opacity: deploymentType === "single-band"
      ? tierSettings.singleBandIntensity / 100
      : 0.9,
    side: THREE.DoubleSide,
  });
  const capMeshMain = new THREE.Mesh(capGeo, capMat);

  const { lat, lon } = xyToLatLon(cap.x, cap.y);
  const positionVector = new THREE.Vector3(...Object.values(latLonToXY(lat, lon))).normalize();

  let scaledHeight = cap.h * xyScalers[cap.hScaler] + getStackedHeight(cap.x, cap.y, cap.z);
  if (deploymentType === "multi-tier") {
    scaledHeight += tierSettings.multiTierSpacing * (cap.tierLevel || 0);
  }

  const capMesh = new THREE.Group();
  capMesh.position.copy(positionVector.multiplyScalar(radius + scaledHeight));
  capMesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), positionVector));
  capMesh.add(capMeshMain);
  capMesh.userData = {
    size: capExtent,
    originalPosition: { x: cap.x, y: cap.y, h: cap.h, z: cap.z },
  };

  cap.mesh = capMesh;
  earthGroup.add(capMesh);
  if (debug) console.log("✅ Created spherical cap:", cap);
}