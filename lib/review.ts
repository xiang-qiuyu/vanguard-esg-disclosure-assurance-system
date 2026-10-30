export const claims = {
  all: 'All securities in the Fund are screened against ESG exclusion criteria.',
  qualified: 'ESG screening applies only to securities covered by the relevant research. Some securities in the Fund are not screened against the exclusion criteria.',
} as const
export const fund = 'Vanguard Ethically Conscious Global Aggregate Bond Index Fund'
export const roles = ['Product Management', 'Disclosure Team', 'Product Strategy', 'Risk / Compliance', 'Internal Audit'] as const
export type Role = typeof roles[number]
export type Claim = keyof typeof claims
export type ReviewType = 'routine' | 'trigger'
export type Stage = 'requested' | 'evidence' | 'verify' | 'technical' | 'classify' | 'risk' | 'correct' | 'closure' | 'ready' | 'approved'
export type Entry = { at: string; role: string; text: string }
export type Review = { id: string; type: ReviewType; target: 'proposed' | 'existing'; claim: Claim; original: Claim; stage: Stage; result: 'pass' | 'fail' | null; exception: 'open' | 'resolved' | null; material: boolean | null; risk: 'pending' | 'action-required' | 'resolved' | null; events: Entry[] }
export type Action = 'initiate' | 'evidence' | 'verify' | 'technical' | 'material' | 'nonmaterial' | 'risk' | 'correct' | 'close' | 'approve'
export const coverage = 26
export function check(claim: Claim): boolean { return claim === 'qualified' || coverage >= 100 }
export function createReview(id: string, type: ReviewType, claim: Claim, requested = false): Review {
 return { id, type, target: 'existing', claim, original: claim, stage: requested ? 'requested' : 'evidence', result: null, exception: null, material: null, risk: null, events: [{ at: new Date().toISOString(), role: requested ? 'Risk / Compliance' : 'Product Management', text: requested ? 'Monitoring concern flagged: reassess screening scope and disclosure validity. Trigger-event review requested from Product Management (simulated concern).' : `${type === 'routine' ? 'Routine' : 'Trigger-event'} review initiated for existing disclosure. Claim: “${claims[claim]}”` }] }
}
export function owner(r?: Review): Role {
 if (!r) return 'Product Management'
 if (r.stage === 'evidence') return 'Disclosure Team'
 if (['verify', 'technical', 'classify'].includes(r.stage)) return 'Product Strategy'
 if (['risk', 'closure', 'approved'].includes(r.stage)) return 'Risk / Compliance'
 return 'Product Management'
}
export function transition(r: Review, action: Action, actor: Role): Review {
 if (actor === 'Internal Audit' || actor !== owner(r)) return r
 let patch: Partial<Review> = {}; let text = ''
 if (action === 'initiate' && r.stage === 'requested') { patch = { stage: 'evidence' }; text = 'Product Management accepted the monitoring request and initiated a Trigger-Event Review. Evidence coordination assigned to Disclosure Team.' }
 else if (action === 'evidence' && r.stage === 'evidence') { patch = { stage: 'verify' }; text = `Evidence prepared: February 2021 historical fund-wide coverage ≈26%; ≈74% not researched or screened by market value. This is not a universal estimate for every security category. Claim: “${claims[r.claim]}” Ready for Product Strategy.` }
 else if (action === 'verify' && r.stage === 'verify') { const pass = check(r.claim); patch = { stage: 'technical', result: pass ? 'pass' : 'fail', exception: pass ? r.exception : 'open' }; text = `Deterministic verification run: ${pass ? 'No discrepancy detected under prototype checks' : 'Discrepancy identified; exception recorded and existing disclosure flagged'}. Assertion: ${r.claim}; evidence: ≈26% fund-wide screening coverage by market value. Claim: “${claims[r.claim]}” Human technical confirmation required.` }
 else if (action === 'technical' && r.stage === 'technical') {
  if (r.result === 'fail') { patch = { stage: 'classify' }; text = 'Technical discrepancy confirmed. Human materiality classification required; authorised completion blocked.' }
  else { const material = r.material === true; patch = { stage: material ? 'closure' : 'ready', exception: material ? 'open' : r.exception ? 'resolved' : null }; text = `Technical finding confirmed: no discrepancy under prototype checks. ${material ? 'Material exception remains open pending Risk / Compliance closure.' : r.exception ? 'Non-material exception resolved following correction and re-verification. Product Management authorised review required.' : 'Product Management authorised review required.'}` }
 }
 else if ((action === 'material' || action === 'nonmaterial') && r.stage === 'classify') { const material = action === 'material'; patch = { material, risk: material ? 'pending' : null, stage: material ? 'risk' : 'correct' }; text = `Human judgement: ${material ? 'material; Risk / Compliance assessment required before amendment' : 'non-material; Product Management to amend wording'}. Classification is simulated, not a legal determination.` }
 else if (action === 'risk' && r.stage === 'risk') { patch = { risk: 'action-required', stage: 'correct' }; text = 'Assessment: unqualified all-securities wording overstates evidenced screening scope. Decision: require qualified wording, technical re-verification and second-line closure. Material issue remains open.' }
 else if (action === 'correct' && r.stage === 'correct' && r.risk !== 'pending') { patch = { claim: 'qualified', stage: 'verify', result: null }; text = `Disclosure amended. Before: “${claims[r.claim]}” After: “${claims.qualified}” Submitted to Product Strategy for re-verification; exception remains open.` }
 else if (action === 'close' && r.stage === 'closure' && r.result === 'pass' && r.material && r.risk === 'action-required') { patch = { risk: 'resolved', exception: 'resolved', stage: 'ready' }; text = 'Risk / Compliance reviewed qualified wording and satisfactory technical re-verification. Material concern cleared; exception closed. Product Management may complete authorised review.' }
 else if (action === 'approve' && r.stage === 'ready' && r.result === 'pass' && r.exception !== 'open' && (!r.material || r.risk === 'resolved')) { patch = { stage: 'approved' }; text = 'Existing disclosure confirmed to remain valid following authorised review. Ongoing monitoring assigned to Risk / Compliance.' }
 else return r
 return { ...r, ...patch, events: [...r.events, { at: new Date().toISOString(), role: actor, text }] }
}
export function status(r?: Review) {
 if (!r) return 'Not reviewed'
 if (r.stage === 'approved') return 'Completed'
 if (r.exception === 'open') return 'Open Exception'
 if (['verify', 'technical'].includes(r.stage)) return 'Awaiting Verification'
 return 'Pending Review'
}
export function task(r?: Review): string {
 if (!r) return 'Initiate a disclosure review.'
 return { requested: 'Initiate the requested Trigger-Event Review.', evidence: 'Inspect supporting evidence and mark it ready.', verify: 'Run verification against the prepared evidence.', technical: 'Review the result and confirm the technical finding.', classify: 'Classify the exception as material or non-material.', risk: 'Assess the material discrepancy and require corrective action.', correct: 'Amend the disclosure wording and submit for re-verification.', closure: 'Review the correction and clear the material concern.', ready: 'Complete authorised review of the existing disclosure.', approved: 'Monitor the disclosure for new screening concerns.' }[r.stage]
}
