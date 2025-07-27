// capPlacementManager.js
// Handles UI bindings and state updates for cap placement

import { capArray, createDefaultCap } from '../shared/capArray.js';

export class CapPlacementManager {
  constructor() {
    this.primaryIndex = null;
    this.secondaryIndex = null;
    this.uiElements = {};
  }

  initUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`CapPlacementManager: Missing container #${containerId}`);
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