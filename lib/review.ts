import { crossCheck, validateEvidence, type EvidenceRecord, type CheckReport } from './evidence'

export const claims = {
  all: 'All securities in the Fund are screened against ESG exclusion criteria.',
  qualified: 'ESG screening applies only to securities covered by the relevant research. Some securities in the Fund are not screened against the exclusion criteria.',
} as const
export const fund = 'Vanguard Ethically Conscious Global Aggregate Bond Index Fund'
export const roles = ['Product Management', 'Disclosure Team', 'Product Strategy', 'Risk / Compliance Team', 'Internal Audit'] as const
export type Role = typeof roles[number]
export type Claim = keyof typeof claims
export type ReviewType = 'routine' | 'trigger'
export type DecisionStage = 'verify' | 'disclosure' | 'risk'
export type Stage = 'draft' | DecisionStage | 'approved'
export type User = { id: string; name: string; role: Role }

// Demo identities represent permissions that a production identity service would supply.
export const users: readonly User[] = [
  { id: 'pm-alex', name: 'Alex Morgan', role: 'Product Management' },
  { id: 'pm-robin', name: 'Robin Lee', role: 'Product Management' },
  { id: 'strategy-maya', name: 'Maya Chen', role: 'Product Strategy' },
  { id: 'strategy-lee', name: 'Lee Wong', role: 'Product Strategy' },
  { id: 'disclosure-priya', name: 'Priya Shah', role: 'Disclosure Team' },
  { id: 'risk-sam', name: 'Sam Patel', role: 'Risk / Compliance Team' },
  { id: 'audit-casey', name: 'Casey Ng', role: 'Internal Audit' },
]

export const workflow: readonly { stage: Stage; status: string; role: Role | null }[] = [
  { stage: 'draft', status: 'Draft', role: 'Product Management' },
  { stage: 'disclosure', status: 'Pending Disclosure Review', role: 'Disclosure Team' },
  { stage: 'verify', status: 'Pending Product Strategy Verification', role: 'Product Strategy' },
  { stage: 'risk', status: 'Pending Risk/Compliance Review', role: 'Risk / Compliance Team' },
  { stage: 'approved', status: 'Approved', role: null },
]
export const decisionStages: readonly DecisionStage[] = ['disclosure', 'verify', 'risk']
export type Assignments = Record<DecisionStage, string>
export type DisclosureChecks = { pds: string; website: string; marketing: string }
export type Snapshot = { claim: Claim; type: ReviewType; assignments: Assignments; evidence: EvidenceRecord[]; evidenceConfirmedBy?: string; disclosureChecks?: DisclosureChecks }
export type Entry = {
  at: string; role: string; text: string; userId?: string; userName?: string; comment?: string
  from?: Stage; to?: Stage; evidence?: EvidenceRecord[]; report?: CheckReport; snapshot?: Snapshot
}
export type Review = {
  id: string; type: ReviewType; target: 'proposed' | 'existing'; claim: Claim; original: Claim
  stage: Stage; draftOwnerId: string; submittedBy: string | null
  assignments: Assignments; result: 'pass' | 'fail' | null; exception: 'open' | 'resolved' | null
  risk: 'pending' | 'action-required' | 'resolved' | null; events: Entry[]; evidence: EvidenceRecord[]; evidenceConfirmedBy?: string; disclosureChecks?: DisclosureChecks; verificationRunBy?: string; report?: CheckReport
}
export type Action = 'submit' | 'verify' | 'accept' | 'reject'
export type DraftPatch = Partial<Pick<Review, 'claim' | 'type' | 'assignments'>>

