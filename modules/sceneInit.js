// === Scene Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 0, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Controls ===
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.2;

// === Lighting ===
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(200, 400, 300);
scene.add(ambient, directional);

// === Materials (Wireframe Start) ===
let earthMaterial = new THREE.MeshStandardMaterial({ wireframe: true });
let moonMaterial = new THREE.MeshPhongMaterial({ wireframe: true });
let starfieldMaterial = new THREE.MeshBasicMaterial({ wireframe: true, side: THREE.BackSide });

// === Geometry ===
const earthGeo = new THREE.SphereGeometry(200, 64, 64);
const moonGeo = new THREE.SphereGeometry(60, 32, 32);
const starfieldGeo = new THREE.SphereGeometry(1500, 64, 64);

const earthMesh = new THREE.Mesh(earthGeo, earthMaterial);
const moonMesh = new THREE.Mesh(moonGeo, moonMaterial);
const starfieldMesh = new THREE.Mesh(starfieldGeo, starfieldMaterial);
moonMesh.position.set(300, 0, 0);

scene.add(starfieldMesh, earthMesh, moonMesh);

// === Render Loop ===
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// === Texture Loader (Stub for FileExplorer Integration) ===
function loadTextureToMaterial(file, targetMaterial, key = 'map') {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      targetMaterial[key] = texture;
      targetMaterial.wireframe = false;
      targetMaterial.needsUpdate = true;
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// Example: document.getElementById('mapInput').addEventListener('change', e => loadTextureToMaterial(e.target.files[0], earthMaterial));