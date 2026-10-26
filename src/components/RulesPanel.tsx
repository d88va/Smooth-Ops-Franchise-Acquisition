import { CONFIG } from '../engine';
import { Panel, SectionTitle } from './ui';

const W = CONFIG.weights;
const row = (k: string, v: string) => (
  <tr key={k} className="border-t border-rule"><th scope="row" className="py-1.5 pr-3 text-left font-normal">{k}</th><td className="py-1.5 text-right font-mono">{v}</td></tr>
);

export function RulesPanel() {
  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      <Panel>
        <SectionTitle>How the engine decides</SectionTitle>
        <p className="max-w-[62ch]">Fixed rules decide; text only explains. The same file always gives the same answer. <b className="font-semibold">Decline</b> means the applicant cannot fix the problem soon. <b className="font-semibold">Hold</b> means they can.</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Clean the data and flag problems. Nothing is dropped.</li>
          <li>Check the gates: duplicate, territory match, pin free of an existing store, minimum investment, notes match the form, space ready.</li>
          <li>Score out of 100. The score needed to be approved depends on territory priority.</li>
          <li>Fill each territory, High priority first. One approved store per pin, ever.</li>
          <li>Write the next steps and a training plan for each approved applicant.</li>
        </ol>
      </Panel>
      <Panel>
        <SectionTitle>Thresholds</SectionTitle>
        <table className="w-full"><tbody>
          {row('Minimum investment, tier 1, 2, 3', `₹${CONFIG.tierMinInvestment[1]}L, ₹${CONFIG.tierMinInvestment[2]}L, ₹${CONFIG.tierMinInvestment[3]}L`)}
          {row('Short of that but close: Hold, otherwise Decline', `within ${Math.round(CONFIG.nearMissPct * 100)}%`)}
          {row('Minimum shop size, tier 1, 2, 3', `${CONFIG.tierMinSize[1]}, ${CONFIG.tierMinSize[2]}, ${CONFIG.tierMinSize[3]} sq ft`)}
          {row('Score to be approved, High, Medium, Low priority', `${CONFIG.approveByPriority.High}, ${CONFIG.approveByPriority.Medium}, ${CONFIG.approveByPriority.Low}`)}
          {row('Score below this is declined', `${CONFIG.holdAt}`)}
          {row('No shop yet: approval needs a launch window of', `${CONFIG.noSpaceMinLaunchMonths} months or more`)}
          {row('Too close to a store or partner', `${CONFIG.minSpacing} pin step or less, same city`)}
          {row('Full white-space points from', `${CONFIG.fullSpacing} pin steps`)}
        </tbody></table>
        <p className="mt-1 text-sm text-soft">These are proposed defaults, set in <code className="font-mono">config.ts</code>. They are not checked against real franchise data.</p>
      </Panel>
      <Panel>
        <SectionTitle>Score weights, out of 100</SectionTitle>
        <table className="w-full"><tbody>
          {row('Investment compared with typical cost', `${W.investment}`)}
          {row('Experience and business relevance', `${W.experience}`)}
          {row('Space readiness and quality', `${W.space}`)}
          {row('Territory priority', `${W.priority}`)}
          {row('Realistic timeline', `${W.timeline}`)}
          {row('Distance from other stores', `${W.whitespace}`)}
          {row('Data problems', `minus ${CONFIG.dataQualityPenalty} each, up to ${CONFIG.dataQualityCap}`)}
        </tbody></table>
      </Panel>
      <Panel>
        <SectionTitle>Ties and map accuracy</SectionTitle>
        <p className="max-w-[62ch]">Ties go to the higher score, then space readiness, investment, experience, shorter timeline, and last the earlier application ID. Open slots are never filled by force: an applicant below the bar stays on Hold or is declined.</p>
        <p className="mt-2 max-w-[62ch]"><b className="font-semibold">Map positions are approximate.</b> A pin is placed near its city centre with a fixed offset taken from its last three digits. Distances use pin-number gaps, not road distance. Nothing on the map is surveyed.</p>
      </Panel>
    </div>
  );
}
