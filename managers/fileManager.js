// managers/fileManager.js
export function saveSettingsToFile(settings, capArray, texturePaths) {
  const data = {
    settings,
    caps: capArray,
    textures: texturePaths
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sphereConfig.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function loadSettingsFromFile(file, applyFn) {
  const reader = new FileReader();
  reader.onload = () => {
    const data = JSON.parse(reader.result);
    applyFn(data);
  };
  reader.readAsText(file);
}