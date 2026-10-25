import type { Application, Dataset, Floor, Lang, Space, Territory } from '../engine/types';
import { EXISTING_STORES } from './existingStores';

type R = [id: string, name: string, city: string, pin: string, inv: number | null, exp: number | null, biz: string, space: Space | null, size: number | null, floor: Floor | null, launch: number | null, lang: string, notes: string];

const rows: R[] = [
  ['APP-001', 'Rohan Gowda', 'Bengaluru', '560008', 85, 6, 'Runs 3 footwear outlets in Jayanagar', 'Owned', 600, 'Ground', 4, 'English', 'Ready to sign this month'],
  ['APP-002', 'Meera Nair', 'Bengaluru', '560008', 70, 4, 'Apparel boutique owner', 'Rented', 450, 'Ground', 3, 'English', 'Same lane as another applicant, open to alternatives'],
  ['APP-003', 'Suresh Patil', 'Bengaluru', '560001', 90, 5, 'Electronics retail, 2 shops', 'Rented', 500, 'Ground', 4, 'Hindi', ''],
  ['APP-004', 'Anitha Kumari', 'Bengaluru', '560043', 55, 2, 'Grocery store (2 years)', 'Rented', 300, 'Upper', 3, 'Kannada', 'ok with upper floor'],
  ['APP-005', 'Vikram Rao', 'Bengaluru', '560048', 38, 3, 'Apparel shop', 'Rented', 350, 'Ground', 3, 'English', 'can stretch a little'],
  ['APP-006', 'Deepa Shetty', 'Mangaluru', '575003', 45, 3, 'Eyewear dispensing optician', 'Owned', 400, 'Ground', 3, 'Kannada', 'Own shop near Hampankatta'],
  ['APP-007', 'Karthik Reddy', 'Mysuru', '570001', 60, 5, 'Ran an apparel showroom for 5 years', 'Not yet identified', null, 'Not known', 2, 'Kannada', 'Still looking for a shop near Devaraja market'],
  ['APP-008', 'Farhan Sheikh', 'Mysuru', '570017', 50, 2, 'Grocery wholesale', 'Rented', 300, 'Ground', 3, 'Hindi', 'Has a shop in mind'],
  ['APP-009', 'Lakshmi Hegde', 'Mysuru', '570023', 48, 2, 'Small apparel shop', 'Rented', 280, 'Ground', 4, 'Kannada', ''],
  ['APP-010', 'Ganesh Naik', 'Belagavi', '590006', 40, 1, 'Family kirana store', 'Rented', 300, 'Ground', 4, 'Kannada', 'Brother runs the existing shop'],
  ['APP-011', 'Sneha Kulkarni', 'Belagavi', '590006', 65, 3, 'Apparel retailer', 'Rented', 400, 'Mall unit', 3, 'English', 'City Centre Mall unit available'],
  ['APP-012', 'Imran Pasha', 'Mysuru', '570023', 75, 6, 'Footwear retail for 6 years', 'Not yet identified', 300, 'Ground', 5, 'English', 'Negotiating for a shop, not signed'],
  ['APP-013', 'Pooja Joshi', 'Hubballi-Dharwad', '580021', 55, 4, 'Electronics retail', 'Owned', 500, 'Ground', 3, 'Kannada', ''],
  ['APP-014', 'Mahesh Kamath', 'Tumakuru', '572101', 45, 8, 'Owner of a 4-shop footwear chain', 'Owned', 450, 'Ground', 4, 'Kannada', 'Wants a base in Tumakuru'],
  ['APP-015', 'Shruti Bhat', 'Tumakuru', '572102', 12, 1, 'Tailoring', 'Rented', 220, 'Ground', 3, 'Kannada', ''],
  ['APP-016', 'Raju Patel', 'Davanagere', '577001', 150, 0, 'NRI investor, no retail background', 'Rented', 120, 'Upper', 6, 'English', 'Big budget, small first-floor unit'],
  ['APP-017', 'Sunita Desai', 'Bengaluru', '560090', 60, 2, 'Mobile accessories franchise', 'Rented', 320, 'Ground', 3, 'English', 'Pin is near Kodigehalli'],
  ['APP-018', 'Arun Menon', 'Bengaluru', '560035', 80, 4, 'Pharmacy chain manager', 'Owned', 500, 'Ground', 3, 'English', ''],
  ['APP-019', 'Kavya Murthy', 'Mysuru', '560012', 50, 3, 'Garments', 'Rented', 300, 'Ground', 3, 'Kannada', 'Typed an old address maybe'],
  ['APP-020', 'Zainab Khan', 'Bengaluru', '56003', 65, 3, 'Fashion accessories shop', 'Rented', 340, 'Ground', 3, 'Hindi', ''],
  ['APP-021', 'Nikhil Verma', 'Bengaluru', '560100', 70, 0, 'Runs a chain of 5 shops (family business)', 'Rented', 400, 'Ground', 6, 'Hindi', 'I already run a chain of 5 shops since 2012'],
  ['APP-022', 'Divya Rao', 'Bengaluru', '560078', 50, 1, 'Small boutique', 'Rented', 200, 'Ground', 3, 'Kannada', ''],
  ['APP-023', 'Anand Kulkarni', 'Mangaluru', '575006', 30, 3, 'Retail', 'Not yet identified', null, null, 1, 'Kannada', 'want to open ASAP'],
  ['APP-024', 'Deepa Shetty', 'Mangaluru', '575003', 45, 3, 'Eyewear dispensing optician', 'Owned', 400, 'Ground', 3, 'Kannada', 'applied twice by mistake'],
  ['APP-025', 'Rekha Poojary', 'Mangaluru', '575006', 40, 2, 'Garments', 'Rented', 300, 'Ground', 3, 'Tulu', 'Prefers Tulu if possible'],
];

