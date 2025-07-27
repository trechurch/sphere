// modules/sceneSetup.js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export function initScene() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 5, 15);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  return { scene, camera, renderer };
}

export function initEarthGroup(textures) {
  const material = textures.earthMaterial || new THREE.MeshBasicMaterial({ wireframe: true });
  const geometry = new THREE.SphereGeometry(5, 64, 64);
  const earthMesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(earthMesh);
  return group;
}

export function initMoon(textures) {
  const material = textures.moonMaterial || new THREE.MeshBasicMaterial({ wireframe: true });
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  return new THREE.Mesh(geometry, material);
}

export function initOrbitControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  return controls;
}