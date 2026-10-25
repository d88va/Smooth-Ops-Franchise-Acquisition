import type { Tier } from '../engine/types';

export interface CityInfo {
  name: string;
  state: string;
  prefix: string;
  tier: Tier;
  lat: number;
  lng: number;
  aliases: string[];
}

export const CITIES: CityInfo[] = [
  { name: 'Bengaluru', state: 'Karnataka', prefix: '560', tier: 1, lat: 12.9716, lng: 77.5946, aliases: ['bangalore', 'bengaluru', 'blr'] },
  { name: 'Mysuru', state: 'Karnataka', prefix: '570', tier: 2, lat: 12.2958, lng: 76.6394, aliases: ['mysore', 'mysuru'] },
  { name: 'Mangaluru', state: 'Karnataka', prefix: '575', tier: 2, lat: 12.9141, lng: 74.856, aliases: ['mangalore', 'mangaluru'] },
  { name: 'Hubballi-Dharwad', state: 'Karnataka', prefix: '580', tier: 2, lat: 15.3647, lng: 75.124, aliases: ['hubballi', 'hubli', 'dharwad', 'dharwar'] },
  { name: 'Belagavi', state: 'Karnataka', prefix: '590', tier: 2, lat: 15.8497, lng: 74.4977, aliases: ['belgaum', 'belagavi'] },
  { name: 'Tumakuru', state: 'Karnataka', prefix: '572', tier: 3, lat: 13.3392, lng: 77.114, aliases: ['tumkur', 'tumakuru'] },
  { name: 'Davanagere', state: 'Karnataka', prefix: '577', tier: 3, lat: 14.4644, lng: 75.9218, aliases: ['davangere', 'davanagere'] },
];

export const cityByName = (n: string | null | undefined) => CITIES.find((c) => c.name === n) ?? null;
export const cityByPrefix = (pin: string | null | undefined) => (pin && pin.length >= 3 ? CITIES.find((c) => c.prefix === pin.slice(0, 3)) ?? null : null);

export function matchCity(text: string): CityInfo | null {
  const t = text.toLowerCase();
  for (const c of CITIES) if (c.aliases.some((a) => t.includes(a))) return c;
  return null;
}

/**
 * Approximate placement for visualisation only: city centre plus a deterministic
 * golden-angle offset derived from the last 3 digits of the pin (a few km).
 */
/**
 * Real coordinates win where known. Add entries as '560001': { lat, lng }; every other pin falls back
 * to the deterministic placement below. These few are approximate locality centres (not surveyed values).
 */
export const PIN_COORDS: Record<string, { lat: number; lng: number }> = {
  '560001': { lat: 12.9757, lng: 77.6055 },
  '560034': { lat: 12.9352, lng: 77.6245 },
  '560038': { lat: 12.9784, lng: 77.6408 },
  '560066': { lat: 12.9698, lng: 77.7499 },
};

export function pinPosition(pin: string, cityName?: string | null): { lat: number; lng: number } | null {
  if (!/^\d{6}$/.test(pin)) return null;
  if (PIN_COORDS[pin]) return PIN_COORDS[pin];
  const c = cityByPrefix(pin) ?? cityByName(cityName);
  if (!c) return null;
  const n = parseInt(pin.slice(3), 10);
  const ang = (n * 137.508 * Math.PI) / 180;
  const r = 0.006 * Math.sqrt(n + 1);
  return { lat: c.lat + r * Math.sin(ang), lng: c.lng + (r * Math.cos(ang)) / Math.cos((c.lat * Math.PI) / 180) };
}
