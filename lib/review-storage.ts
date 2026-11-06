import { verificationResult, type EvidenceRecord, type CheckReport } from './evidence'
import { claims, defaultAssignments, workflow, decisionStages, getUser, type Entry, type Review, type Snapshot } from './review'
import { validPdsMetadata } from './pds'
import { validTargetDate } from './timing'
import { validConcern } from './monitoring'

export const storageKey = 'esg-assurance-demo-v1'
export const storageVersion = 14

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function evidence(value: unknown): value is EvidenceRecord[] {
  return Array.isArray(value) && value.every(r => object(r) && typeof r.id === 'string' && ['Bloomberg', 'MSCI'].includes(String(r.source)) &&
    typeof r.security === 'string' && typeof r.name === 'string' && typeof r.included === 'boolean' && typeof r.researchAvailable === 'boolean' &&
    ['screened', 'unscreened'].includes(String(r.result)) && typeof r.note === 'string')
}
function report(value: unknown): value is CheckReport {
  return object(value) && evidence(value.snapshot) && Array.isArray(value.blockers) && value.blockers.every(b => typeof b === 'string') &&
    Array.isArray(value.findings) && value.findings.every(f => object(f) && typeof f.kind === 'string' && typeof f.security === 'string' && typeof f.name === 'string' && typeof f.detail === 'string' && Array.isArray(f.evidenceIds) && f.evidenceIds.every(id => typeof id === 'string'))
}
function assignments(value: unknown) {
  return object(value) && decisionStages.every(stage => typeof value[stage] === 'string' && !!getUser(value[stage] as string))
}
function confirmation(value: unknown) {
  return value === undefined || (typeof value === 'string' && ['Product Strategy', 'Disclosure Team'].includes(getUser(value)?.role ?? ''))
}
function disclosureChecks(value: unknown) {
  return value === undefined || (object(value) && ['pds', 'website', 'marketing'].every(key => typeof value[key] === 'string'))
}
function documentAndDate(value: Record<string, unknown>) {
  return (value.pds === undefined || (validPdsMetadata(value.pds) && getUser(value.pds.uploadedBy)?.role === 'Product Management'))
    && (value.targetDate === undefined || value.targetDate === '' || validTargetDate(value.targetDate))
    && (value.extraction === undefined || (object(value.extraction) && validPdsMetadata(value.pds) && value.extraction.pdsId === value.pds.id
      && value.extraction.method === 'simulated' && typeof value.extraction.at === 'string' && !Number.isNaN(Date.parse(value.extraction.at))))
}
function snapshot(value: unknown): value is Snapshot {
  return object(value) && Object.hasOwn(claims, String(value.claim)) &&
    assignments(value.assignments) && evidence(value.evidence) && confirmation(value.evidenceConfirmedBy) && disclosureChecks(value.disclosureChecks) && documentAndDate(value)
}
function event(value: unknown): value is Entry {
  return object(value) && typeof value.at === 'string' && !Number.isNaN(Date.parse(value.at)) && typeof value.role === 'string' && typeof value.text === 'string' &&
    (value.comment === undefined || typeof value.comment === 'string') && (value.userId === undefined || typeof value.userId === 'string') &&
    (value.userName === undefined || typeof value.userName === 'string') && (value.evidence === undefined || evidence(value.evidence)) &&
    (value.report === undefined || report(value.report)) && (value.snapshot === undefined || snapshot(value.snapshot)) &&
    (value.kind === undefined || value.kind === 'timing-risk' || value.kind === 'monitoring-concern' || value.kind === 'concern-addressed') &&
    (value.concern === undefined || validConcern(value.concern)) &&
    (value.kind !== 'monitoring-concern' || (validConcern(value.concern) && value.concern.status === 'open')) &&
    (value.kind !== 'concern-addressed' || (validConcern(value.concern) && value.concern.status === 'addressed'))
}
function baseReview(value: unknown): value is Record<string, unknown> & { id: string; events: Entry[] } {
  return object(value) && typeof value.id === 'string' && Array.isArray(value.events) && value.events.every(event) &&
    Object.hasOwn(claims, String(value.claim)) && Object.hasOwn(claims, String(value.original)) &&
    (value.evidence === undefined || evidence(value.evidence))
}
function currentReview(value: unknown): value is Review {
  return baseReview(value) && workflow.some(step => step.stage === value.stage) && documentAndDate(value) &&
    typeof value.draftOwnerId === 'string' && getUser(value.draftOwnerId)?.role === 'Product Management' &&
    (value.submittedBy === null || (typeof value.submittedBy === 'string' && !!getUser(value.submittedBy))) && assignments(value.assignments) && evidence(value.evidence) &&
    confirmation(value.evidenceConfirmedBy) && disclosureChecks(value.disclosureChecks) &&
    (value.verificationRunBy === undefined || (typeof value.verificationRunBy === 'string' && getUser(value.verificationRunBy)?.role === 'Product Strategy')) &&
    [null, 'pass', 'review-required', 'fail'].some(result => result === value.result) &&
    [null, 'pending', 'action-required', 'resolved'].some(risk => risk === value.risk) && (value.report === undefined || report(value.report)) &&
    (value.concerns === undefined || (Array.isArray(value.concerns) && value.concerns.every(validConcern) && new Set(value.concerns.map(c => c.id)).size === value.concerns.length && (value.stage === 'approved' || value.concerns.length === 0)))
}

