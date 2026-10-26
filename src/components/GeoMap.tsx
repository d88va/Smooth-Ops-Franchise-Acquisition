import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { useId, useMemo, useRef, useState } from 'react';
import geo from '../data/karnataka.geo.json';
import { CITIES, cityByName, pinPosition } from '../data/cityGeo';
import type { Dataset, EngineResult } from '../engine';
import type { Layers } from '../state/store';
import { MarkShape, OUTCOME_COLOR } from './ui';

const W = 680;
const H = 800;
const STATE = geo as unknown as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { district: string }>;
const INK = '#17263A';
const CONTOUR = '#3F5F80';
const RULE = '#B4BFBD';
const SHEET = '#F5F7F6';

interface Props {
  ds: Dataset;
  result: EngineResult;
  /** Result before the last change; used to draw the struck-through old marker next to changed pins. */
  prev?: EngineResult | null;
  focus: string; // 'state' | city name
  selected: string | null;
  changed: string[];
  visible: Set<string> | null;
  layers: Layers;
  onSelect?: (id: string) => void;
  onFocus?: (city: string) => void;
  compact?: boolean;
  inset?: boolean;
}

/** Scalloped outline: the revision cloud a draftsman draws around anything changed since the last issue. */
function cloudPath(cx: number, cy: number, R: number): string {
  const n = 11;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as const;
  });
  const chord = 2 * R * Math.sin(Math.PI / n);
  const r = chord * 0.58;
  return `M${pts[0][0]} ${pts[0][1]}` + pts.slice(1).concat([pts[0]]).map((p) => ` A${r} ${r} 0 0 1 ${p[0]} ${p[1]}`).join('');
}

