// [No change] Existing imports and setup until data management

// [Alteration] Advanced data management
let capArray = JSON.parse(localStorage.getItem('capArray')) || [];
if (!capArray.length) {
    capArray = [{ lat: 29.76, lon: -95.36, height: 0, size: 30, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 2, sizeScaler: 2 }];
    localStorage.setItem('capArray', JSON.stringify(capArray));
}
let primaryCapIndex = 0, secondaryCapIndex = 0;
let deploymentType = 'single-band';

// [Alteration] Advanced camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = sphereRadius + 100;
controls.maxDistance = (16 * sphereRadius) / Math.tan(camera.fov * (Math.PI / 180) / 2);
let resolution = 5;

function updateCameraControls() {
    const speed = 10 / resolution;
    document.querySelectorAll('.cam-arrows button').forEach(btn => {
        btn.addEventListener('click', () => {
            const dir = btn.id.replace('strafe-', '').replace('-', '');
            const x = { up: 0, down: 0, left: -1, right: 1, 'up-left': -1, 'up-right': 1, 'down-left': -1, 'down-right': 1 }[dir] || 0;
            const y = { up: 1, down: -1, left: 0, right: 0, 'up-left': 1, 'up-right': 1, 'down-left': -1, 'down-right': -1 }[dir] || 0;
            camera.position.x += x * speed;
            camera.position.y += y * speed;
            controls.target.x += x * speed;
            controls.target.y += y * speed;
            controls.update();
        });
    });
    ['macro', 'micro', 'basic'].forEach(type => {
        document.getElementById(`${type}-zoom`).addEventListener('input', (e) => {
            const zoom = parseInt(e.target.value) / 50;
            camera.position.multiplyScalar(zoom);
            controls.update();
        });
    });
    document.getElementById('resolution').addEventListener('input', (e) => {
        resolution = parseInt(e.target.value);
    });
}

// [Alteration] Optic and deployment view
function updateOptics() {
    earthMesh.material.wireframe = document.getElementById('wireframe-toggle').checked;
    // Moon, Orbit, Stars, Contrast logic to be added
    updateCapView();
}

function updateCapView() {
    const deployView = document.getElementById('deploy-view').checked;
    earthGroup.children.forEach(child => {
        if (child.userData && child.userData.mesh) {
            earthGroup.remove(child);
            const cap = capArray[primaryCapIndex] || {};
            const { x, y, z } = latLonToXY(cap.lat, cap.lon);
            const positionVector = new THREE.Vector3(x, y, z).normalize();
            const scaledHeight = cap.height * xyScalers[cap.hScaler] + (cap.z || 0);
            const capMesh = new THREE.Group();
            capMesh.position.copy(positionVector.multiplyScalar(sphereRadius + scaledHeight));

            if (deployView) {
                const geo = new THREE.SphereGeometry(100 * cap.size * sizeScalers[cap.sizeScaler], 32, 32);
                const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
                const colors = [];
                const positions = geo.getAttribute('position').array;
                for (let i = 0; i < positions.length; i += 3) {
                    const x = positions[i];
                    const y = positions[i + 1];
                    const z = positions[i + 2];
                    colors.push(x > 0 ? 1 : x < 0 ? 1 : 0, y > 0 ? 0 : y < 0 ? 1 : 0, z > 0 ? 0 : z < 0 ? 1 : 0);
                }
                geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                capMesh.add(new THREE.Mesh(geo, mat));
            } else {
                const capGeo = new THREE.SphereGeometry(50 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, 0, Math.PI * 2, 0, Math.PI / 12);
                const capMat = new THREE.MeshBasicMaterial({
                    color: directionColors[cap.direction] || directionColors["NW"],
                    transparent: true,
                    opacity: 0.9,
                    side: THREE.DoubleSide
                });
                const capMeshMain = new THREE.Mesh(capGeo, capMat);
                const directionAngle = directions.indexOf(cap.direction) * (Math.PI / 4);
                const directionGeo = new THREE.SphereGeometry(60 * cap.size * sizeScalers[cap.sizeScaler], 32, 16, directionAngle - Math.PI / 8, Math.PI / 4, 0, Math.PI / 12);
                const directionMat = new THREE.MeshBasicMaterial({
                    color: directionColors[cap.direction] || directionColors["NW"],
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const directionMesh = new THREE.Mesh(directionGeo, directionMat);
                capMesh.add(capMeshMain);
                capMesh.add(directionMesh);
            }
            capMesh.quaternion.copy(quaternion);
            capMesh.userData = cap;
            earthGroup.add(capMesh);
        }
    });
    document.getElementById('color-key').classList.toggle('hidden', !deployView);
}

// [Alteration] File management
document.getElementById('load-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            capArray = JSON.parse(event.target.result).map(cap => ({ ...cap, mesh: null }));
            localStorage.setItem('capArray', JSON.stringify(capArray));
            updateCapSelect();
            capArray.forEach(createCap);
        };
        reader.readAsText(file);
    }
});

