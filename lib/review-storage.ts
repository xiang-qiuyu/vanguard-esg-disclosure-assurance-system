import { illustrativeEvidence, verificationResult, type EvidenceRecord, type CheckReport } from './evidence'
import { claims, defaultAssignments, workflow, decisionStages, getUser, type Entry, type Review, type Snapshot } from './review'
import { validPdsMetadata } from './pds'
import { validTargetDate } from './timing'
import { validConcern } from './monitoring'
import { validEvidenceFile } from './evidence-file'

export const storageKey = 'esg-assurance-demo-v1'
export const storageVersion = 17

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
    Array.isArray(value.findings) && value.findings.every(f => object(f) && typeof f.kind === 'string' && typeof f.security === 'string' && typeof f.name === 'string' && typeof f.detail === 'string' && (f.severity === undefined || ['review-required', 'blocking'].includes(String(f.severity))) && Array.isArray(f.evidenceIds) && f.evidenceIds.every(id => typeof id === 'string'))
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
  return (value.wording === undefined || (typeof value.wording === 'string' && !!value.wording.trim() && value.wording.length <= 10000))
    && (value.evidenceFile === undefined || (validEvidenceFile(value.evidenceFile) && ['Product Management', 'Product Strategy'].includes(getUser(value.evidenceFile.uploadedBy)?.role ?? '')))
    && (value.pds === undefined || (validPdsMetadata(value.pds) && getUser(value.pds.uploadedBy)?.role === 'Product Management'))
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
  if ([storageVersion, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5].includes(data.version as number)) {
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
    if ([storageVersion, 16, 15, 14, 13, 12, 11, 10, 9].includes(data.version as number)) return restored
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

function updateIllustrativeBond(review: Review): Review {
  if (!['draft', 'verify'].includes(review.stage) || review.evidence.length !== 2) return review
  const previousExample = illustrativeEvidence().map(record => ({ ...record, security: 'GOV-001', researchAvailable: false,
    name: record.source === 'Bloomberg' ? 'Illustrative Government Bond' : '',
    note: record.source === 'Bloomberg' ? 'Simulated Bloomberg index constituent record: security is included in the Fund.' : 'Simulated MSCI screening record: no ESG research available for this security.',
  }))
  const unchangedExample = previousExample.every(example => review.evidence.some(record => Object.entries(example).every(([key, value]) => record[key as keyof EvidenceRecord] === value)))
  if (!unchangedExample) return review
  return { ...review, evidence: illustrativeEvidence(), report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined,
    events: [...review.events, { at: new Date().toISOString(), role: 'System', text: 'Illustrative scenario updated from government bond GOV-001 to corporate bond CORP-001, whose issuer was not screened. Fresh Product Strategy verification is required. Earlier decisions and evidence snapshots remain in history.' }],
  }
}

export function restoreReviews(raw: string): Review[] {
  const version = JSON.parse(raw).version
  const restored = restoreSavedReviews(raw).map(removeLegacyFields).map(updateIllustrativeBond).map(review => {
    if (version >= 16) return review
    const previousWording = 'The index excludes companies that have a specified level of business involvement in fossil fuels, nuclear power, alcohol, tobacco, cannabis, gambling, adult entertainment or weapons. The index provider specifies activities, revenue or ownership thresholds or Industry Classification Benchmark (ICB) Subsector classifications for each business segment that lead to exclusion and these can vary from one business segment to another.'
    const oldWording = (claim: string) => claim === 'example' ? previousWording : claim === 'exampleQualified' ? `${previousWording} Screening is limited to issuers covered by the relevant research; the exclusion status of securities without available screening research has not been verified.` : undefined
    const events = review.events.map(event => event.snapshot && event.snapshot.wording === undefined && oldWording(event.snapshot.claim)
      ? { ...event, snapshot: { ...event.snapshot, wording: oldWording(event.snapshot.claim) } } : event)
    if (review.wording !== undefined || !oldWording(review.claim)) return { ...review, events }
    if (review.claim !== 'example' || !['draft', 'verify'].includes(review.stage)) return { ...review, wording: oldWording(review.claim), events }
    return { ...review, report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined,
      events: [...events, { at: new Date().toISOString(), role: 'System', text: 'Example disclosure wording updated: All corporate securities in the Fund are screened against ESG exclusion criteria. Fresh verification is required; earlier wording and decisions remain in history.' }],
    }
  }).map(review => {
    if (version === storageVersion) return review
    const previousQualified = 'ESG screening applies only to securities covered by the relevant research. Some securities in the Fund are not screened against the exclusion criteria.'
    const previousCorporateQualified = 'Corporate securities in the Fund are screened only where issuer coverage is available. Some corporate securities have not been screened against ESG exclusion criteria.'
    const previousWording = (claim: string) => claim === 'qualified' ? previousQualified : version === 16 && claim === 'exampleQualified' ? previousCorporateQualified : undefined
    const events = review.events.map(event => event.snapshot && event.snapshot.wording === undefined && previousWording(event.snapshot.claim)
      ? { ...event, snapshot: { ...event.snapshot, wording: previousWording(event.snapshot.claim) } } : event)
    const wording = review.wording ?? (!['draft', 'verify'].includes(review.stage) ? previousWording(review.claim) : undefined)
    if (!['draft', 'verify'].includes(review.stage) || !review.report) return { ...review, wording, events }
    return { ...review, wording, report: undefined, result: null, verificationRunBy: undefined, evidenceConfirmedBy: undefined, disclosureChecks: undefined,
      events: [...events, { at: new Date().toISOString(), role: 'System', text: 'Prototype verification updated: only disclosure wording beginning with "Some" and without "All" clears the fixed CORP-001 discrepancy. Research availability and screening status do not affect the result. Run Verification again; earlier results remain in history.' }],
    }
  })
  if ([storageVersion, 16, 15, 14, 13, 12, 11, 10].includes(version)) return restored
  return restored.map(review => {
    if (review.stage === 'approved') return review
    const evidence = review.evidence.length ? review.evidence : review.report?.snapshot.map(record => ({ ...record })) ?? []
    const hadLegacyChecks = !!review.disclosureChecks || !!review.evidenceConfirmedBy
    if (evidence === review.evidence && !hadLegacyChecks) return review
    return { ...review, evidence, disclosureChecks: undefined, evidenceConfirmedBy: undefined,
      stage: review.stage === 'risk' ? 'disclosure' : review.stage,
      events: [...review.events, { at: new Date().toISOString(), role: 'System', text: 'Product Management prepares and edits evidence in Draft; Product Strategy edits evidence during verification. Existing verified records retained. Active Disclosure reviews require Pass, Needs revision or N/A for each disclosure area; earlier notes and decisions remain in history.' }],
    }
  })
}
