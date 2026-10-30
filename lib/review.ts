import { crossCheck, validateEvidence, type EvidenceRecord, type CheckReport } from './evidence'
export const claims = {
  all: 'All securities in the Fund are screened against ESG exclusion criteria.',
  qualified: 'ESG screening applies only to securities covered by the relevant research. Some securities in the Fund are not screened against the exclusion criteria.',
} as const
export const fund = 'Vanguard Ethically Conscious Global Aggregate Bond Index Fund'
export const roles = ['Product Management', 'Disclosure Team', 'Product Strategy', 'Risk / Compliance', 'Internal Audit'] as const
export type Role = typeof roles[number]
export type Claim = keyof typeof claims
export type ReviewType = 'routine' | 'trigger'
export type Stage = 'requested' | 'evidence' | 'verify' | 'technical' | 'classify' | 'risk' | 'correct' | 'recheck' | 'closure' | 'ready' | 'approved'
export type Entry = { at: string; role: string; text: string; comment?: string; evidence?: EvidenceRecord[]; report?: CheckReport }
export type Review = { id: string; type: ReviewType; target: 'proposed' | 'existing'; claim: Claim; original: Claim; stage: Stage; result: 'pass' | 'fail' | null; exception: 'open' | 'resolved' | null; material: boolean | null; risk: 'pending' | 'action-required' | 'resolved' | null; events: Entry[]; evidence?: EvidenceRecord[]; report?: CheckReport }
export type Action = 'initiate' | 'evidence' | 'verify' | 'technical' | 'material' | 'nonmaterial' | 'risk' | 'correct' | 'recheck' | 'close' | 'approve'
export function saveEvidence(r: Review, records: EvidenceRecord[], actor: Role): Review {
 if (actor !== 'Disclosure Team' || !['evidence', 'recheck'].includes(r.stage) || validateEvidence(records)) return r
 const evidence = records.map(record => ({ ...record, security: record.security.trim().toUpperCase() }))
 return { ...r, evidence, report: undefined, result: null, events: [...r.events, { at: new Date().toISOString(), role: actor, text: `Saved illustrative Bloomberg and MSCI evidence records for PDS-001. Previous check result invalidated; fresh verification required.`, evidence: evidence.map(record => ({ ...record })) }] }
}
export function createReview(id: string, type: ReviewType, claim: Claim, requested = false): Review {
 return { id, type, target: 'proposed', evidence: [], claim, original: claim, stage: requested ? 'requested' : 'evidence', result: null, exception: null, material: null, risk: null, events: [{ at: new Date().toISOString(), role: requested ? 'Risk / Compliance' : 'Product Management', text: requested ? 'Monitoring concern flagged: reassess screening scope and disclosure validity. Trigger-event review requested from Product Management (simulated concern).' : `${type === 'routine' ? 'Routine' : 'Trigger-event'} review initiated for newly drafted PDS-001. Claim: “${claims[claim]}”` }] }
}
export function owner(r?: Review): Role {
 if (!r) return 'Product Management'
 if (r.stage === 'evidence' || r.stage === 'recheck') return 'Disclosure Team'
 if (['verify', 'technical', 'classify'].includes(r.stage)) return 'Product Strategy'
 if (['risk', 'closure', 'approved'].includes(r.stage)) return 'Risk / Compliance'
 return 'Product Management'
}
export function transition(r: Review, action: Action, actor: Role, comment = ''): Review {
 if (actor === 'Internal Audit' || actor !== owner(r)) return r
 let patch: Partial<Review> = {}; let text = ''
 if (action === 'initiate' && r.stage === 'requested') { patch = { stage: 'evidence' }; text = 'Product Management accepted the monitoring request and initiated a Trigger-Event Review. Evidence coordination assigned to Disclosure Team.' }
 else if (action === 'evidence' && r.stage === 'evidence') { if (crossCheck(r.claim, r.evidence ?? []).blockers.length) return r; patch = { stage: 'verify' }; text = `Disclosure Team confirmed the Bloomberg constituent and MSCI screening records for PDS-001. Claim: “${claims[r.claim]}” Ready for Product Strategy.` }
 else if (action === 'verify' && r.stage === 'verify') { const report = crossCheck(r.claim, r.evidence ?? []); if (report.blockers.length) return r; const pass = report.findings.length === 0; patch = { report, stage: 'technical', result: pass ? 'pass' : 'fail', exception: pass ? r.exception : 'open' }; text = `${r.exception ? 'Re-verification of amended disclosure' : 'Evidence cross-check'}: ${pass ? (r.exception ? 'Verification Cleared. No discrepancy detected under prototype rules' : 'No discrepancy detected under prototype rules') : 'Discrepancy identified; PDS approval held'}. ${report.findings.map(f => `${f.kind}: ${f.security} [${f.evidenceIds.join(', ')}].`).join(' ')} Claim: “${claims[r.claim]}” Technical confirmation required.` }
 else if (action === 'technical' && r.stage === 'technical') {
  if (r.result === 'fail' && r.material !== null) { patch = { stage: 'correct' }; text = 'Re-verification discrepancy confirmed. Exception retained and disclosure returned to Product Management for further correction.' }
  else if (r.result === 'fail') { patch = { stage: 'classify' }; text = 'Technical discrepancy confirmed. Human materiality classification required; authorised completion blocked.' }
  else { const material = r.material === true; patch = { stage: material ? 'closure' : 'ready', exception: material ? 'open' : r.exception ? 'resolved' : null }; text = `Technical finding confirmed: no discrepancy under prototype rules. ${material ? 'Material exception remains open pending Risk / Compliance closure.' : r.exception ? 'Non-material exception resolved following correction and re-verification. Product Management authorised review required.' : 'Product Management authorised review required.'}` }
 }
 else if ((action === 'material' || action === 'nonmaterial') && r.stage === 'classify') { const material = r.material === true || action === 'material'; patch = { material, risk: material ? 'pending' : null, stage: material ? 'risk' : 'correct' }; text = `Human judgement: ${material ? 'material; Risk / Compliance assessment required before amendment' : 'non-material; Product Management to amend wording'}. Classification is simulated, not a legal determination.` }
 else if (action === 'risk' && r.stage === 'risk') { patch = { risk: 'action-required', stage: 'correct' }; text = 'Assessment: review security-level findings and linked evidence. Require the PDS claim to acknowledge that some securities are not screened. Re-verification and second-line closure required. Material issue remains open.' }
 else if (action === 'correct' && r.stage === 'correct' && r.risk !== 'pending') { patch = { claim: 'qualified', stage: 'recheck', result: null, report: undefined }; text = `Disclosure amended. Before: “${claims[r.claim]}” After: “${claims.qualified}” Submitted for re-review; awaiting Disclosure Team evidence recheck. Exception remains open.` }
 else if (action === 'recheck' && r.stage === 'recheck') { if (crossCheck(r.claim, r.evidence ?? []).blockers.length) return r; patch = { stage: 'verify' }; text = `Disclosure Team rechecked the existing Bloomberg and MSCI records against the amended PDS and confirmed Evidence Ready for Re-verification. Amended claim: “${claims[r.claim]}”` }
 else if (action === 'close' && r.stage === 'closure' && r.result === 'pass' && r.material && r.risk === 'action-required') { patch = { risk: 'resolved', exception: 'resolved', stage: 'ready' }; text = 'Risk / Compliance reviewed qualified wording and satisfactory technical re-verification. Material concern cleared; exception closed. Product Management may complete authorised review.' }
 else if (action === 'approve' && r.stage === 'ready' && r.result === 'pass' && r.exception !== 'open' && (!r.material || r.risk === 'resolved')) { patch = { stage: 'approved' }; text = 'Newly drafted PDS-001 approved following evidence cross-checks and authorised review. Ongoing monitoring assigned to Risk / Compliance.' }
 else return r
 return { ...r, ...patch, events: [...r.events, { at: new Date().toISOString(), role: actor, text, ...(comment.trim() ? { comment: comment.trim() } : {}), ...(patch.report ? { report: patch.report, evidence: patch.report.snapshot } : {}) }] }
}
export function status(r?: Review) {
 if (!r) return 'Not reviewed'
 if (r.stage === 'approved') return 'Cleared'
 if (r.stage === 'recheck') return 'Awaiting Evidence Recheck'
 if (r.exception === 'open') return 'Open Exception'
 if (['verify', 'technical'].includes(r.stage)) return 'Awaiting Verification'
 return 'Pending Review'
}
export function task(r?: Review): string {
 if (!r) return 'Initiate a disclosure review.'
 return { requested: 'Initiate the requested Trigger-Event Review.', evidence: 'Inspect supporting evidence and mark it ready.', verify: 'Run verification against the prepared evidence.', technical: 'Review the result and confirm the technical finding.', classify: 'Classify the exception as material or non-material.', risk: 'Assess the material discrepancy and require corrective action.', correct: 'Amend the disclosure wording and submit for re-review.', recheck: 'Recheck existing evidence against the amended PDS.', closure: 'Review the correction and clear the material concern.', ready: 'Approve the newly drafted PDS after authorised review.', approved: 'Monitor the disclosure for new screening concerns.' }[r.stage]
}
