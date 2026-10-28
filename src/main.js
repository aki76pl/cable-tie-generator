import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { DEFAULTS, LIMITS, generate } from './geometry.js';
import { toSTL, to3MF } from './export.js';

const STORAGE_KEY = 'cable-tie-generator:v1';
const TPU_DENSITY = 1.21; // g/cm³

// ---------- Definicja panelu ----------
const SECTIONS = [
  { title: 'Pasek', fields: [
    { key: 'length', label: 'Długość', unit: 'mm' },
    { key: 'width', label: 'Szerokość', unit: 'mm' },
    { key: 'thickness', label: 'Grubość paska', unit: 'mm' },
    { key: 'endShape', label: 'Wolny koniec', type: 'choice',
      options: [['round', 'Okrągły'], ['pointed', 'Szpic'], ['square', 'Prosty']] },
  ]},
  { title: 'Oczka', fields: [
    { key: 'slotCount', label: 'Ilość oczek', unit: 'szt.' },
    { key: 'slotLength', label: 'Długość oczka', unit: 'mm', hint: 'wymiar wzdłuż paska' },
    { key: 'slotWidth', label: 'Szerokość oczka', unit: 'mm', hint: 'wymiar w poprzek paska' },
    { key: 'slotPitch', label: 'Rozstaw oczek', unit: 'mm', hint: 'środek–środek' },
    { key: 'slotRadius', label: 'Zaokrąglenie oczka', unit: 'mm' },
    { key: 'endMargin', label: 'Odstęp od końca', unit: 'mm' },
  ]},
  { title: 'Kołek zapięcia', fields: [
    { key: 'pegClearance', label: 'Luz szyjki', unit: 'mm', hint: 'na stronę, względem oczka' },
    { key: 'capHeight', label: 'Wysokość czapki', unit: 'mm' },
    { key: 'capOverhang', label: 'Nawis czapki', unit: 'mm', hint: 'ile czapka wystaje poza oczko' },
  ]},
  { title: 'Wydruk', fields: [
    { key: 'copies', label: 'Ilość sztuk', unit: 'szt.' },
    { key: 'color', label: 'Kolor podglądu', type: 'color',
      options: ['#14b8a6', '#ec4899', '#1e3a5f', '#22c55e', '#f87171', '#9ca3af', '#f59e0b'] },
  ]},
];

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, color: '#14b8a6', ...s };
  } catch { return { ...DEFAULTS, color: '#14b8a6' }; }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* brak dostępu */ }
}

let state = loadState();
const inputs = {}; // key -> { set(value) }

function buildControls() {
  const form = document.getElementById('controls');
  form.innerHTML = '';
  for (const section of SECTIONS) {
    const fs = document.createElement('fieldset');
    fs.innerHTML = `<legend>${section.title}</legend>`;
    for (const f of section.fields) fs.appendChild(buildField(f));
    form.appendChild(fs);
  }
}

function buildField(f) {
  const row = document.createElement('div');
  row.className = 'field';
  if (f.type === 'choice' || f.type === 'color') {
    row.innerHTML = `<label>${f.label}</label><div class="seg ${f.type}"></div>`;
    const seg = row.querySelector('.seg');
    const buttons = (f.type === 'choice' ? f.options : f.options.map((c) => [c, ''])).map(([val, text]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.value = val;
      if (f.type === 'color') { b.style.background = val; b.title = val; b.setAttribute('aria-label', val); }
      else b.textContent = text;
      b.addEventListener('click', () => { state[f.key] = val; sync(); update(); });
      seg.appendChild(b);
      return b;
    });
    const sync = () => buttons.forEach((b) => b.classList.toggle('on', b.dataset.value === state[f.key]));
    inputs[f.key] = { set: sync };
    sync();
    return row;
  }

  const [min, max, step] = LIMITS[f.key];
  row.innerHTML = `
    <div class="field-head">
      <label for="in-${f.key}">${f.label}${f.hint ? `<small>${f.hint}</small>` : ''}</label>
      <span class="num"><input id="in-${f.key}" type="number" min="${min}" max="${max}" step="${step}"><em>${f.unit}</em></span>
    </div>
    <input type="range" min="${min}" max="${max}" step="${step}" aria-label="${f.label}">`;
  const num = row.querySelector('input[type=number]');
  const range = row.querySelector('input[type=range]');
  const set = (v) => { num.value = v; range.value = v; };
  const onInput = (src) => {
    const v = parseFloat(src.value);
    if (Number.isNaN(v)) return;
    state[f.key] = Math.min(max, Math.max(min, v));
    if (src === range) num.value = state[f.key]; else range.value = state[f.key];
    update();
  };
  range.addEventListener('input', () => onInput(range));
  num.addEventListener('input', () => onInput(num));
  num.addEventListener('change', () => set(state[f.key]));
  inputs[f.key] = { set };
  set(state[f.key]);
  return row;
}

