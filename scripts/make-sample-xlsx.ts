import * as XLSX from 'xlsx';
import { SAMPLE_ROWS, SAMPLE_TERRITORIES } from '../src/data/sample';
import { EXISTING_STORES } from '../src/data/existingStores';

const apps: unknown[][] = [
  ['Application ID', 'Applicant name', 'City · State · Pin code', 'Investment capacity (₹ lakh)', 'Retail experience (years)', 'Current / past business', 'Space available', 'Space size (sq ft)', 'Floor', 'Target launch (months)', 'Preferred language', 'Notes from applicant'],
];
SAMPLE_ROWS.forEach(([id, name, city, pin, inv, exp, biz, space, size, floor, launch, lang, notes], i) => {
  // a little deliberate messiness so the tolerant parser is exercised
  const invCell = i % 5 === 3 && inv ? `₹${inv}L` : inv;
  const spaceCell = i % 4 === 1 && space ? space.toUpperCase() : space;
  apps.push([id, name, `${city} · Karnataka · ${pin}`, invCell, exp, biz, spaceCell, size, floor, launch, lang, notes]);
});
const ters: unknown[][] = [['Territory ID', 'City · State', 'Pin codes covered', 'City tier', 'Open slots', 'Priority']];
for (const t of SAMPLE_TERRITORIES) ters.push([t.id, `${t.city} · Karnataka`, t.pins.join(', '), `Tier ${t.tier}`, t.slots, t.priority]);
const stores: unknown[][] = [['Store', 'City', 'Pin', 'Opened'], ...EXISTING_STORES.map((s) => [s.id, s.city, s.pin, s.opened])];
const gloss: unknown[][] = [['Term', 'Meaning'], ['Catchment', 'Area a store draws customers from'], ['Cannibalisation', 'A new store taking sales from a nearby store of the same brand']];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(apps), 'Applications');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ters), 'Territories');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stores), 'Existing stores');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(gloss), 'Glossary');
XLSX.writeFile(wb, 'public/sample-applications.xlsx');
console.log('wrote public/sample-applications.xlsx');
