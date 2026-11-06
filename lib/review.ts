import { corporateDisclosureWording, someDisclosureWording, crossCheck, illustrativeEvidence, validateEvidence, verificationResult, type VerificationResult, type EvidenceRecord, type CheckReport } from './evidence'
import { validPdsMetadata, type PdsFile } from './pds'
import { validTargetDate } from './timing'
import { type Concern } from './monitoring'
import { validEvidenceFile, type EvidenceFile } from './evidence-file'

export const exampleWording = corporateDisclosureWording

export const claims = {
  all: 'All securities in the Fund are screened against ESG exclusion criteria.',
  qualified: someDisclosureWording,
  example: exampleWording,
  exampleQualified: someDisclosureWording,
} as const
export const fund = 'Vanguard Ethically Conscious Global Aggregate Bond Index Fund'
export const roles = ['Product Management', 'Product Strategy', 'Disclosure Team', 'Risk / Compliance Team', 'Internal Audit'] as const
export type Role = typeof roles[number]
export const evidencePermissions: Record<Role, string> = {
  'Product Management': 'Upload and edit supporting screening evidence in Draft before sending it to Product Strategy; maintain the PDS.',
  'Product Strategy': 'Upload, edit and validate Bloomberg/MSCI screening evidence during Product Strategy verification.',
  'Disclosure Team': 'View evidence, complete the disclosure checklist and record review comments before approving or rejecting.',
  'Risk / Compliance Team': 'View evidence; complete final approval or rejection and flag monitoring concerns on approved disclosures.',
  'Internal Audit': 'View only for separate, independent assurance.',
}
export type Claim = keyof typeof claims
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

export const workflow: readonly { stage: Stage; status: string; role: Role | null; lod: 'LOD 1' | 'LOD 2' | null }[] = [
  { stage: 'draft', status: 'Draft', role: 'Product Management', lod: 'LOD 1' },
  { stage: 'verify', status: 'Pending Product Strategy Verification', role: 'Product Strategy', lod: 'LOD 1' },
  { stage: 'disclosure', status: 'Pending Disclosure Team Check', role: 'Disclosure Team', lod: 'LOD 2' },
  { stage: 'risk', status: 'Pending Risk/Compliance Review', role: 'Risk / Compliance Team', lod: 'LOD 2' },
  { stage: 'approved', status: 'Approved', role: null, lod: null },
]
export const decisionStages: readonly DecisionStage[] = ['verify', 'disclosure', 'risk']
export type Assignments = Record<DecisionStage, string>
export type DisclosureChecks = { pds: string; website: string; marketing: string }
export const disclosureOutcomes = { pass: 'Pass', 'needs-revision': 'Needs revision', na: 'N/A' } as const
export const disclosureAreas = [{ key: 'pds', label: 'PDS disclosures' }, { key: 'website', label: 'Website disclosures' }, { key: 'marketing', label: 'Marketing materials' }] as const
export function validDisclosureChecks(checks?: DisclosureChecks): boolean {
  return !!checks && disclosureAreas.every(({ key }) => Object.hasOwn(disclosureOutcomes, checks[key]))
}
export type PdsExtraction = { pdsId: string; at: string; method: 'simulated' }
export type Snapshot = { claim: Claim; wording?: string; evidenceFile?: EvidenceFile; assignments: Assignments; evidence: EvidenceRecord[]; evidenceConfirmedBy?: string; disclosureChecks?: DisclosureChecks; pds?: PdsFile; extraction?: PdsExtraction; targetDate?: string }
export type Entry = {
  at: string; role: string; text: string; userId?: string; userName?: string; comment?: string
  from?: Stage; to?: Stage; evidence?: EvidenceRecord[]; report?: CheckReport; snapshot?: Snapshot; kind?: 'timing-risk' | 'monitoring-concern' | 'concern-addressed'; concern?: Concern
}
export type Review = {
  id: string; claim: Claim; original: Claim; wording?: string; evidenceFile?: EvidenceFile
  stage: Stage; draftOwnerId: string; submittedBy: string | null; pds?: PdsFile; extraction?: PdsExtraction; targetDate?: string
  assignments: Assignments; result: VerificationResult | null
  risk: 'pending' | 'action-required' | 'resolved' | null; events: Entry[]; evidence: EvidenceRecord[]; evidenceConfirmedBy?: string; disclosureChecks?: DisclosureChecks; verificationRunBy?: string; report?: CheckReport; concerns?: Concern[]
}
export type Action = 'submit' | 'verify' | 'accept' | 'reject'
export type DraftPatch = Partial<Pick<Review, 'claim' | 'assignments' | 'targetDate'>>