// ---------- Scena 3D ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
camera.up.set(0, 0, 1);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;

scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-120, -160, 260);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -250, right: 250, top: 250, bottom: -250, near: 1, far: 800 });
scene.add(sun);

const plate = new THREE.Group();
scene.add(plate);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.18 }));
ground.receiveShadow = true;
ground.position.z = -0.01;
plate.add(ground);
let grid;
function buildGrid() {
  if (grid) { plate.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  grid = new THREE.GridHelper(400, 40, dark ? 0x3f4a56 : 0xb9c2cc, dark ? 0x2a323b : 0xdde3e9);
  grid.rotation.x = Math.PI / 2;
  plate.add(grid);
}
buildGrid();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', buildGrid);

const material = new THREE.MeshStandardMaterial({ color: state.color, roughness: 0.55, metalness: 0.02 });
const tieMesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
tieMesh.castShadow = true;
tieMesh.receiveShadow = true;
scene.add(tieMesh);

function resize() {
  const { clientWidth: w, clientHeight: h } = canvas.parentElement;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);

function setView(kind) {
  // Odległość tak, by sfera otaczająca model zmieściła się w węższym z kątów widzenia.
  const radius = Math.hypot(state.length, (state.width + 4) * state.copies) / 2 + 5;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const r = radius / Math.sin(Math.min(vfov, hfov) / 2);
  const dirs = { iso: [0.55, -0.9, 0.75], top: [0, -0.001, 1], side: [0, -1, 0.12] };
  const d = new THREE.Vector3(...dirs[kind]).normalize().multiplyScalar(r);
  controls.target.set(0, 0, 2);
  camera.position.copy(d).add(controls.target);
  controls.update();
}
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

(function loop() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
})();

// ---------- Generowanie ----------
let wasm = null;
let result = null;
let pending = false;

function update() {
  saveState();
  material.color.set(state.color);
  if (!wasm || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; regenerate(); });
}

function regenerate() {
  try {
    result = generate(wasm, state);
  } catch (e) {
    console.error(e);
    showWarnings([`Błąd generowania: ${e.message || e}`]);
    return;
  }
  let geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(result.positions, 3));
  geo = toCreasedNormals(geo, THREE.MathUtils.degToRad(35));
  tieMesh.geometry.dispose();
  tieMesh.geometry = geo;

  const [sx, sy, sz] = result.size;
  const vol = result.volume / 1000;
  document.getElementById('stats').innerHTML = `
    <div><span>Wymiary</span><b>${sx.toFixed(1)} × ${sy.toFixed(1)} × ${sz.toFixed(1)} mm</b></div>
    <div><span>Oczka</span><b>${result.params.slotCount} szt.</b></div>
    <div><span>Objętość</span><b>${vol.toFixed(2)} cm³</b></div>
    <div><span>Masa (TPU)</span><b>${(vol * TPU_DENSITY).toFixed(1)} g</b></div>
    <div><span>Trójkąty</span><b>${result.triangles.toLocaleString('pl-PL')}</b></div>`;
  document.getElementById('dims').textContent =
    `${sx.toFixed(1)} × ${sy.toFixed(1)} × ${sz.toFixed(1)} mm`;
  showWarnings(result.warnings);
}

function showWarnings(list) {
  document.getElementById('warnings').innerHTML = list.map((w) => `<li>${w}</li>`).join('');
}

function fileName(ext) {
  const p = result.params;
  return `opaska_${p.length}x${p.width}x${p.thickness}mm_${p.slotCount}oczek${p.copies > 1 ? `_x${p.copies}` : ''}.${ext}`;
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.getElementById('dl-stl').addEventListener('click', () => {
  if (result) download(toSTL(result.positions, fileName('stl')), fileName('stl'));
});
document.getElementById('dl-3mf').addEventListener('click', () => {
  if (result) download(to3MF(result.vertProperties, result.numProp, result.triVerts, 'Opaska'), fileName('3mf'));
});
document.getElementById('reset').addEventListener('click', () => {
  state = { ...DEFAULTS, color: state.color };
  for (const k in inputs) inputs[k].set(state[k]);
  update();
  setView('iso');
});

buildControls();
resize();
setView('iso');

Module({ locateFile: () => wasmUrl }).then((m) => {
  m.setup();
  m.setMinCircularAngle(6);
  m.setMinCircularEdgeLength(0.25);
  wasm = m;
  document.getElementById('loading').remove();
  update();
}).catch((e) => {
  document.getElementById('loading').textContent = `Nie udało się załadować silnika geometrii: ${e.message || e}`;
});
