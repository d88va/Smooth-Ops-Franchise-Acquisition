import { toggleLayer, type Layers } from '../state/store';

const LAYER_LABELS: [keyof Layers, string][] = [
  ['territories', 'Territories'],
  ['stores', 'Existing stores'],
  ['applicants', 'Applicants'],
  ['rings', 'Spacing rings'],
  ['arcs', 'Arrows to the pin chosen'],
];

/** What to draw on the map; sits above the map so nothing covers the land. */
export function LayerToggles({ layers }: { layers: Layers }) {
  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">Map layers</legend>
      <p className="text-base font-semibold" aria-hidden="true">Show on the map</p>
      {LAYER_LABELS.map(([k, label]) => (
        <label key={k} className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={layers[k]} onChange={() => toggleLayer(k)} className="h-4 w-4 accent-ink" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
