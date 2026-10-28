// Parametryczny model opaski do kabli.
// Układ współrzędnych: X wzdłuż paska, Y w poprzek, Z w górę; spód paska na Z = 0.
// Kołek (grzybek) jest przy końcu -X, oczka przy wolnym końcu +X.

export const DEFAULTS = {
  length: 150,        // całkowita długość paska [mm]
  width: 15,          // szerokość paska [mm]
  thickness: 2,       // grubość paska [mm]
  endShape: 'round',  // kształt wolnego końca: round | pointed | square
  slotCount: 10,      // ilość oczek
  slotLength: 4,      // wymiar oczka wzdłuż paska [mm]
  slotWidth: 8,       // wymiar oczka w poprzek paska [mm]
  slotPitch: 8.5,     // rozstaw oczek (środek–środek) [mm]
  slotRadius: 1,      // zaokrąglenie narożników oczka [mm]
  endMargin: 6,       // odstęp ostatniego oczka od wolnego końca [mm]
  pegClearance: 0.2,  // luz szyjki kołka względem oczka (na stronę) [mm]
  capHeight: 2,       // wysokość czapki kołka [mm]
  capOverhang: 0.8,   // nawis czapki poza oczko (na stronę) [mm]
  copies: 1,          // ilość sztuk na stole
};

export const LIMITS = {
  length: [40, 400, 1],
  width: [6, 40, 0.5],
  thickness: [0.8, 6, 0.1],
  slotCount: [0, 60, 1],
  slotLength: [1.5, 15, 0.1],
  slotWidth: [2, 36, 0.1],
  slotPitch: [3, 30, 0.1],
  slotRadius: [0, 5, 0.1],
  endMargin: [1, 50, 0.5],
  pegClearance: [0, 1, 0.05],
  capHeight: [0.6, 6, 0.1],
  capOverhang: [0.2, 3, 0.1],
  copies: [1, 20, 1],
};

const MIN_RIB = 1;      // minimalna ścianka materiału obok oczka [mm]
const PEG_GAP = 12;     // minimalny odstęp pierwszego oczka od kołka [mm]
const COPY_GAP = 4;     // odstęp między kopiami na stole [mm]

const TIP_R = 0.18;    // promień czubka szpica jako ułamek szerokości

const tipLength = (p) => Math.min(p.width * 1.2, p.length / 3);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Sprawdza i koryguje parametry, zwraca poprawione wartości oraz ostrzeżenia.
export function resolveParams(input) {
  const p = { ...DEFAULTS, ...input };
  const warnings = [];

  p.slotWidth = clamp(p.slotWidth, LIMITS.slotWidth[0], p.width - 2 * MIN_RIB);
  p.slotRadius = clamp(p.slotRadius, 0, Math.min(p.slotLength, p.slotWidth) / 2 - 0.01);
  if (p.slotPitch < p.slotLength + MIN_RIB) {
    p.slotPitch = p.slotLength + MIN_RIB;
    warnings.push(`Rozstaw zwiększony do ${p.slotPitch.toFixed(1)} mm (min. ${MIN_RIB} mm mostka między oczkami).`);
  }

  // Kołek mieści się w szerokości paska.
  const neckX = p.slotLength - 2 * p.pegClearance;
  const neckY = p.slotWidth - 2 * p.pegClearance;
  const capX = neckX + 2 * p.capOverhang;
  const capY = Math.min(neckY + 2 * p.capOverhang, p.width);
  const pegX = -p.length / 2 + p.width / 2;

  // Ile oczek realnie się zmieści między kołkiem a wolnym końcem.
  let lastSlotX = p.length / 2 - p.endMargin - p.slotLength / 2;
  if (p.endShape === 'pointed') {
    // W zwężeniu szpica oczko musi zachować ściankę MIN_RIB z obu stron.
    const tipLen = tipLength(p);
    const s = Math.max(0, (p.width - p.slotWidth - 2 * MIN_RIB) / (p.width * (1 - 2 * TIP_R)) * tipLen);
    lastSlotX = Math.min(lastSlotX, p.length / 2 - tipLen + s - p.slotLength / 2);
  }
  const firstAllowed = pegX + capX / 2 + PEG_GAP + p.slotLength / 2;
  const maxSlots = lastSlotX < firstAllowed ? 0 : Math.floor((lastSlotX - firstAllowed) / p.slotPitch) + 1;
  if (p.slotCount > maxSlots) {
    warnings.push(`Przy tej długości mieści się maks. ${maxSlots} oczek.`);
    p.slotCount = maxSlots;
  }

  return { p, warnings, derived: { neckX, neckY, capX, capY, pegX, lastSlotX } };
}

