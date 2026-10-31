import { type EvidenceRecord, type CheckReport } from './evidence'
import { claims, defaultAssignments, workflow, decisionStages, getUser, type Entry, type Review, type Snapshot } from './review'

export const storageKey = 'esg-assurance-demo-v1'
export const storageVersion = 7

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
function snapshot(value: unknown): value is Snapshot {
  return object(value) && Object.hasOwn(claims, String(value.claim)) && ['routine', 'trigger'].includes(String(value.type)) &&
    assignments(value.assignments) && evidence(value.evidence) && confirmation(value.evidenceConfirmedBy) && disclosureChecks(value.disclosureChecks)
}
function event(value: unknown): value is Entry {
  return object(value) && typeof value.at === 'string' && !Number.isNaN(Date.parse(value.at)) && typeof value.role === 'string' && typeof value.text === 'string' &&
    (value.comment === undefined || typeof value.comment === 'string') && (value.userId === undefined || typeof value.userId === 'string') &&
    (value.userName === undefined || typeof value.userName === 'string') && (value.evidence === undefined || evidence(value.evidence)) &&
    (value.report === undefined || report(value.report)) && (value.snapshot === undefined || snapshot(value.snapshot))
}
function baseReview(value: unknown): value is Record<string, unknown> & { id: string; events: Entry[] } {
  return object(value) && typeof value.id === 'string' && Array.isArray(value.events) && value.events.every(event) &&
    ['routine', 'trigger'].includes(String(value.type)) && ['proposed', 'existing'].includes(String(value.target)) &&
    Object.hasOwn(claims, String(value.claim)) && Object.hasOwn(claims, String(value.original)) &&
    (value.evidence === undefined || evidence(value.evidence))
}
function currentReview(value: unknown): value is Review {
  return baseReview(value) && workflow.some(step => step.stage === value.stage) &&
    typeof value.draftOwnerId === 'string' && getUser(value.draftOwnerId)?.role === 'Product Management' &&
    (value.submittedBy === null || (typeof value.submittedBy === 'string' && !!getUser(value.submittedBy))) && assignments(value.assignments) && evidence(value.evidence) &&
    confirmation(value.evidenceConfirmedBy) && disclosureChecks(value.disclosureChecks) &&
    (value.verificationRunBy === undefined || (typeof value.verificationRunBy === 'string' && getUser(value.verificationRunBy)?.role === 'Product Strategy')) &&
    [null, 'pass', 'fail'].some(result => result === value.result) && [null, 'open', 'resolved'].some(exception => exception === value.exception) &&
    [null, 'pending', 'action-required', 'resolved'].some(risk => risk === value.risk) && (value.report === undefined || report(value.report))
}

export function restoreReviews(raw: string): Review[] {
  const data: unknown = JSON.parse(raw)
  if (!object(data) || !Array.isArray(data.reviews)) throw new Error('Invalid saved assessments')
  if ([storageVersion, 6, 5].includes(data.version as number)) {
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
    if (data.version !== 5) return restored
    return restored.map(r => ['draft', 'approved'].includes(r.stage) ? r : {
      ...r, stage: 'disclosure', result: null, report: undefined, verificationRunBy: undefined, evidenceConfirmedBy: undefined,
      events: [...r.events, { at: new Date().toISOString(), role: 'System', text: 'Workflow order updated. Active assessment routed to Disclosure Team for evidence and wording review before Product Strategy verification. Previous history retained.' }],
    })
  }
  if (data.version !== 4 || !data.reviews.every(baseReview)) throw new Error('Unsupported saved assessments')
  // Preserve earlier decisions as history, but never treat old approvals as approvals under the new chain.
  return data.reviews.map(r => ({
    id: r.id, type: r.type, target: r.target, claim: r.claim, original: r.original, evidence: r.evidence ?? [],
    stage: 'draft', draftOwnerId: 'pm-alex', submittedBy: null,
    assignments: defaultAssignments(), result: null, exception: r.exception === 'open' ? 'open' : null, risk: null,
    events: [...r.events, { at: new Date().toISOString(), role: 'System', text: 'Earlier workflow history retained. Assessment reset to Draft for mandatory information, named reviewer assignments and approval through the updated workflow.' }],
  } as Review))
}