document.getElementById('save-file').addEventListener('click', () => {
    const data = JSON.stringify(capArray.map(cap => ({ lat: cap.lat, lon: cap.lon, height: cap.height, size: cap.size, direction: cap.direction, xScaler: cap.xScaler, yScaler: cap.yScaler, hScaler: cap.hScaler, sizeScaler: cap.sizeScaler })));
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capArray.json';
    a.click();
    URL.revokeObjectURL(url);
});

// [Alteration] Cap management events
document.getElementById('new-cap').addEventListener('click', () => {
    const defaultCap = { lat: 29.76, lon: -95.36, height: 0, size: 30, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 2, sizeScaler: 2 };
    if (!capArray.some(cap => JSON.stringify(cap) === JSON.stringify(defaultCap))) {
        capArray.push(defaultCap);
        primaryCapIndex = capArray.length - 1;
        localStorage.setItem('capArray', JSON.stringify(capArray));
        updateCapSelect();
        createCap(defaultCap);
    }
});

document.getElementById('delete-cap').addEventListener('click', () => {
    if (confirm('Delete selected cap?')) {
        if (capArray.length > 0) {
            capArray.splice(primaryCapIndex, 1);
            primaryCapIndex = Math.max(0, capArray.length - 1);
            localStorage.setItem('capArray', JSON.stringify(capArray));
            updateCapSelect();
            if (capArray.length) createCap(capArray[primaryCapIndex]);
            else createCap({ lat: 29.76, lon: -95.36, height: 0, size: 30, direction: "NW", xScaler: 4, yScaler: 4, hScaler: 2, sizeScaler: 2 });
        }
    }
});

function updateCapSelect() {
    ['primary-cap', 'secondary-cap', 'clone-from'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '';
        capArray.forEach((cap, idx) => {
            const option = new Option(`Cap ${idx + 1}`, idx);
            select.add(option);
        });
        if (id === 'primary-cap') select.value = primaryCapIndex;
        else if (id === 'secondary-cap') select.value = secondaryCapIndex;
        else select.value = 0;
    });
    document.getElementById('clone-to').innerHTML = '<option value="new">Create New</option>';
    capArray.forEach((_, idx) => {
        document.getElementById('clone-to').add(new Option(`Cap ${idx + 1}`, idx));
    });
}

document.getElementById('primary-cap').addEventListener('change', (e) => {
    primaryCapIndex = parseInt(e.target.value);
    updateCapInputs();
    createCap(capArray[primaryCapIndex]);
});

document.getElementById('secondary-cap').addEventListener('change', (e) => {
    secondaryCapIndex = parseInt(e.target.value);
    updateCapInputs();
    createCap(capArray[secondaryCapIndex]);
});

document.getElementById('clone-from').addEventListener('change', (e) => {
    const fromIdx = parseInt(e.target.value);
    const toIdx = document.getElementById('clone-to').value;
    if (toIdx === 'new') {
        capArray.push({ ...capArray[fromIdx] });
        primaryCapIndex = capArray.length - 1;
    } else {
        capArray[parseInt(toIdx)] = { ...capArray[fromIdx] };
    }
    localStorage.setItem('capArray', JSON.stringify(capArray));
    updateCapSelect();
    createCap(capArray[primaryCapIndex]);
});

function updateCapInputs() {
    const primary = capArray[primaryCapIndex] || { lat: 29.76, lon: -95.36, height: 0, size: 30 };
    const secondary = capArray[secondaryCapIndex] || { lat: 29.76, lon: -95.36, height: 0, size: 30 };
    ['primary', 'secondary'].forEach(prefix => {
        const cap = prefix === 'primary' ? primary : secondary;
        document.getElementById(`${prefix}-lat`).value = cap.lat;
        document.getElementById(`${prefix}-lon`).value = cap.lon;
        document.getElementById(`${prefix}-height`).value = cap.height;
        document.getElementById(`${prefix}-size`).value = cap.size;
        document.getElementById(`${prefix}-lat-scaler`).value = cap.xScaler || 1;
        document.getElementById(`${prefix}-lon-scaler`).value = cap.yScaler || 1;
        document.getElementById(`${prefix}-height-scaler`).value = cap.hScaler || 1;
        document.getElementById(`${prefix}-size-scaler`).value = cap.sizeScaler || 2;
    });
}