export function GeoMap({ ds, result, prev, focus, selected, changed, visible, layers, onSelect, onFocus, compact, inset }: Props) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hv = (id: string, e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) setHover({ id, x: Math.max(0, Math.min(e.clientX - r.left, r.width - 250)), y: e.clientY - r.top });
  };
  const cityFocus = focus !== 'state' ? cityByName(focus) : null;
  const zoom = cityFocus ? 1 : 0;

  const proj = useMemo(() => {
    if (cityFocus) {
      const span = cityFocus.name === 'Bengaluru' ? 0.22 : 0.12;
      return geoMercator().center([cityFocus.lng, cityFocus.lat]).scale(W / ((span * Math.PI) / 180)).translate([W / 2, H / 2]);
    }
    return geoMercator().fitExtent([[56, 56], [W - 56, H - 56]], STATE);
  }, [cityFocus]);
  const path = useMemo(() => geoPath(proj), [proj]);
  const P = (lat: number, lng: number) => proj([lng, lat]) as [number, number];

  const districts = useMemo(
    () => STATE.features.map((f) => ({ name: f.properties.district, d: path(f) ?? '', c: proj(geoCentroid(f)) as [number, number] })),
    [path, proj],
  );

  const appPos = useMemo(() => {
    const m = new Map<string, [number, number]>();
    const groups = new Map<string, string[]>();
    for (const a of ds.applications) if (a.pin) groups.set(a.pin, [...(groups.get(a.pin) ?? []), a.id]);
    for (const a of ds.applications) {
      if (!a.pin) continue;
      const pp = pinPosition(a.pin, a.city);
      if (!pp) continue;
      const [x, y] = P(pp.lat, pp.lng);
      const g = groups.get(a.pin) as string[];
      const i = g.indexOf(a.id);
      const ang = (i / Math.max(g.length, 1)) * Math.PI * 2 + 0.6;
      const r = g.length > 1 ? (zoom ? 15 : 7) : 0;
      m.set(a.id, [x + r * Math.cos(ang), y + r * Math.sin(ang)]);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, proj]);

  const terrPos = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const t of ds.territories) {
      const pts = t.pins.map((p) => pinPosition(p, t.city)).filter(Boolean) as { lat: number; lng: number }[];
      const c = cityByName(t.city);
      if (!pts.length && !c) continue;
      const lat = pts.length ? pts.reduce((s, p) => s + p.lat, 0) / pts.length : (c as NonNullable<typeof c>).lat;
      const lng = pts.length ? pts.reduce((s, p) => s + p.lng, 0) / pts.length : (c as NonNullable<typeof c>).lng;
      m.set(t.id, P(lat, lng));
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, proj]);

  const filled = new Map(result.territories.map((t) => [t.territory.id, t.filled]));
  const bubbles = useMemo(() => {
    const list: { key: string; x: number; y: number; open: number; total: number; label: string; city?: string }[] = [];
    if (cityFocus) {
      for (const t of ds.territories) {
        if (t.city !== cityFocus.name) continue;
        const pos = terrPos.get(t.id);
        if (!pos) continue;
        const f = filled.get(t.id) ?? 0;
        list.push({ key: t.id, x: pos[0], y: pos[1], open: Math.max(0, t.slots - f), total: t.slots, label: t.id });
      }
      return list;
    }
    const byCity = new Map<string, typeof ds.territories>();
    for (const t of ds.territories) byCity.set(t.city, [...(byCity.get(t.city) ?? []), t]);
    for (const [city, ts] of byCity) {
      const c = cityByName(city);
      if (!c) continue;
      const open = ts.reduce((s, t) => s + Math.max(0, t.slots - (filled.get(t.id) ?? 0)), 0);
      const total = ts.reduce((s, t) => s + t.slots, 0);
      const [x, y] = P(c.lat, c.lng);
      list.push({ key: city, x, y, open, total, label: ts.length > 1 ? `${ts.length} territories` : ts[0].id, city });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, result, proj]);

  const showCity = (name: string) => !cityFocus || cityFocus.name === name;
  const mk = (zoom ? 24 : 15) * (compact ? 0.9 : 1);
  const catch_ = zoom ? 46 : 12;
  const inBox = (x: number, y: number) => x > 30 && y > 30 && x < W - 30 && y < H - 30;
  const id = (s: string) => `${s}-${uid}`;
  const halo = { paintOrder: 'stroke', stroke: SHEET, strokeWidth: 3, strokeLinejoin: 'round' } as const;

  const gridLng: number[] = [];
  const gridLat: number[] = [];
  if (!inset) {
    if (cityFocus) {
      const step = 0.05;
      for (let v = Math.ceil((cityFocus.lng - 0.15) / step) * step; v < cityFocus.lng + 0.15; v += step) gridLng.push(+v.toFixed(2));
      for (let v = Math.ceil((cityFocus.lat - 0.15) / step) * step; v < cityFocus.lat + 0.15; v += step) gridLat.push(+v.toFixed(2));
    } else {
      for (let v = 74; v <= 79; v++) gridLng.push(v);
      for (let v = 11; v <= 19; v++) gridLat.push(v);
    }
  }

  const selectKey = (aid: string) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect?.(aid);
    }
  };

  return (
    <div ref={wrap} className="relative h-full w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="group" aria-label={`Map of Karnataka franchise territories${cityFocus ? ', zoomed into ' + cityFocus.name : ''}. Pin positions are approximate.`}>
        <defs>
          <clipPath id={id('sheet')}><rect x={22} y={22} width={W - 44} height={H - 44} /></clipPath>
        </defs>
        <rect width={W} height={H} fill={SHEET} />

        <g clipPath={`url(#${id('sheet')})`}>
          {/* graticule */}
          {gridLng.map((v) => { const x = P(cityFocus ? cityFocus.lat : 15, v)[0]; return <line key={'gx' + v} x1={x} x2={x} y1={0} y2={H} stroke={RULE} strokeWidth={0.7} />; })}
          {gridLat.map((v) => { const y = P(v, cityFocus ? cityFocus.lng : 76)[1]; return <line key={'gy' + v} x1={0} x2={W} y1={y} y2={y} stroke={RULE} strokeWidth={0.7} />; })}

          {/* state outline, then district fill, then district borders */}
          <g>
            {districts.map((d) => <path key={'o' + d.name} d={d.d} fill={INK} stroke={INK} strokeWidth={zoom ? 5 : 3.6} strokeLinejoin="round" />)}
            {districts.map((d) => <path key={'f' + d.name} d={d.d} fill="#EEF2F0" stroke="#EEF2F0" strokeWidth={2} />)}
            {districts.map((d) => <path key={'b' + d.name} d={d.d} fill="none" stroke={CONTOUR} strokeOpacity={0.55} strokeWidth={zoom ? 1.1 : 0.7} strokeLinejoin="round" />)}
          </g>

          {!compact && !inset && !zoom &&
            districts.map((d) => (d.c && inBox(d.c[0], d.c[1]) ? (
              <text key={'t' + d.name} x={d.c[0]} y={d.c[1]} textAnchor="middle" fontSize={8.5} fill={CONTOUR} opacity={0.8} fontFamily="IBM Plex Sans Condensed, sans-serif" fontStyle="italic" style={halo}>{d.name}</text>
            ) : null))}

          {/* city names, each with a small survey cross on its centre */}
          {!compact && !inset &&
            CITIES.filter((c) => showCity(c.name)).map((c) => {
              const [x, y] = P(c.lat, c.lng);
              if (!inBox(x, y)) return null;
              return (
                <g key={c.name}>
                  {!zoom && <path d={`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`} stroke={INK} strokeWidth={1} />}
                  <text x={zoom ? 36 : x + 8} y={zoom ? 56 : y + 14} fontSize={zoom ? 26 : 12} fontWeight={600} fill={INK} fontFamily="IBM Plex Sans Condensed, sans-serif" style={halo}>{c.name}</text>
                </g>
              );
            })}

          {/* territories: the bubble is the area the territory covers */}
          {layers.territories &&
            bubbles.map((b) => {
              const r = (b.open > 0 ? 9 + 6.5 * Math.sqrt(b.open) * (zoom ? 2.1 : 1.4) : 6 * (zoom ? 2 : 1)) * (zoom ? 1.3 : 1);
              const clickable = !!b.city && !!onFocus && ds.territories.filter((t) => t.city === b.city).length > 1;
              return (
                <g key={b.key} onClick={() => clickable && onFocus?.(b.city as string)} style={{ cursor: clickable ? 'zoom-in' : 'default' }}>
                  <title>{`${b.label}: ${b.open} of ${b.total} slots open${clickable ? '. Click to zoom in.' : ''}`}</title>
                  <circle cx={b.x} cy={b.y} r={r} fill={CONTOUR} fillOpacity={b.open > 0 ? 0.1 : 0.03} stroke={CONTOUR} strokeWidth={zoom ? 2 : 1.3} strokeDasharray={b.open > 0 ? undefined : '3 3'} />
                  {!compact && !inset && (
                    <text x={b.x} y={b.y - r - (zoom ? 8 : 4)} textAnchor="middle" fontSize={zoom ? 17 : 9} fill={INK} fontFamily="IBM Plex Mono, monospace" style={halo}>
                      {b.label} · {b.open}/{b.total} open
                    </text>
                  )}
                </g>
              );
            })}

          {/* existing stores: small store icon at the centre of the area it covers */}
          {layers.stores &&
            ds.stores.filter((s) => showCity(s.city)).map((s) => {
              const pp = pinPosition(s.pin, s.city);
              if (!pp) return null;
              const [x, y] = P(pp.lat, pp.lng);
              const k = zoom ? 1.7 : 1.15;
              return (
                <g key={s.id}>
                  <title>{`Existing store ${s.id}, pin ${s.pin}`}</title>
                  <circle cx={x} cy={y} r={catch_} fill={INK} fillOpacity={0.05} stroke={INK} strokeWidth={zoom ? 1.6 : 1} />
                  <path d={`M${x - 5 * k} ${y + 5 * k}V${y - 1 * k}M${x + 5 * k} ${y + 5 * k}V${y - 1 * k}`} stroke={INK} strokeWidth={1.2} fill="none" />
                  <path d={`M${x - 6 * k} ${y - 1 * k}L${x - 4.5 * k} ${y - 5.5 * k}H${x + 4.5 * k}L${x + 6 * k} ${y - 1 * k}Z`} fill={INK} />
                  <path d={`M${x - 5 * k} ${y + 5 * k}H${x + 5 * k}`} stroke={INK} strokeWidth={1.2} />
                  {!compact && !inset && zoom > 0 && <text x={x + 12} y={y + 32} fontSize={14} fill={INK} fontFamily="IBM Plex Mono, monospace" style={halo}>{s.id} · {s.pin}</text>}
                </g>
              );
            })}

          {layers.rings &&
            ds.applications.filter((a) => result.decisions[a.id].outcome === 'Approved' && showCity(a.city ?? '')).map((a) => {
              const p = appPos.get(a.id);
              return p ? <circle key={'r' + a.id} cx={p[0]} cy={p[1]} r={catch_ * 0.45} fill="none" stroke={OUTCOME_COLOR.Approved} strokeWidth={1.4} strokeDasharray="3 3" /> : null;
            })}

          {layers.arcs &&
            ds.applications.map((a) => {
              const d = result.decisions[a.id];
              const from = appPos.get(a.id);
              if (!from) return null;
              let to: [number, number] | undefined;
              let color = '';
              let dash: string | undefined;
              if (d.outcome === 'Redirect' && d.redirect) {
                const pp = pinPosition(d.redirect.pin, a.city);
                if (pp) to = P(pp.lat, pp.lng);
                color = OUTCOME_COLOR.Redirect;
                dash = '5 4';
              } else if (d.outcome === 'Approved' && d.territoryId) {
                to = terrPos.get(d.territoryId);
                color = OUTCOME_COLOR.Approved;
              }
              if (!to || Math.hypot(to[0] - from[0], to[1] - from[1]) < 3) return null;
              const mx = (from[0] + to[0]) / 2;
              const my = (from[1] + to[1]) / 2 - Math.hypot(to[0] - from[0], to[1] - from[1]) * 0.25;
              return <path key={'a' + a.id} d={`M${from[0]} ${from[1]} Q${mx} ${my} ${to[0]} ${to[1]}`} fill="none" stroke={color} strokeWidth={1.8} strokeDasharray={dash} />;
            })}

          {/* applicants */}
          {layers.applicants &&
            ds.applications.map((a) => {
              const p = appPos.get(a.id);
              if (!p) return null;
              if (cityFocus && a.city !== cityFocus.name) return null;
              const d = result.decisions[a.id];
              const c = OUTCOME_COLOR[d.outcome];
              const dim = visible && !visible.has(a.id);
              const isChanged = changed.includes(a.id);
              const was = prev?.decisions[a.id]?.outcome;
              const R = mk * 1.25;
              return (
                <g key={a.id} opacity={dim ? 0.2 : 1} style={{ cursor: onSelect ? 'pointer' : 'default' }} onClick={() => onSelect?.(a.id)}
                  role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : undefined} onKeyDown={onSelect ? selectKey(a.id) : undefined}
                  aria-label={`${a.id}, ${a.name}: ${d.outcome}${isChanged ? ', changed' : ''}`}
                  onMouseEnter={(e) => !compact && hv(a.id, e)} onMouseMove={(e) => !compact && hv(a.id, e)} onMouseLeave={() => setHover(null)}>
                  <circle cx={p[0]} cy={p[1]} r={mk * 0.5 + 12} fill="transparent" />
                  <circle cx={p[0]} cy={p[1]} r={mk * 1.05} fill={c} fillOpacity={0.16} stroke={c} strokeWidth={1} />
                  {isChanged && <path d={cloudPath(p[0], p[1], R)} pathLength={1} fill="none" stroke={c} strokeWidth={2.8} strokeLinejoin="round" className="rev-cloud" />}
                  {isChanged && <path d={cloudPath(p[0], p[1], R)} fill="none" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />}
                  {selected === a.id && <circle cx={p[0]} cy={p[1]} r={mk * 0.95} fill="none" stroke={INK} strokeWidth={2.4} strokeDasharray="5 3" />}
                  <MarkShape o={d.outcome} x={p[0]} y={p[1]} size={mk} />
                  {isChanged && was && was !== d.outcome && !compact && !inset && (
                    <g className="rev-ghost" opacity={0.9}>
                      <MarkShape o={was} x={p[0] - R - 4} y={p[1] - R - 2} size={mk * 0.7} />
                      <path d={`M${p[0] - R - 4 - mk * 0.5} ${p[1] - R - 2 + mk * 0.5}L${p[0] - R - 4 + mk * 0.5} ${p[1] - R - 2 - mk * 0.5}`} stroke={INK} strokeWidth={2} />
                    </g>
                  )}
                  {!compact && !inset && zoom > 0 && <text x={p[0] + mk * 0.7 + 4} y={p[1] + 5} fontSize={13} fill={INK} fontFamily="IBM Plex Mono, monospace" style={halo}>{a.id.replace('APP-', '')}</text>}
                </g>
              );
            })}
        </g>

        {/* neatline with coordinate ticks */}
        {!inset && (
          <g>
            {gridLng.map((v) => { const x = P(cityFocus ? cityFocus.lat : 15, v)[0]; return x > 40 && x < W - 40 ? <text key={'lx' + v} x={x} y={16} textAnchor="middle" fontSize={9} fill={INK} fontFamily="IBM Plex Mono, monospace">{v}°E</text> : null; })}
            {gridLat.map((v) => { const y = P(v, cityFocus ? cityFocus.lng : 76)[1]; return y > 40 && y < H - 40 ? <text key={'ly' + v} x={0} y={0} transform={`translate(15 ${y}) rotate(-90)`} textAnchor="middle" fontSize={9} fill={INK} fontFamily="IBM Plex Mono, monospace">{v}°N</text> : null; })}
          </g>
        )}
        <rect x={22} y={22} width={W - 44} height={H - 44} fill="none" stroke={INK} strokeWidth={1.4} />
      </svg>
      {hover && !compact && (() => {
        const a = ds.applications.find((x) => x.id === hover.id);
        const d = result.decisions[hover.id];
        if (!a || !d) return null;
        return (
          <div className="pointer-events-none absolute z-20 max-w-[240px] border border-ink bg-sheet px-3 py-2 text-xs" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <div className="font-cond text-sm font-semibold">{a.id} · {a.name}</div>
            <div className="font-medium">{d.outcome}, score {d.score}</div>
            <div className="mt-0.5 text-soft">{d.headline}</div>
            <div className="mt-0.5 font-mono text-[10px] text-soft">{a.city} {a.pinRaw}</div>
          </div>
        );
      })()}
    </div>
  );
}
