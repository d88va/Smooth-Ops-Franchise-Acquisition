import { CONFIG } from './config';
import type { Application, Lang, Milestone, Tier, TrainingPlan } from './types';

/** The six core modules are fixed in code; titles are localised so no runtime translation is needed. */
export const CORE_MODULES: Record<Lang, string[]> = {
  English: ['Brand standards', 'POS & inventory', 'Merchandising', 'Customer handling', 'Compliance (GST & licences)', 'Hiring & staff training'],
  Kannada: ['ಬ್ರ್ಯಾಂಡ್ ಮಾನದಂಡಗಳು', 'ಪಿಒಎಸ್ ಮತ್ತು ದಾಸ್ತಾನು ನಿರ್ವಹಣೆ', 'ಮರ್ಚಂಡೈಸಿಂಗ್ (ಉತ್ಪನ್ನ ಪ್ರದರ್ಶನ)', 'ಗ್ರಾಹಕ ಸೇವೆ', 'ಅನುಸರಣೆ (GST ಮತ್ತು ಪರವಾನಗಿ)', 'ಸಿಬ್ಬಂದಿ ನೇಮಕಾತಿ ಮತ್ತು ತರಬೇತಿ'],
  Hindi: ['ब्रांड मानक', 'पीओएस और इन्वेंटरी', 'मर्चेंडाइज़िंग (उत्पाद प्रदर्शन)', 'ग्राहक सेवा', 'अनुपालन (GST और लाइसेंस)', 'स्टाफ भर्ती और प्रशिक्षण'],
};

export function trainingPlan(app: Application, tier: Tier, _territoryId: string | null): TrainingPlan {
  const exp = app.experience ?? 0;
  const lang: Lang = app.language;
  let track: string;
  let trainWeeks: number;
  const extras: string[] = [];
  if (exp <= 0) {
    track = 'Foundation track (first-timer)';
    trainWeeks = CONFIG.stage.training.first;
    extras.push('Shadow week at an existing store');
  } else if (exp < 4) {
    track = 'Standard track (1–3 yrs experience)';
    trainWeeks = CONFIG.stage.training.standard;
  } else {
    track = 'Accelerated track + brand-standards module (4+ yrs)';
    trainWeeks = CONFIG.stage.training.accelerated;
    extras.push('Brand-standards deep-dive (look, feel, service script)');
  }
  if (tier === 1) {
    extras.push('High-volume operations & peak-hour flow');
    trainWeeks += 1;
  }
  if (tier === 3) extras.push('Local marketing & community outreach');
  const modules = [...CORE_MODULES[lang].map((m, i) => (lang === 'English' ? m : `${m} (${CORE_MODULES.English[i]})`)), ...extras];

  const known = app.space === 'Owned' || app.space === 'Rented';
  const S = CONFIG.stage;
  const wAgree = S.agreement;
  const wSpace = known ? wAgree + S.spaceSignoff : wAgree + S.spaceSearch + S.spaceSignoff;
  const wTrainEnd = wAgree + trainWeeks;
  const wFit = wSpace + S.fitout[tier];
  const wStock = Math.max(wFit, wTrainEnd) + S.stock;
  const wSoft = wStock + S.softLaunch;
  const wOpen = wSoft + 1;

  const avail = app.launchMonths !== null ? Math.round(app.launchMonths * CONFIG.weeksPerMonth * 10) / 10 : null;
  // Back-schedule from the launch target; if the target is too short, re-date the opening to the earliest feasible week.
  const redated = avail !== null && wOpen > avail;
  const openWeek = avail === null ? wOpen : Math.max(wOpen, Math.round(avail));
  const slack = openWeek - wOpen;
  const ms = (name: string, week: number, note?: string): Milestone => ({ name, week, dueWeek: week + slack, note });
  const milestones: Milestone[] = [
    ms('ID, PAN, GST, proof of funds & agreement signed', wAgree),
    ms(known ? 'Space sign-off (site inspection, lease / ownership verified)' : 'Space search, inspection & sign-off', wSpace, known ? undefined : `includes ~${S.spaceSearch} weeks to find a unit`),
    ms(`Training complete (${trainWeeks} wk, in ${lang})`, wTrainEnd, 'runs in parallel with space and fit-out'),
    ms('Fit-out complete', wFit),
    ms('Stock in & POS live', wStock),
    ms('Soft launch', wSoft),
    ms('Grand opening', wOpen),
  ];
  let feasibility: string;
  if (avail === null) feasibility = `No target launch stated; the standard schedule opens in week ${wOpen} (~${(wOpen / CONFIG.weeksPerMonth).toFixed(1)} months).`;
  else if (wOpen <= avail) feasibility = `Fits the ${app.launchMonths}-month target: dates are back-scheduled from the launch date, with ~${Math.round(avail - wOpen)} weeks of buffer at the start.`;
  else feasibility = `Re-dated: the target of ${app.launchMonths} month${app.launchMonths === 1 ? '' : 's'} is too short. The schedule needs ~${wOpen} weeks (~${Math.ceil(wOpen / CONFIG.weeksPerMonth)} months) even with training overlapping fit-out, so the opening is moved to week ${wOpen}. Confirm the new date with the applicant.`;
  return { track, language: lang, modules, milestones, totalWeeks: wOpen, availableWeeks: avail, openWeek, redated, feasibility };
}