['primary', 'secondary'].forEach(prefix => {
    ['lat', 'lon', 'height', 'size'].forEach(prop => {
        const el = document.getElementById(`${prefix}-${prop}`);
        el.addEventListener('change', () => {
            const cap = capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] || {};
            cap[prop] = parseFloat(el.value);
            capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] = cap;
            localStorage.setItem('capArray', JSON.stringify(capArray));
            createCap(cap);
        });
        document.getElementById(`${prefix}-${prop}-dec`).addEventListener('click', () => {
            const cap = capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] || {};
            cap[prop] = Math.max(parseFloat(el.min), parseFloat(el.value) - parseFloat(el.step));
            el.value = cap[prop];
            capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] = cap;
            localStorage.setItem('capArray', JSON.stringify(capArray));
            createCap(cap);
        });
        document.getElementById(`${prefix}-${prop}-inc`).addEventListener('click', () => {
            const cap = capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] || {};
            cap[prop] = Math.min(parseFloat(el.max), parseFloat(el.value) + parseFloat(el.step));
            el.value = cap[prop];
            capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] = cap;
            localStorage.setItem('capArray', JSON.stringify(capArray));
            createCap(cap);
        });
    });
    ['lat', 'lon', 'height'].forEach(prop => {
        document.getElementById(`${prefix}-${prop}-scaler`).addEventListener('input', (e) => {
            const cap = capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] || {};
            cap[`${prop === 'lat' ? 'x' : prop === 'lon' ? 'y' : 'h'}Scaler`] = parseInt(e.target.value);
            capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] = cap;
            localStorage.setItem('capArray', JSON.stringify(capArray));
            createCap(cap);
        });
    });
    document.getElementById(`${prefix}-size-scaler`).addEventListener('change', (e) => {
        const cap = capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] || {};
        cap.sizeScaler = { neighborhood: 1, town: 2, city: 3, state: 4, continent: 5, planet: 6 }[e.target.value] || 2;
        capArray[prefix === 'primary' ? primaryCapIndex : secondaryCapIndex] = cap;
        localStorage.setItem('capArray', JSON.stringify(capArray));
        createCap(cap);
    });
});

// [Alteration] Tier management (placeholder)
document.getElementById('deployment-type').addEventListener('change', (e) => {
    deploymentType = e.target.value;
    ['single-band', 'single-tier', 'multi-tier'].forEach(type => document.getElementById(`${type}-controls`).classList.toggle('hidden', type !== deploymentType));
    // Tier logic to be expanded with part 4
});

// [Alteration] Color pallet
document.getElementById('color-pallet-trigger').addEventListener('click', () => {
    const panel = document.getElementById('color-pallet-panel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        // Placeholder for color management UI
        const elements = ['Earth', 'Caps', 'Stars', 'Moon'];
        const newer = document.getElementById('newer-colors');
        const older = document.getElementById('older-colors');
        newer.innerHTML = older.innerHTML = elements.map(el => `
            <div class="color-item">
                <span>${el}</span>
                <input type="color" class="newer" value="#ffffff">
                <input type="color" class="older" value="#ffffff">
            </div>
        `).join('');
        document.querySelectorAll('.color-item input').forEach(input => {
            input.addEventListener('change', (e) => {
                const item = e.target.closest('.color-item');
                const olderInput = item.querySelector('.older');
                if (e.target.classList.contains('newer')) olderInput.value = e.target.value;
            });
        });
    }
});

document.getElementById('revert-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        const older = newer.nextElementSibling;
        newer.value = older.value;
    });
    // Load defaults to older
});

document.getElementById('randomize-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .older').forEach(older => {
        older.value = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    });
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        newer.value = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    });
});

document.getElementById('save-colors').addEventListener('click', () => {
    document.getElementById('color-pallet-panel').classList.add('hidden');
    // Save logic
});

document.getElementById('discard-colors').addEventListener('click', () => {
    document.querySelectorAll('.color-item .newer').forEach(newer => {
        newer.value = newer.nextElementSibling.value;
    });
    document.getElementById('color-pallet-panel').classList.add('hidden');
    // Reset to defaults
});

// [No change] Existing animate and resize, add optics update
setInterval(() => localStorage.setItem('capArray', JSON.stringify(capArray)), 30000);
updateCameraControls();
updateCapSelect();