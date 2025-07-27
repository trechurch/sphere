// capArray.js
// Shared data array for cap placement system

export const capArray = [];

export const createDefaultCap = () => ({
  id: `cap-${Date.now()}`, // Unique timestamp-based ID
  latitude: 0,
  longitude: 0,
  altitude: 1000,
  size: "City", // Options: Neighborhood, Town, City, State, Continent, Planet
  scaler: {
    lat: 1,
    lon: 1,
    alt: 1,
    size: 1,
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});