export function defaultAssignments(): Assignments {
  return { verify: 'strategy-maya', disclosure: 'disclosure-priya', risk: 'risk-sam' }
}
export function getUser(id: string) { return users.find(user => user.id === id) }
function identity(actor: User) { return users.find(user => user.id === actor.id && user.role === actor.role) }
export function owner(review?: Review): Role | null {
  return workflow.find(step => step.stage === (review?.stage ?? 'draft'))?.role ?? null
}
export function status(review?: Review): string {
  return workflow.find(step => step.stage === (review?.stage ?? 'draft'))?.status ?? 'Unknown status'
}
export function assignee(review: Review): User | undefined {
  if (review.stage === 'draft') return getUser(review.draftOwnerId)
  if (review.stage === 'approved') return undefined
  return getUser(review.assignments[review.stage])
}
export function actionBlocker(review: Review, actor: User): string | null {
  const user = identity(actor)
  if (!user) return 'Select a valid simulated user.'
  if (user.role === 'Internal Audit') return 'Internal Audit provides separate, independent assurance and cannot make management decisions.'
  if (review.stage === 'approved') return 'This assessment is already approved.'
  if (user.role !== owner(review)) return `Only ${owner(review)} can act at this stage.`
  if (assignee(review)?.id !== user.id) return 'Only the assigned user can act at this stage.'
  if (review.stage !== 'draft' && review.submittedBy === user.id) return 'You cannot review or approve your own submission.'
  return null
}
export function canEditDraft(review: Review, actor: User): boolean {
  return review.stage === 'draft' && actionBlocker(review, actor) === null
}
export function canEditEvidence(review: Review, actor: User): boolean {
  return review.stage === 'disclosure' && actionBlocker(review, actor) === null
}
export function evidenceConfirmed(review: Review): boolean {
  return !!review.evidenceConfirmedBy && getUser(review.evidenceConfirmedBy)?.role === 'Disclosure Team'
    && review.evidenceConfirmedBy === review.assignments.disclosure && validateEvidence(review.evidence) === null
    && !!review.disclosureChecks?.pds.trim() && !!review.disclosureChecks.website.trim() && !!review.disclosureChecks.marketing.trim()
}
function snapshot(review: Review): Snapshot {
  return { claim: review.claim, type: review.type, assignments: { ...review.assignments }, evidence: review.evidence.map(record => ({ ...record })), ...(review.evidenceConfirmedBy ? { evidenceConfirmedBy: review.evidenceConfirmedBy } : {}), ...(review.disclosureChecks ? { disclosureChecks: { ...review.disclosureChecks } } : {}) }
}
function entry(actor: User, text: string, extra: Partial<Entry> = {}): Entry {
  const user = identity(actor)!
  return { at: new Date().toISOString(), role: user.role, userId: user.id, userName: user.name, text, ...extra }
}
export function createReview(id: string, type: ReviewType, claim: Claim, actor: User, requested = false): Review | null {
  const user = identity(actor)
  if (!user || (requested ? user.role !== 'Risk / Compliance Team' : user.role !== 'Product Management')) return null
  if (!id.trim() || !['routine', 'trigger'].includes(type) || !Object.hasOwn(claims, claim)) return null
  return {
    id, type, target: 'proposed', claim, original: claim, stage: 'draft',
    draftOwnerId: requested ? 'pm-alex' : user.id, submittedBy: null, assignments: defaultAssignments(),
    evidence: [], result: null, exception: null, risk: null,
    events: [entry(user, requested ? 'Monitoring concern flagged. Trigger-event assessment requested from Product Management; draft preparation required.' : 'Assessment draft created by Product Management.')],
  }
}
export function saveDraft(review: Review, patch: DraftPatch, actor: User): Review {
  if (!canEditDraft(review, actor)) return review
  if (patch.claim !== undefined && !Object.hasOwn(claims, patch.claim)) return review
  if (patch.type !== undefined && !['routine', 'trigger'].includes(patch.type)) return review
  const assignments = { ...(patch.assignments ?? review.assignments) }
  const next: Review = { ...review, claim: patch.claim ?? review.claim, type: patch.type ?? review.type,
    assignments, result: null, report: undefined, verificationRunBy: undefined }
  return { ...next, events: [...review.events, entry(actor, 'Draft assessment details updated. Previous verification invalidated.', { snapshot: snapshot(next) })] }
}
export function saveEvidence(review: Review, records: EvidenceRecord[], actor: User, checks?: DisclosureChecks): Review {
  if (!canEditEvidence(review, actor) || validateEvidence(records)) return review
  if (!checks?.pds.trim() || !checks.website.trim() || !checks.marketing.trim()) return review
  const evidence = records.map(record => ({ ...record, security: record.security.trim().toUpperCase() }))
  const disclosureChecks = { pds: checks.pds.trim(), website: checks.website.trim(), marketing: checks.marketing.trim() }
  const updated: Review = { ...review, evidence, evidenceConfirmedBy: actor.id, disclosureChecks, report: undefined, result: null, verificationRunBy: undefined }
  return { ...updated, events: [...review.events, entry(actor, 'Disclosure Team prepared supporting evidence and wording checks for the PDS, website and marketing material. Endorsement is required before Product Strategy technical verification.', { snapshot: snapshot(updated), evidence: evidence.map(record => ({ ...record })) })] }
}
export function submissionBlockers(review: Review): string[] {
  const blockers: string[] = []
  if (!Object.hasOwn(claims, review.claim)) blockers.push('Disclosure wording is required.')
  if (!['routine', 'trigger'].includes(review.type)) blockers.push('Review type is required.')
  if (getUser(review.draftOwnerId)?.role !== 'Product Management') blockers.push('Assign a Product Management draft owner.')
  for (const stage of decisionStages) {
    const assigned = getUser(review.assignments?.[stage])
    const role = workflow.find(step => step.stage === stage)!.role
    if (!assigned || assigned.role !== role) blockers.push(`Assign a ${role} reviewer.`)
    else if (assigned.id === review.draftOwnerId) blockers.push('The submitter cannot be assigned to review or approve their own assessment.')
  }
  return blockers
}
function evidenceBlocker(review: Review): string | null {
  const invalid = validateEvidence(review.evidence)
  if (invalid) return `Disclosure Team must complete supporting evidence: ${invalid}`
  return evidenceConfirmed(review) ? null : 'Disclosure Team must save supporting evidence and record the PDS, website and marketing consistency checks before endorsement.'
}
export function decisionBlocker(review: Review, action: Action, actor: User, comment: string): string | null {
  const blocked = actionBlocker(review, actor)
  if (blocked) return blocked
  if (action === 'verify') return review.stage === 'verify' ? evidenceBlocker(review) : 'Only Product Strategy can run verification at its review stage.'
  if (!comment.trim()) return 'A comment is required for submission, verification, endorsement, approval and return decisions.'
  if (action === 'submit') return review.stage !== 'draft' ? 'Only a Draft can be submitted.' : submissionBlockers(review)[0] ?? null
  if (review.stage === 'draft') return 'Submit the Draft before making review decisions.'
  if (action !== 'accept' && action !== 'reject') return 'Choose Accept or Reject.'
  if (action === 'reject') return null
  if (!review.submittedBy) return 'The assessment must be submitted by Product Management.'
  const invalid = submissionBlockers(review)
  if (invalid.length) return invalid[0]
  const missingEvidence = evidenceBlocker(review)
  if (missingEvidence) return missingEvidence
  if (review.stage === 'disclosure') return null
  if (!review.report || review.verificationRunBy !== review.assignments.verify) return 'Product Strategy must Run Verification and review the result before acceptance.'
  const report = review.report
  if (report.blockers.length) return report.blockers[0]
  if (report.findings.length || review.result !== 'pass') return 'Unresolved evidence discrepancies block acceptance. Reject and return the assessment to Product Management for correction.'
  const matches = review.evidence.every(record => {
      const verified = report.snapshot.find(source => source.source === record.source)
      return verified && record.id === verified.id && record.security === verified.security
        && (record.source === 'Bloomberg' ? record.name === verified.name && record.included === verified.included
          : record.researchAvailable === verified.researchAvailable && record.result === verified.result)
  })
  if (!matches) return 'Supporting evidence changed after verification. Reject to return for fresh evidence review and verification.'
  return null
}
export function transition(review: Review, action: Action, actor: User, comment = ''): Review {
  if (decisionBlocker(review, action, actor, comment)) return review
  if (action === 'verify') {
    const report = crossCheck(review.claim, review.evidence)
    return { ...review, report, verificationRunBy: actor.id, result: report.findings.length ? 'fail' : 'pass', exception: report.findings.length ? 'open' : review.exception,
      events: [...review.events, entry(actor, `Automated verification ${report.findings.length ? 'identified a discrepancy' : 'found no discrepancy under prototype rules'}. Product Strategy must review screening methodology, issuer coverage, exclusions and limitations, then record its decision.`, { snapshot: snapshot(review), report, evidence: report.snapshot, ...(comment.trim() ? { comment: comment.trim() } : {}) })] }
  }
  if (action === 'submit') {
    return { ...review, stage: 'disclosure', submittedBy: actor.id, report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, risk: 'pending',
      events: [...review.events, entry(actor, 'Draft sent to Disclosure Team for supporting evidence preparation and PDS, website and marketing wording checks before Product Strategy technical verification.', { comment: comment.trim(), from: 'draft', to: 'disclosure', snapshot: snapshot({ ...review, evidenceConfirmedBy: undefined }) })] }
  }
  if (action === 'reject') {
    return { ...review, stage: 'draft', report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, exception: 'open', risk: review.stage === 'risk' ? 'action-required' : review.risk,
      events: [...review.events, entry(actor, `${status(review)}: Rejected and returned to Product Management as Draft. Resubmission requires the full review sequence.`, { comment: comment.trim(), from: review.stage, to: 'draft', snapshot: snapshot(review) })] }
  }
  const nextStage = { disclosure: 'verify', verify: 'risk', risk: 'approved' }[review.stage as DecisionStage] as Stage
  const report = review.report
  const decisions = { verify: 'Product Strategy verification accepted; sent to Risk / Compliance for final review', disclosure: 'Disclosure review endorsed', risk: 'Risk / Compliance review accepted. Assessment approved' }
  return { ...review, stage: nextStage, result: review.stage === 'disclosure' ? null : 'pass', report, exception: nextStage === 'approved' && review.exception ? 'resolved' : review.exception, risk: nextStage === 'approved' ? 'resolved' : review.risk,
    events: [...review.events, entry(actor, `${decisions[review.stage as DecisionStage]}.`, { comment: comment.trim(), from: review.stage, to: nextStage, snapshot: snapshot(review), ...(report ? { report } : {}), evidence: (report?.snapshot ?? review.evidence).map(record => ({ ...record })) })] }
}
export function task(review?: Review): string {
  if (!review) return 'Create an assessment Draft and send it to Disclosure Team for evidence preparation and wording review.'
  return {
    draft: 'Complete the Draft and send it to Disclosure Team for supporting evidence and wording review.',
    verify: 'Verify screening methodology, issuer coverage, exclusions and limitations. Run Verification against the prepared evidence, review the result, then Accept or Reject with a comment.',
    disclosure: 'Prepare supporting evidence and check proposed wording consistency across the PDS, website and marketing material. Accept to send it to Product Strategy for verification, or Reject with a comment.',
    risk: 'Complete the final Risk / Compliance review. Accept to mark Approved, or Reject to return to Draft.',
    approved: 'Assessment approved. Risk / Compliance continues monitoring; Internal Audit provides separate assurance.',
  }[review.stage]
}
