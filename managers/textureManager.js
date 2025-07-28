// managers/textureManager.js
// Manages texture loading and configuration for the sphere
const materialBank = {
  earth: new THREE.MeshStandardMaterial({ wireframe: true }),
  moon: new THREE.MeshStandardMaterial({ wireframe: true }),
  stars: new THREE.MeshBasicMaterial({ wireframe: true, side: THREE.BackSide }),
  clouds: new THREE.MeshLambertMaterial({ wireframe: true, transparent: true })
};

export function getMaterial(key) {
  return materialBank[key];
}
export function setMaterial(key, texture) {
  if (materialBank[key]) {    
    materialBank[key].map = texture;
    materialBank[key].needsUpdate = true;
  } else {
    console.warn(`Material key "${key}" does not exist in material bank.`);
  }
} 

export async function assignTexture(filePath, targetKey, mapType = 'map') {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(filePath);
  const mat = materialBank[targetKey];
  if (mat) {
    mat[mapType] = texture;
    mat.wireframe = false;
    mat.needsUpdate = true;
  }
}

export async function loadTextures(config) {
  if (!config || config.useDefaults) return materialBank;

  await assignTexture(config.earthMap, 'earth');
  await assignTexture(config.moonMap, 'moon');
  await assignTexture(config.starMap, 'stars');
  if (config.cloudMap) await assignTexture(config.cloudMap, 'clouds');

  return materialBank;
}


//export function loadTexture(key, file) {
  //const reader = new FileReader();
  //reader.onload = function(event) {
    //const img = new Image();
    //img.onload = function() {
      //const texture = new THREE.Texture(img);
      //texture.needsUpdate = true;
      //setMaterial(key, texture);
      //materialBank[key].wireframe = false; // Disable wireframe if texture is loaded
      //materialBank[key].needsUpdate = true;
    //};
    //img.src = event.target.result;
  //};
  //reader.readAsDataURL(file);
//}
export async function assignEnvMap(filePath, targetKey) {
  const loader = new THREE.TextureLoader();
  const texture = await loader.loadAsync(filePath);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const mat = materialBank[targetKey];
  if (mat) {
    mat.envMap = texture;
    mat.needsUpdate = true;
  }
}
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