function restoreSavedReviews(raw: string): Review[] {
  const data: unknown = JSON.parse(raw)
  if (!object(data) || !Array.isArray(data.reviews)) throw new Error('Invalid saved assessments')
  if ([storageVersion, 13, 12, 11, 10, 9, 8, 7, 6, 5].includes(data.version as number)) {
    const restored = data.version === storageVersion ? data.reviews : data.reviews.map(value => {
      if (!object(value)) throw new Error('Invalid saved assessment')
      const { functionalGroup: removedGroup, assignments: previousAssignments, ...record } = value
      const activeAssignments = object(previousAssignments) ? { disclosure: previousAssignments.disclosure, verify: previousAssignments.verify, risk: previousAssignments.risk } : previousAssignments
      if (record.stage !== 'functional') return { ...record, assignments: activeAssignments }
      if (!Array.isArray(record.events)) throw new Error('Invalid saved assessment history')
      return { ...record, stage: 'risk', assignments: activeAssignments,
        events: [...record.events, { at: new Date().toISOString(), role: 'System', text: 'Assessment routed directly to Risk / Compliance under the simplified approval workflow. Previous history retained.' }] }
    })
    if (!restored.every(currentReview) || new Set(restored.map(r => r.id)).size !== restored.length) throw new Error('Invalid saved assessments')
    if ([storageVersion, 13, 12, 11, 10, 9].includes(data.version as number)) return restored
    if (data.version === 8) return restored.map(r => {
      const extraction = r.extraction ?? (r.pds ? { pdsId: r.pds.id, at: r.pds.uploadedAt, method: 'simulated' as const } : undefined)
      const result = r.report ? verificationResult(r.report) : r.result
      if (extraction === r.extraction && result === r.result) return r
      return { ...r, extraction, result, events: [...r.events, { at: new Date().toISOString(), role: 'System', text: 'Uploaded PDS wording is recorded as a simulated extraction. Screening coverage limitations require a decision comment and can proceed to Disclosure Team with findings retained. Current stage and earlier history preserved.' }] }
    })
    return restored.map(r => r.stage === 'approved' ? r : {
      ...r, stage: 'draft', claim: 'example', original: 'example', result: null, report: undefined, verificationRunBy: undefined, evidenceConfirmedBy: undefined,
      events: [...r.events, { at: new Date().toISOString(), role: 'System', text: 'Workflow updated: Product Management uploads the PDS and sets a target completion date before Product Strategy (LOD 1) verification, Disclosure Team (LOD 2) review and Risk / Compliance. Active assessment returned to Draft; earlier history retained.' }],
    })
  }
  if (data.version !== 4 || !data.reviews.every(baseReview)) throw new Error('Unsupported saved assessments')
  // Preserve earlier decisions as history, but never treat old approvals as approvals under the new chain.
  return data.reviews.map(r => ({
    id: r.id, claim: 'example', original: 'example', evidence: r.evidence ?? [],
    stage: 'draft', draftOwnerId: 'pm-alex', submittedBy: null,
    assignments: defaultAssignments(), result: null, risk: null,
    events: [...r.events, { at: new Date().toISOString(), role: 'System', text: 'Earlier workflow history retained. Assessment reset to Draft for mandatory information, named reviewer assignments and approval through the updated workflow.' }],
  } as Review))
}

function removeLegacyFields(review: Review): Review {
  const { type: removedType, target: removedTarget, exception: removedException, ...record } = review as Review & { type?: unknown; target?: unknown; exception?: unknown }
  return { ...record, events: record.events.map(event => {
    if (!event.snapshot) return event
    const { type: removedSnapshotType, ...snapshot } = event.snapshot as Snapshot & { type?: unknown }
    return { ...event, snapshot }
  }) }
}

export function restoreReviews(raw: string): Review[] {
  const restored = restoreSavedReviews(raw).map(removeLegacyFields)
  if ([storageVersion, 13, 12, 11, 10].includes(JSON.parse(raw).version)) return restored
  return restored.map(review => {
    if (review.stage === 'approved') return review
    const evidence = review.evidence.length ? review.evidence : review.report?.snapshot.map(record => ({ ...record })) ?? []
    const hadLegacyChecks = !!review.disclosureChecks || !!review.evidenceConfirmedBy
    if (evidence === review.evidence && !hadLegacyChecks) return review
    return { ...review, evidence, disclosureChecks: undefined, evidenceConfirmedBy: undefined,
      stage: review.stage === 'risk' ? 'disclosure' : review.stage,
      events: [...review.events, { at: new Date().toISOString(), role: 'System', text: 'Evidence editing is restricted to Product Strategy. Existing verified records retained. Active Disclosure reviews now require Pass, Needs revision or N/A for each disclosure area; earlier notes and decisions remain in history.' }],
    }
  })
}
