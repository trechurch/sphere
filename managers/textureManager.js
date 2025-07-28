// managers/textureManager.js
import * as THREE from 'three';

export function loadTextureConfig() {
  try {
    const config = JSON.parse(localStorage.getItem('sphere-textures'));
    return config || { useDefaults: true };
  } catch {
    return { useDefaults: true };
  }
}

export async function loadTextures(paths) {
  const loader = new THREE.TextureLoader();
  const output = {};
  if (!paths || paths.useDefaults) {
    output.earthMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
    output.moonMaterial = new THREE.MeshBasicMaterial({ wireframe: true });
    return output;
  }
  if (paths.earthMap) output.earthMaterial = new THREE.MeshStandardMaterial({ map: await loader.loadAsync(paths.earthMap) });
  if (paths.moonMap) output.moonMaterial = new THREE.MeshStandardMaterial({ map: await loader.loadAsync(paths.moonMap) });
  return output;
}

export function saveTextureConfig(paths) {
  localStorage.setItem('sphere-textures', JSON.stringify(paths));
}

export function showTextureSelectorUI(onConfirm) {
  // Create modal / popup with inputs for texture selection
  // Call onConfirm({ earthMap, bumpMap, moonMap, starMap, ... }) when user confirms
}