export function lineOfDefence(role: Role): string {
  return role === 'Internal Audit' ? 'LOD 3' : ['Disclosure Team', 'Risk / Compliance Team'].includes(role) ? 'LOD 2' : 'LOD 1'
}

export function defaultAssignments(): Assignments {
  return { verify: 'strategy-maya', disclosure: 'disclosure-priya', risk: 'risk-sam' }
}
export function getUser(id: string) { return users.find(user => user.id === id) }
function identity(actor: User) { return users.find(user => user.id === actor.id && user.role === actor.role) }
export function owner(review?: Pick<Review, 'stage'>): Role | null {
  return workflow.find(step => step.stage === (review?.stage ?? 'draft'))?.role ?? null
}
export function status(review?: Review): string {
  return workflow.find(step => step.stage === (review?.stage ?? 'draft'))?.status ?? 'Unknown status'
}
export function isReturnedForRevision(review: Pick<Review, 'stage' | 'events'>): boolean {
  return review.stage === 'draft' && review.events.some(event => event.to === 'draft' && ['verify', 'disclosure', 'risk'].includes(event.from ?? ''))
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
  return ['draft', 'verify'].includes(review.stage) && !!review.pds && review.extraction?.pdsId === review.pds.id && actionBlocker(review, actor) === null
}
export function canReviewDisclosure(review: Review, actor: User): boolean {
  return review.stage === 'disclosure' && actionBlocker(review, actor) === null
}
export function canEditWording(review: Review, actor: User): boolean {
  return !!review.pds && review.extraction?.pdsId === review.pds.id
    && (canEditDraft(review, actor) || canEditEvidence(review, actor))
}
export function disclosureWording(review: Pick<Review, 'claim' | 'wording'>): string {
  return review.wording ?? claims[review.claim]
}
export function saveWording(review: Review, wording: string, actor: User): Review {
  const text = wording.trim()
  if (!canEditWording(review, actor) || !text || text.length > 10000 || text === disclosureWording(review)) return review
  const updated: Review = { ...review, wording: text, result: null, report: undefined,
    verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined }
  return { ...updated, events: [...review.events, entry(actor, 'Disclosure wording edited. Previous verification invalidated; fresh verification required.', { snapshot: snapshot(updated) })] }
}
export function evidenceConfirmed(review: Review): boolean {
  return !!review.evidenceConfirmedBy && getUser(review.evidenceConfirmedBy)?.role === 'Disclosure Team'
    && review.evidenceConfirmedBy === review.assignments.disclosure && validateEvidence(review.evidence) === null
    && validDisclosureChecks(review.disclosureChecks) && !Object.values(review.disclosureChecks!).includes('needs-revision')
}
function snapshot(review: Review): Snapshot {
  return { claim: review.claim, wording: disclosureWording(review), ...(review.evidenceFile ? { evidenceFile: { ...review.evidenceFile } } : {}), assignments: { ...review.assignments }, evidence: review.evidence.map(record => ({ ...record })), ...(review.evidenceConfirmedBy ? { evidenceConfirmedBy: review.evidenceConfirmedBy } : {}), ...(review.disclosureChecks ? { disclosureChecks: { ...review.disclosureChecks } } : {}), ...(review.pds ? { pds: { ...review.pds } } : {}), ...(review.extraction ? { extraction: { ...review.extraction } } : {}), ...(review.targetDate ? { targetDate: review.targetDate } : {}) }
}
function entry(actor: User, text: string, extra: Partial<Entry> = {}): Entry {
  const user = identity(actor)!
  return { at: new Date().toISOString(), role: user.role, userId: user.id, userName: user.name, text, ...extra }
}
export function createReview(id: string, claim: Claim, actor: User): Review | null {
  const user = identity(actor)
  if (!user || user.role !== 'Product Management') return null
  if (!id.trim() || !Object.hasOwn(claims, claim)) return null
  return {
    id, claim, original: claim, stage: 'draft',
    draftOwnerId: user.id, submittedBy: null, assignments: defaultAssignments(),
    evidence: [], result: null, risk: null, concerns: [],
    events: [entry(user, 'Assessment draft created by Product Management.')],
  }
}
export function saveDraft(review: Review, patch: DraftPatch, actor: User): Review {
  if (!canEditDraft(review, actor)) return review
  if (patch.claim !== undefined && !Object.hasOwn(claims, patch.claim)) return review
  if (patch.targetDate !== undefined && patch.targetDate !== '' && !validTargetDate(patch.targetDate)) return review
  const assignments = { ...(patch.assignments ?? review.assignments) }
  const next: Review = { ...review, claim: patch.claim ?? review.claim,
    wording: patch.claim !== undefined ? undefined : review.wording, assignments, targetDate: patch.targetDate ?? review.targetDate, result: null, report: undefined, verificationRunBy: undefined }
  return { ...next, events: [...review.events, entry(actor, 'Draft assessment details updated. Previous verification invalidated.', { snapshot: snapshot(next) })] }
}
export function attachPds(review: Review, pds: PdsFile | undefined, actor: User): Review {
  if (!canEditDraft(review, actor) || (pds && (!validPdsMetadata(pds) || pds.uploadedBy !== actor.id))) return review
  const updated: Review = { ...review, pds: pds ? { ...pds } : undefined,
    extraction: pds ? { pdsId: pds.id, at: new Date().toISOString(), method: 'simulated' } : undefined,
    wording: undefined, claim: pds ? 'example' : review.claim, original: pds ? 'example' : review.original,
    report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined }
  return { ...updated, events: [...review.events, entry(actor, pds ? `Supporting PDS uploaded: ${pds.name}. Disclosure wording extracted from this file using the supplied example text (simulated extraction).` : 'Supporting PDS and its simulated extraction removed from the current Draft.', { snapshot: snapshot(updated) })] }
}
export function attachEvidenceFile(review: Review, file: EvidenceFile, actor: User): Review {
  if (!canEditEvidence(review, actor) || !validEvidenceFile(file) || file.uploadedBy !== actor.id) return review
  const next = saveEvidence(review, illustrativeEvidence(), actor)
  const updated: Review = { ...next, evidenceFile: { ...file } }
  return { ...updated, events: [...review.events, entry(actor, 'Supporting evidence uploaded: ' + file.name + '. Bloomberg and MSCI example fields populated using simulated extraction. Review the records and Run Verification.', { snapshot: snapshot(updated), evidence: updated.evidence.map(record => ({ ...record })) })] }
}
export function saveEvidence(review: Review, records: EvidenceRecord[], actor: User): Review {
  if (!canEditEvidence(review, actor) || validateEvidence(records)) return review
  const evidence = records.map(record => ({ ...record, security: record.security.trim().toUpperCase() }))
  const updated: Review = { ...review, evidence, report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined }
  return { ...updated, events: [...review.events, entry(actor, `${actor.role} updated supporting screening evidence. Previous verification invalidated; Product Strategy must Run Verification before selecting Approve.`, { snapshot: snapshot(updated), evidence: evidence.map(record => ({ ...record })) })] }
}
function withDisclosureChecks(review: Review, checks: DisclosureChecks, actor: User): Review {
  return { ...review, disclosureChecks: { pds: checks.pds, website: checks.website, marketing: checks.marketing }, evidenceConfirmedBy: actor.id }
}
export function submissionBlockers(review: Review): string[] {
  const blockers: string[] = []
  if (!Object.hasOwn(claims, review.claim)) blockers.push('Disclosure wording is required.')
  if (!validPdsMetadata(review.pds)) blockers.push('Upload a supporting PDS PDF before submission.')
  else if (review.extraction?.pdsId !== review.pds!.id) blockers.push('Upload the supporting PDS to simulate disclosure wording extraction before submission.')
  if (review.stage === 'draft' && !validEvidenceFile(review.evidenceFile)) blockers.push('Upload supporting evidence before sending the Draft to Product Strategy.')
  const invalidEvidence = validateEvidence(review.evidence)
  if (invalidEvidence) blockers.push(`Complete supporting evidence: ${invalidEvidence}`)
  if (!validTargetDate(review.targetDate)) blockers.push('Set a target completion date before submission.')
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
  if (invalid) return `Product Strategy must complete supporting evidence: ${invalid}`
  if (review.disclosureChecks && Object.values(review.disclosureChecks).includes('needs-revision')) return 'Disclosure review needs revision. Reject to return the assessment to Product Management.'
  return evidenceConfirmed(review) ? null : 'Select Pass or N/A for all three disclosure areas before approving.'
}
export function decisionBlocker(review: Review, action: Action, actor: User, comment: string, checks?: DisclosureChecks): string | null {
  const blocked = actionBlocker(review, actor)
  if (blocked) return blocked
  if (checks !== undefined) {
    if (!canReviewDisclosure(review, actor) || !['accept', 'reject'].includes(action)) return 'Only Disclosure Team can record checklist outcomes with its approval or rejection.'
    if (!checks || !disclosureAreas.every(({ key }) => checks[key] === '' || Object.hasOwn(disclosureOutcomes, checks[key]))) return 'Choose a valid outcome for each disclosure area.'
    review = withDisclosureChecks(review, checks, actor)
  }
  if (action === 'verify') return review.stage !== 'verify' ? 'Only Product Strategy can run verification at its review stage.' : validateEvidence(review.evidence) ? 'Upload supporting evidence and complete the records before running verification.' : null
  if (!comment.trim()) return 'A comment is required for submission, verification, endorsement, approval and return decisions.'
  if (action === 'submit') return review.stage !== 'draft' ? 'Only a Draft can be submitted.' : submissionBlockers(review)[0] ?? null
  if (review.stage === 'draft') return 'Submit the Draft before making review decisions.'
  if (action !== 'accept' && action !== 'reject') return 'Choose Accept or Reject.'
  if (action === 'reject') return null
  if (!review.submittedBy) return 'The assessment must be submitted by Product Management.'
  const invalid = submissionBlockers(review)
  if (invalid.length) return invalid[0]
  if (!review.report || review.verificationRunBy !== review.assignments.verify) return 'Product Strategy must Run Verification and review the result before acceptance.'
  const report = review.report
  if (report.blockers.length) return report.blockers[0]
  const outcome = verificationResult(crossCheck(review.claim, review.evidence, review.wording))
  if (outcome === 'fail') return 'Discrepancy identified. Change the disclosure wording from "All" to "Some", save it and Run Verification again before approval.'
  if (review.result !== outcome || verificationResult(report) !== outcome) return 'Run Verification again and review the updated result before acceptance.'
  if (review.stage === 'verify') return null
  const missingEvidence = evidenceBlocker(review)
  if (missingEvidence) return missingEvidence
  const matches = review.evidence.every(record => {
      const verified = report.snapshot.find(source => source.source === record.source)
      return verified && record.id === verified.id && record.security === verified.security
        && (record.source === 'Bloomberg' ? record.name === verified.name && record.included === verified.included
          : record.researchAvailable === verified.researchAvailable && record.result === verified.result)
  })
  if (!matches) return 'Supporting evidence changed after verification. Reject to return for fresh evidence review and verification.'
  return null
}
export function transition(review: Review, action: Action, actor: User, comment = '', checks?: DisclosureChecks): Review {
  if (decisionBlocker(review, action, actor, comment, checks)) return review
  if (checks !== undefined) review = withDisclosureChecks(review, checks, actor)
  if (action === 'verify') {
    const evidence = review.evidence
    const report = crossCheck(review.claim, evidence, review.wording)
    const result = verificationResult(report)
    return { ...review, evidence: evidence.map(record => ({ ...record })), report, verificationRunBy: actor.id, result,
      events: [...review.events, entry(actor, `Automated verification ${result === 'fail' ? 'identified a blocking discrepancy' : result === 'review-required' ? 'identified an unscreened issuer requiring investigation' : 'found no discrepancy under prototype rules'}. Product Strategy must review screening methodology, issuer coverage, exclusions and limitations, then record its decision.`, { snapshot: snapshot(review), report, evidence: report.snapshot, ...(comment.trim() ? { comment: comment.trim() } : {}) })] }
  }
  if (action === 'submit') {
    return { ...review, stage: 'verify', submittedBy: actor.id, report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined, risk: 'pending',
      events: [...review.events, entry(actor, 'Draft and supporting PDS sent to Product Strategy (LOD 1) for technical verification. Disclosure Team (LOD 2) checks wording and consistency afterward.', { comment: comment.trim(), from: 'draft', to: 'verify', snapshot: snapshot({ ...review, evidenceConfirmedBy: undefined, disclosureChecks: undefined }) })] }
  }
  if (action === 'reject') {
    return { ...review, stage: 'draft', report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, risk: review.stage === 'risk' ? 'action-required' : review.risk,
      events: [...review.events, entry(actor, `${status(review)}: Rejected and returned to Product Management as Draft, with Revisions Required. Resubmission requires the full review sequence.`, { comment: comment.trim(), from: review.stage, to: 'draft', snapshot: snapshot(review) })] }
  }
  const nextStage = { verify: 'disclosure', disclosure: 'risk', risk: 'approved' }[review.stage as DecisionStage] as Stage
  const report = review.report
  const decisions = { verify: `${review.result === 'review-required' ? 'Product Strategy investigated the screening gap and recorded its decision' : 'Product Strategy verification accepted'}; sent to Disclosure Team (LOD 2) for wording and consistency checks. Verification findings retained`, disclosure: 'Disclosure Team (LOD 2) endorsed the wording and consistency checks; sent to Risk / Compliance for final review', risk: 'Risk / Compliance review accepted. Assessment approved' }
  return { ...review, stage: nextStage, result: verificationResult(report!), report, risk: nextStage === 'approved' ? 'resolved' : review.risk,
    events: [...review.events, entry(actor, `${decisions[review.stage as DecisionStage]}.`, { comment: comment.trim(), from: review.stage, to: nextStage, snapshot: snapshot(review), ...(report ? { report } : {}), evidence: (report?.snapshot ?? review.evidence).map(record => ({ ...record })) })] }
}
export function task(review?: Review): string {
  if (!review) return 'Create a Draft, upload the supporting PDS and set a target completion date.'
  if (isReturnedForRevision(review)) return 'Address the reviewer comments, update the assessment and resubmit to Product Strategy for a fresh review.'
  return {
    draft: 'Upload the supporting PDS and a separate supporting evidence file. Review and save the evidence, set a target completion date and send the Draft to Product Strategy.',
    verify: 'Review and edit the supporting evidence prepared by Product Management and the disclosure wording. Save any changes, Run Verification, review methodology, issuer coverage, exclusions and limitations, then Approve or Reject with a comment.',
    disclosure: 'Complete the Disclosure Team Review checklist and add review comments. Approve sends the assessment to Risk / Compliance when every item is Pass or N/A. If any item needs revision, Reject to return it to Product Management.',
    risk: 'Review the verified findings and add decision comments. Accept to mark Approved, or Reject to return the assessment to Product Management for revision.',
    approved: 'Assessment approved. Risk / Compliance continues monitoring; Internal Audit provides separate assurance.',
  }[review.stage]
}