const TERS: Territory[] = [
  { id: 'TER-01', city: 'Bengaluru', state: 'Karnataka', pins: ['560001', '560008', '560025', '560034', '560035'], tier: 1, slots: 2, priority: 'High' },
  { id: 'TER-02', city: 'Bengaluru', state: 'Karnataka', pins: ['560038', '560043', '560048', '560066', '560103'], tier: 1, slots: 2, priority: 'High' },
  { id: 'TER-03', city: 'Bengaluru', state: 'Karnataka', pins: ['560076', '560078', '560085', '560100', '560061'], tier: 1, slots: 2, priority: 'Medium' },
  { id: 'TER-04', city: 'Mysuru', state: 'Karnataka', pins: ['570001', '570009', '570017', '570023'], tier: 2, slots: 1, priority: 'Medium' },
  { id: 'TER-05', city: 'Mangaluru', state: 'Karnataka', pins: ['575001', '575002', '575003', '575006'], tier: 2, slots: 1, priority: 'Medium' },
  { id: 'TER-06', city: 'Hubballi-Dharwad', state: 'Karnataka', pins: ['580001', '580020', '580021', '580030'], tier: 2, slots: 0, priority: 'Medium' },
  { id: 'TER-07', city: 'Belagavi', state: 'Karnataka', pins: ['590001', '590002', '590006'], tier: 2, slots: 1, priority: 'High' },
  { id: 'TER-08', city: 'Tumakuru', state: 'Karnataka', pins: ['572101', '572102', '572103'], tier: 3, slots: 2, priority: 'Low' },
  { id: 'TER-09', city: 'Davanagere', state: 'Karnataka', pins: ['577001', '577002', '577004'], tier: 3, slots: 1, priority: 'Medium' },
];

export function sampleDataset(): Dataset {
  const applications: Application[] = rows.map(([id, name, city, pin, inv, exp, biz, space, size, floor, launch, lang, notes]) => {
    const pf: Application['parseFlags'] = [];
    const language = (['Kannada', 'English', 'Hindi'] as Lang[]).find((l) => l === lang) ?? 'English';
    if (language !== lang) pf.push({ code: 'language-fallback', severity: 'warn', message: `Language "${lang}" is outside Kannada/English/Hindi; falling back to English.` });
    return {
      id, label: id, name, city, state: 'Karnataka', pin: /^\d{6}$/.test(pin) ? pin : null, pinRaw: pin, investment: inv, experience: exp, business: biz,
      space, size, floor, launchMonths: launch, language, notes, parseFlags: pf,
    };
  });
  return { applications, territories: TERS.map((t) => ({ ...t, pins: [...t.pins] })), stores: EXISTING_STORES, warnings: [] };
}

export const SAMPLE_ROWS = rows;
export const SAMPLE_TERRITORIES = TERS;

