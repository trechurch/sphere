function renderCapHtml(settings) {

// Placeholder implementation

return `<div>Rendered Cap HTML</div>`;

}

// modules/capUi.js

const container = document.getElementById('caps-container');

//if (container) { const settings = { tier: 'alpha', direction: 'north', debug: true, id: 'cap-001',};container.innerHTML = renderCapHtml(settings);} else {console.error('caps-container is null. UI cannot render.');}

// This function can now be called when you're ready
export function initializeCapUI(capArray, settings) {
  const container = document.getElementById('caps-container');
  if (!container) {
    console.error('caps-container is null. UI cannot render.');
    return;
  }
  renderHtmlCapsUI(capArray, settings);
  updateCapSelectDropdown(capArray);
}

export function renderHtmlCapsUI(capArray, settings) {

const container = document.getElementById('cap-panel');

container.innerHTML = ''; // Clear

capArray.forEach(cap => {

const el = document.createElement('div');

el.className = 'cap-item';

el.textContent = `Cap ${cap.id || 'unnamed'}`;

container.appendChild(el);

});

}

export function updateCapSelectDropdown(capArray) {

const dropdown = document.getElementById('capSelect');

dropdown.innerHTML = ''; // 💥 dropdown is null

capArray.forEach(cap => {

const opt = document.createElement('option');

opt.value = cap.id;

opt.text = `Cap ${cap.id}`;

dropdown.appendChild(opt);

});

}

export function updateAndFocus(cap) {

// Update UI fields and focus camera

}

export function focusCameraOnCap(cap, camera, controls) {

const pos = cap.mesh?.position || { x: 0, y: 0, z: 0 };

camera.position.set(pos.x + 5, pos.y + 5, pos.z + 5);

controls.target.set(pos.x, pos.y, pos.z);

controls.update();

}