// Zaokrąglony prostokąt wyśrodkowany w (0,0).
function roundedRect(CS, sx, sy, r, track) {
  r = Math.min(r, sx / 2 - 1e-3, sy / 2 - 1e-3);
  if (r <= 0.01) return track(CS.square([sx, sy], true));
  const core = track(CS.square([sx - 2 * r, sy - 2 * r], true));
  return track(core.offset(r, 'Round'));
}

// Obrys paska w 2D.
function strapOutline(CS, p, track) {
  const L = p.length, W = p.width, r = W / 2;
  const head = track(track(CS.circle(r)).translate([-L / 2 + r, 0]));
  if (p.endShape === 'square') {
    const body = track(track(CS.square([L - r, W], true)).translate([r / 2, 0]));
    return track(CS.hull([head, body]));
  }
  if (p.endShape === 'pointed') {
    const tipLen = tipLength(p);
    const body = track(track(CS.square([L - r - tipLen, W], true)).translate([(r - tipLen) / 2, 0]));
    const tip = track(track(CS.circle(W * TIP_R)).translate([L / 2 - W * TIP_R, 0]));
    return track(CS.hull([head, body, tip]));
  }
  const tail = track(track(CS.circle(r)).translate([L / 2 - r, 0]));
  return track(CS.hull([head, tail]));
}

// Buduje bryłę jednej opaski (Manifold). Wszystkie obiekty pośrednie trafiają do `track`.
function buildTie(wasm, p, d, track) {
  const { CrossSection: CS } = wasm;

  let outline = strapOutline(CS, p, track);
  if (p.slotCount > 0) {
    const slot = roundedRect(CS, p.slotLength, p.slotWidth, p.slotRadius, track);
    const holes = [];
    for (let i = 0; i < p.slotCount; i++) {
      holes.push(track(slot.translate([d.lastSlotX - i * p.slotPitch, 0])));
    }
    outline = track(outline.subtract(track(CS.union(holes))));
  }
  const strap = track(outline.extrude(p.thickness));

  // Kołek: szyjka przechodzi przez pasek (grubość + luz), na niej stożkowa czapka.
  const neckH = p.thickness + 0.3;
  const neckR = Math.min(p.slotRadius, 1.2);
  const neck = track(track(roundedRect(CS, d.neckX, d.neckY, neckR, track).extrude(neckH + 0.01))
    .translate([d.pegX, 0, p.thickness]));
  const capBase = roundedRect(CS, d.capX, d.capY, Math.min(d.capX / 2, neckR + p.capOverhang), track);
  const topScale = [Math.max(0.35, d.neckX / d.capX * 0.85), Math.max(0.35, d.neckY / d.capY * 0.85)];
  const cap = track(track(capBase.extrude(p.capHeight, 0, 0, topScale))
    .translate([d.pegX, 0, p.thickness + neckH]));

  return track(wasm.Manifold.union([strap, neck, cap]));
}

// Główna funkcja: zwraca siatkę trójkątów oraz statystyki.
export function generate(wasm, input) {
  const { p, warnings, derived } = resolveParams(input);
  const garbage = [];
  const track = (o) => { garbage.push(o); return o; };
  try {
    const tie = buildTie(wasm, p, derived, track);
    const pitchY = p.width + COPY_GAP;
    let all = tie;
    if (p.copies > 1) {
      const parts = [];
      for (let i = 0; i < p.copies; i++) {
        parts.push(track(tie.translate([0, (i - (p.copies - 1) / 2) * pitchY, 0])));
      }
      all = track(wasm.Manifold.compose(parts));
    }
    const mesh = all.getMesh();
    const positions = new Float32Array(mesh.triVerts.length * 3);
    const np = mesh.numProp, vp = mesh.vertProperties, tv = mesh.triVerts;
    for (let i = 0; i < tv.length; i++) {
      const v = tv[i] * np;
      positions[i * 3] = vp[v];
      positions[i * 3 + 1] = vp[v + 1];
      positions[i * 3 + 2] = vp[v + 2];
    }
    const box = all.boundingBox();
    return {
      params: p,
      warnings,
      positions,                              // nieindeksowane trójkąty (x,y,z)*3
      vertProperties: vp.slice(), numProp: np, triVerts: tv.slice(), // dla 3MF
      triangles: tv.length / 3,
      volume: all.volume(),                   // mm³
      size: [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]],
      genus: tie.genus(),
    };
  } finally {
    for (const o of garbage) o.delete();
  }
}
