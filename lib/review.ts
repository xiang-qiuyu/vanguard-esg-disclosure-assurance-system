export const claims = {
  all: 'All securities in the Fund are screened against ESG exclusion criteria.',
  qualified: 'ESG screening applies only to securities covered by the relevant research. Some securities in the Fund are not screened against the exclusion criteria.',
} as const
export type Claim = keyof typeof claims
export type ReviewType = 'routine' | 'trigger'
export type Stage = 'verify' | 'technical' | 'classify' | 'risk' | 'correct' | 'ready' | 'approved'
export type Entry = { at: string; role: string; text: string }
export type Review = { id: string; type: ReviewType; target: 'proposed' | 'existing'; claim: Claim; original: Claim; stage: Stage; result: 'pass' | 'fail' | null; exception: 'open' | 'resolved' | null; material: boolean | null; risk: 'pending' | 'resolved' | null; events: Entry[] }
export type Action = 'verify' | 'technical' | 'material' | 'nonmaterial' | 'risk' | 'correct' | 'approve'
export const coverage = 26
export function check(claim: Claim): boolean { return claim === 'qualified' || coverage >= 100 }
export function createReview(id: string, type: ReviewType, target: Review['target'], claim: Claim): Review {
  const at = new Date().toISOString()
  return { id, type, target, claim, original: claim, stage: 'verify', result: null, exception: null, material: null, risk: null, events: [
    { at, role: 'Product Management', text: `${type === 'routine' ? 'Routine' : 'Trigger-event'} review initiated for ${target} disclosure. All actions are simulated.` },
    { at, role: 'Disclosure Team', text: `Evidence coordinated: February 2021 historical coverage ≈26%; ≈74% not researched or screened, by market value. Claim: “${claims[claim]}”` },
  ] }
}
export function transition(r: Review, action: Action): Review {
  let patch: Partial<Review> = {}; let role = ''; let text = ''
  if (action === 'verify' && r.stage === 'verify' && r.risk !== 'pending') {
    const pass = check(r.claim); patch = { stage: 'technical', result: pass ? 'pass' : 'fail' }; role = 'System'; text = `Automated check: ${pass ? 'No Discrepancy' : 'Discrepancy Identified'}. Category: ${r.claim}. ≈26% coverage ${pass ? 'is consistent with qualified wording' : 'does not support an all-securities claim'}. Claim: “${claims[r.claim]}”`
  } else if (action === 'technical' && r.stage === 'technical') {
    role = 'Product Strategy'
    if (r.result === 'fail') { patch = { stage: 'classify', exception: 'open' }; text = `Technical review confirmed discrepancy. Exception recorded; ${r.target === 'proposed' ? 'approval held' : 'existing disclosure flagged'}. Materiality assessment required.` }
    else { patch = { stage: 'ready', exception: r.exception ? 'resolved' : null }; text = `Technical review confirmed No Discrepancy.${r.exception ? ' Correction re-verified; exception resolved.' : ''} Ready for authorised review.` }
  } else if ((action === 'material' || action === 'nonmaterial') && r.stage === 'classify') {
    const material = action === 'material'; patch = { material, risk: material ? 'pending' : null, stage: material ? 'risk' : 'correct' }; role = 'Product Strategy'; text = `Discrepancy classified as ${material ? 'material; escalated to Risk/Compliance. Approval blocked pending second-line review' : 'non-material; first-line correction required'}. Illustrative reviewer judgement, not a legal assessment.`
  } else if (action === 'risk' && r.stage === 'risk') {
    patch = { risk: 'resolved', stage: 'correct' }; role = 'Risk/Compliance'; text = 'Material discrepancy assessed. Decision: require qualified wording and re-verification. Second-line review resolved; approval remains held until correction and technical re-verification pass.'
  } else if (action === 'correct' && r.stage === 'correct' && r.risk !== 'pending') {
    patch = { claim: 'qualified', stage: 'verify', result: null }; role = 'Disclosure Team'; text = `Corrective action applied. Before: “${claims[r.claim]}” After: “${claims.qualified}” Re-verification required; exception remains open.`
  } else if (action === 'approve' && r.stage === 'ready' && r.result === 'pass' && r.risk !== 'pending' && r.exception !== 'open') {
    patch = { stage: 'approved' }; role = 'Product Management'; text = `${r.target === 'proposed' ? 'Proposed disclosure approved' : 'Existing disclosure confirmed valid'}. Authorised review complete. Ongoing monitoring assigned to Risk/Compliance.`
  } else return r
  return { ...r, ...patch, events: [...r.events, { at: new Date().toISOString(), role, text }] }
}
export function status(r: Review) {
  if (r.stage === 'approved') return r.target === 'proposed' ? 'Approved' : 'Confirmed valid'
  if (r.risk === 'pending') return 'Second-line review required'
  if (r.exception === 'open') return r.target === 'existing' ? 'Flagged · correction required' : 'On hold · correction required'
  return ({ verify: 'Awaiting verification', technical: 'Technical review required', ready: 'Ready for approval', classify: 'Classify discrepancy', risk: 'Second-line review required', correct: 'Correction required' } as Record<string, string>)[r.stage]
}
