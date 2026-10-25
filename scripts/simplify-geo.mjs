// Simplifies a Karnataka districts GeoJSON (source: udit-001/india-maps-data, 2011 district boundaries) for bundling.
// usage: node scripts/simplify-geo.mjs <input.geojson> <output.json> [tolerance-degrees]
import { readFileSync, writeFileSync } from 'node:fs';

const [, , inp, out, tolArg] = process.argv;
const tol = parseFloat(tolArg ?? '0.004');
const g = JSON.parse(readFileSync(inp, 'utf8'));

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const round = (p) => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
const ring = (r) => {
  const s = rdp(r, tol).map(round);
  return s.length >= 4 ? s : r.map(round);
};
let pts = 0;
const features = g.features.map((f) => {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const np = polys.map((p) => p.map(ring));
  np.forEach((p) => p.forEach((r) => (pts += r.length)));
  return { type: 'Feature', properties: { district: f.properties.district }, geometry: { type: 'MultiPolygon', coordinates: np } };
});
writeFileSync(out, JSON.stringify({ type: 'FeatureCollection', name: 'Karnataka districts (simplified, 2011 boundaries)', features }));
console.log(`${features.length} districts, ${pts} points`);
