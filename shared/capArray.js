// capArray.js
// Shared data array for cap placement system
// This file manages the array of caps and provides utility functions

// capArray.js

let capArray = [];

export const getCapArray = () => Array.isArray(capArray) ? capArray : [];

export const addCap = (cap) => {
  if (cap && typeof cap === 'object') {
    capArray.push(cap);
  }
};

export const clearCapArray = () => {
  capArray = [];
};

export const createDefaultCap = () => ({
  id: `cap-${Date.now()}`,
  latitude: 0,
  longitude: 0,
  altitude: 1000,
  size: "City",
  scaler: { lat: 1, lon: 1, alt: 1, size: 1 },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});