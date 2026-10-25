export * from './types';
export { CONFIG } from './config';
export { runEngine } from './allocate';
export { diffResults } from './diff';
export type { Diff, Change } from './diff';
export { counterfactuals, patchApp, patchTerritory, describePatchSummary } from './counterfactual';
export type { Counterfactual } from './counterfactual';
export { parseWorkbook, buildDataset, toNumber } from './parse';
