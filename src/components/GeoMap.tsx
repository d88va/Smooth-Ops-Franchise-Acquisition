import { geoCentroid, geoMercator, geoPath } from 'd3-geo';
import { useId, useMemo, useRef, useState } from 'react';
import geo from '../data/karnataka.geo.json';
import { CITIES, cityByName, pinPosition } from '../data/cityGeo';
import type { Dataset, EngineResult } from '../engine';
import type { Layers } from '../state/store';
import { OUTCOME_COLOR, PRIORITY_COLOR } from './ui';

const W = 800;
const H = 800;
const STATE = geo as unknown as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { district: string }>;
const GLOW = { High: '#ff6a3d', Medium: '#ffb02e', Low: '#7aa7d9' } as const;

interface Props {
  ds: Dataset;
  result: EngineResult;
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

export function GeoMap({ ds, result, focus, selected, changed, visible, layers, onSelect, onFocus, compact, inset }: Props) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hv = (id: string, e: React.MouseEvent) => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) setHover({ id, x: Math.min(e.clientX - r.left, r.width - 250), y: e.clientY - r.top });
  };
  const cityFocus = focus !== 'state' ? cityByName(focus) : null;
  const zoom = cityFocus ? 1 : 0;

  const proj = useMemo(() => {
    if (cityFocus) {
      const span = cityFocus.name === 'Bengaluru' ? 0.22 : 0.12;
      return geoMercator().center([cityFocus.lng, cityFocus.lat]).scale(W / ((span * Math.PI) / 180)).translate([W / 2, H / 2]);
    }
    return geoMercator().fitExtent([[44, 44], [W - 44, H - 44]], STATE);
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
      const r = g.length > 1 ? (zoom ? 11 : 4) : 0;
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
    const list: { key: string; x: number; y: number; open: number; total: number; priority: 'High' | 'Medium' | 'Low'; label: string; city?: string }[] = [];
    if (cityFocus) {
      for (const t of ds.territories) {
        if (t.city !== cityFocus.name) continue;
        const pos = terrPos.get(t.id);
        if (!pos) continue;
        const f = filled.get(t.id) ?? 0;
        list.push({ key: t.id, x: pos[0], y: pos[1], open: Math.max(0, t.slots - f), total: t.slots, priority: t.priority, label: t.id });
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
      const pr = (['High', 'Medium', 'Low'] as const).find((p) => ts.some((t) => t.priority === p)) ?? 'Medium';
      const [x, y] = P(c.lat, c.lng);
      list.push({ key: city, x, y, open, total, priority: pr, label: ts.length > 1 ? `${ts.length} terr.` : ts[0].id, city });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds, result, proj]);

  const showCity = (name: string) => !cityFocus || cityFocus.name === name;
  const dotR = (zoom ? 6.5 : 4.4) * (compact ? 0.9 : 1);
  const catch_ = zoom ? 46 : 12;
  const inBox = (x: number, y: number) => x > -30 && y > -30 && x < W + 30 && y < H + 30;
  const id = (s: string) => `${s}-${uid}`;

  return (
    <div ref={wrap} className="relative h-full w-full select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Map of Karnataka franchise territories${cityFocus ? ', zoomed into ' + cityFocus.name : ''}`}>
        <defs>
          <radialGradient id={id('bg')} cx="50%" cy="45%" r="80%">
            <stop offset="0%" stopColor="#10161e" />
            <stop offset="100%" stopColor="#07090c" />
          </radialGradient>
          {(['High', 'Medium', 'Low'] as const).map((p) => (
            <radialGradient key={p} id={id('glow' + p)}>
              <stop offset="0%" stopColor={GLOW[p]} stopOpacity="0.75" />
              <stop offset="45%" stopColor={GLOW[p]} stopOpacity="0.28" />
              <stop offset="100%" stopColor={GLOW[p]} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id={id('heat')}>
            <stop offset="0%" stopColor="#ffd04a" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#ff9d2e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={id('clip')}>{districts.map((d) => <path key={d.name} d={d.d} />)}</clipPath>
          {/* faint "street grid" texture, clipped to the state */}
          <pattern id={id('grid1')} width={zoom ? 46 : 20} height={zoom ? 46 : 20} patternUnits="userSpaceOnUse" patternTransform="rotate(17)">
            <path d={`M0 0H${zoom ? 46 : 20}M0 0V${zoom ? 46 : 20}`} stroke="#2d3a4a" strokeWidth="0.5" fill="none" />
          </pattern>
          <pattern id={id('grid2')} width={zoom ? 120 : 52} height={zoom ? 120 : 52} patternUnits="userSpaceOnUse" patternTransform="rotate(-48)">
            <path d={`M0 0H${zoom ? 120 : 52}`} stroke="#35465a" strokeWidth="0.7" fill="none" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill={`url(#${id('bg')})`} />

        {/* state: glow under, fill, texture, district borders */}
        <g>
          <g style={{ filter: 'blur(5px)' }}>{districts.map((d) => <path key={'g' + d.name} d={d.d} fill="#f5b942" fillOpacity="0.05" stroke="#f5b942" strokeOpacity="0.22" strokeWidth={zoom ? 14 : 9} strokeLinejoin="round" />)}</g>
          {districts.map((d) => <path key={'f' + d.name} d={d.d} fill="#141b25" stroke="#141b25" strokeWidth={2} />)}
          <g clipPath={`url(#${id('clip')})`}>
            <rect width={W} height={H} fill={`url(#${id('grid1')})`} opacity="0.55" />
            <rect width={W} height={H} fill={`url(#${id('grid2')})`} opacity="0.5" />
          </g>
          {districts.map((d) => <path key={'b' + d.name} d={d.d} fill="none" stroke="#3b4c61" strokeOpacity="0.7" strokeWidth={zoom ? 1.2 : 0.7} strokeLinejoin="round" />)}
        </g>

        {/* district names */}
        {!compact && !inset && !zoom &&
          districts.map((d) => (d.c && inBox(d.c[0], d.c[1]) ? (
            <text key={'t' + d.name} x={d.c[0]} y={d.c[1]} textAnchor="middle" fontSize={8} fill="#6b7f96" opacity={0.55} fontFamily="Space Grotesk Variable, sans-serif" letterSpacing="0.1em" style={{ textTransform: 'uppercase' }}>
              {d.name}
            </text>
          ) : null))}

        {/* city labels */}
        {!compact && !inset &&
          CITIES.filter((c) => showCity(c.name)).map((c) => {
            const [x, y] = P(c.lat, c.lng);
            if (!inBox(x, y)) return null;
            return (
              <g key={c.name} opacity={0.9}>
                {!zoom && <circle cx={x} cy={y} r={1.8} fill="#c5d2e2" />}
                <text x={zoom ? 24 : x + 8} y={zoom ? 44 : y + 14} fontSize={zoom ? 26 : 11} fill="#c5d2e2" fontFamily="Space Grotesk Variable, sans-serif" fontWeight={600} letterSpacing="0.08em" style={{ textTransform: 'uppercase' }}>
                  {c.name}
                </text>
              </g>
            );
          })}

        {/* heat layer */}
        {layers.heat && (
          <g opacity={0.9} style={{ mixBlendMode: 'screen' }}>
            {ds.applications.map((a) => {
              const p = appPos.get(a.id);
              return p ? <circle key={a.id} cx={p[0]} cy={p[1]} r={zoom ? 70 : 34} fill={`url(#${id('heat')})`} /> : null;
            })}
          </g>
        )}

        {/* territory hotspots */}
        {layers.territories &&
          bubbles.map((b) => {
            const base = b.open > 0 ? 9 + 6.5 * Math.sqrt(b.open) * (zoom ? 2.1 : 1.4) : 6 * (zoom ? 2 : 1);
            const r = base * (zoom ? 1.3 : 1);
            const c = PRIORITY_COLOR[b.priority];
            const clickable = !!b.city && !!onFocus && ds.territories.filter((t) => t.city === b.city).length > 1;
            return (
              <g key={b.key} onClick={() => clickable && onFocus?.(b.city as string)} style={{ cursor: clickable ? 'zoom-in' : 'default' }}>
                <circle cx={b.x} cy={b.y} r={r * 2.3} fill={`url(#${id('glow' + b.priority)})`} opacity={b.open > 0 ? 1 : 0.35} style={{ transition: 'r 600ms ease' }} />
                <circle cx={b.x} cy={b.y} r={r} fill={GLOW[b.priority] + (b.open > 0 ? '22' : '0d')} stroke={GLOW[b.priority]} strokeOpacity={0.85} strokeWidth={zoom ? 2 : 1.2} strokeDasharray={b.open > 0 ? undefined : '3 3'} style={{ transition: 'r 600ms ease' }} />
                <circle cx={b.x} cy={b.y} r={zoom ? 5 : 2.6} fill={GLOW[b.priority]} opacity={b.open > 0 ? 1 : 0.5} />
                {!compact && !inset && (
                  <text x={b.x} y={b.y + (zoom ? -r - 8 : -r - 4)} textAnchor="middle" fontSize={zoom ? 18 : 9} fill={c} fontFamily="JetBrains Mono, monospace" opacity={0.95}>
                    {b.label} · {b.open}/{b.total}
                  </text>
                )}
              </g>
            );
          })}

        {/* existing stores */}
        {layers.stores &&
          ds.stores.filter((s) => showCity(s.city)).map((s) => {
            const pp = pinPosition(s.pin, s.city);
            if (!pp) return null;
            const [x, y] = P(pp.lat, pp.lng);
            const k = zoom ? 1.6 : 1;
            return (
              <g key={s.id}>
                <circle cx={x} cy={y} r={catch_} fill="none" stroke="#cdd6e2" strokeOpacity={0.6} strokeWidth={zoom ? 2 : 1.2} />
                {layers.rings && <circle cx={x} cy={y} r={catch_ * 0.45} fill="#ff5d6c10" stroke="#ff5d6c" strokeOpacity={0.55} strokeDasharray="2 3" />}
                <path d={`M${x - 5 * k} ${y + 3 * k} v${-5 * k} l${5 * k} ${-4 * k} l${5 * k} ${4 * k} v${5 * k} z`} fill="#0a0f15" stroke="#e7edf5" strokeWidth={1.2} />
                {!compact && !inset && zoom > 0 && <text x={x + 12} y={y + 30} fontSize={14} fill="#aab7c7" fontFamily="JetBrains Mono, monospace">{s.id} · {s.pin}</text>}
              </g>
            );
          })}

        {/* approved partner spacing rings */}
        {layers.rings &&
          ds.applications.filter((a) => result.decisions[a.id].outcome === 'Approved' && showCity(a.city ?? '')).map((a) => {
            const p = appPos.get(a.id);
            return p ? <circle key={'r' + a.id} cx={p[0]} cy={p[1]} r={catch_ * 0.45} fill="none" stroke="#3ddc97" strokeOpacity={0.5} strokeDasharray="2 3" /> : null;
          })}

        {/* flow arcs */}
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
            return <path key={'a' + a.id} d={`M${from[0]} ${from[1]} Q${mx} ${my} ${to[0]} ${to[1]}`} fill="none" stroke={color} strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray={dash} />;
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
            const pulsing = changed.includes(a.id);
            return (
              <g key={a.id} opacity={dim ? 0.15 : 1} style={{ cursor: onSelect ? 'pointer' : 'default' }} onClick={() => onSelect?.(a.id)}
                onMouseEnter={(e) => !compact && hv(a.id, e)} onMouseMove={(e) => !compact && hv(a.id, e)} onMouseLeave={() => setHover(null)}>
                {pulsing && <circle cx={p[0]} cy={p[1]} r={dotR} fill="none" stroke={c} strokeWidth={2} className="pulse-ring" />}
                {pulsing && <circle cx={p[0]} cy={p[1]} r={dotR} fill="none" stroke={c} strokeWidth={2} className="pulse-ring" style={{ animationDelay: '0.6s' }} />}
                <circle cx={p[0]} cy={p[1]} r={dotR + 6} fill="transparent" />
                <circle cx={p[0]} cy={p[1]} r={dotR * 2.2} fill={c} opacity={0.18} />
                <circle cx={p[0]} cy={p[1]} r={dotR} fill={c} stroke={selected === a.id ? '#fff' : '#0a0f15'} strokeWidth={selected === a.id ? 2.4 : 1.2} style={{ transition: 'fill 500ms', filter: `drop-shadow(0 0 4px ${c})` }} />
                {!compact && !inset && zoom > 0 && <text x={p[0] + dotR + 4} y={p[1] + 4} fontSize={13} fill={c} fontFamily="JetBrains Mono, monospace">{a.id.replace('APP-', '')}</text>}
              </g>
            );
          })}
      </svg>
      {hover && !compact && (() => {
        const a = ds.applications.find((x) => x.id === hover.id);
        const d = result.decisions[hover.id];
        if (!a || !d) return null;
        return (
          <div className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-white/10 bg-ink-900/90 px-3 py-2 text-xs shadow-xl backdrop-blur" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <div className="font-display text-sm text-white">{a.id} · {a.name}</div>
            <div style={{ color: OUTCOME_COLOR[d.outcome] }} className="font-medium">{d.outcome} · score {d.score}</div>
            <div className="mt-0.5 text-slate-400">{d.headline}</div>
            <div className="mt-0.5 font-mono text-[10px] text-slate-500">{a.city} {a.pinRaw}</div>
          </div>
        );
      })()}
    </div>
  );
}
