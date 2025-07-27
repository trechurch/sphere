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