const assert = require('node:assert/strict')
const { test } = require('node:test')
require('./load-ts.cjs')
const { illustrativeEvidence } = require('../lib/evidence.ts')
const { createReview, saveDraft, saveEvidence, canEditEvidence, evidenceConfirmed, transition, owner, assignee, users, roles, workflow, status, actionBlocker, decisionBlocker, submissionBlockers, defaultAssignments } = require('../lib/review.ts')
const { restoreReviews, storageVersion } = require('../lib/review-storage.ts')
const user = id => users.find(u => u.id === id)
const pm = user('pm-alex'), strategy = user('strategy-maya'), disclosure = user('disclosure-priya'), audit = user('audit-casey')
const comment = 'Reviewed methodology, issuer coverage, exclusions and limitations against the verification result.'
const checks = {
  pds: 'PDS wording reflects the proposed screening scope and limitations.',
  website: 'Proposed website wording matches the PDS and prepared evidence.',
  marketing: 'Marketing wording consistently describes the same exclusions and limitations.',
}
const draft = (claim = 'qualified') => createReview('TEST', 'routine', claim, pm)
const sent = (claim = 'qualified') => transition(draft(claim), 'submit', pm, comment)
const disclosureStage = (claim = 'qualified') => sent(claim)
const recordEvidence = r => saveEvidence(r, illustrativeEvidence(), assignee(r), checks)
const verificationStage = (claim = 'qualified') => transition(recordEvidence(sent(claim)), 'accept', disclosure, comment)
const verified = (claim = 'qualified') => transition(verificationStage(claim), 'verify', strategy)
function atStage(stage) {
  if (stage === 'draft') return draft()
  let r = sent()
  while (true) {
    if (r.stage === 'disclosure' && !evidenceConfirmed(r)) r = recordEvidence(r)
    if (r.stage === 'verify' && !r.report) r = transition(r, 'verify', assignee(r))
    if (r.stage === stage) return r
    const next = transition(r, 'accept', assignee(r), comment)
    assert.notEqual(next, r, `Cannot advance from ${r.stage} to ${stage}`)
    r = next
  }
}

test('exact approval chain: Product Management, Disclosure Team, Product Strategy, Risk / Compliance', () => {
  assert.deepEqual(workflow.map(s => [s.status, s.role]), [
    ['Draft', 'Product Management'], ['Pending Disclosure Review', 'Disclosure Team'],
    ['Pending Product Strategy Verification', 'Product Strategy'],
    ['Pending Risk/Compliance Review', 'Risk / Compliance Team'], ['Approved', null],
  ])
  let r = sent()
  assert.equal(r.report, undefined)
  assert.equal(r.evidence.length, 0)
  for (const step of workflow.slice(1, -1)) {
    assert.equal(status(r), step.status)
    assert.equal(owner(r), step.role)
    if (r.stage === 'verify') r = transition(r, 'verify', assignee(r))
    if (r.stage === 'disclosure') r = recordEvidence(r)
    r = transition(r, 'accept', assignee(r), comment)
  }
  assert.equal(status(r), 'Approved')
  assert.equal(owner(r), null)
  assert.equal(r.risk, 'resolved')
  assert.equal(r.events.at(-1).role, 'Risk / Compliance Team')
  assert.equal(transition(r, 'reject', user('risk-sam'), comment), r)
})

test('only assigned Product Management edits a Draft; submitted assessment content remains locked', () => {
  const initial = draft()
  for (const actor of users.filter(u => u.id !== pm.id)) assert.equal(saveDraft(initial, { claim: 'all' }, actor), initial)
  assert.equal(saveDraft(initial, { stage: 'approved', submittedBy: 'risk-sam' }, pm).stage, 'draft')
  assert.equal(saveDraft(initial, { claim: 'all' }, pm).claim, 'all')
  for (const stage of ['verify', 'disclosure', 'risk', 'approved']) {
    const r = atStage(stage)
    for (const actor of users) assert.equal(saveDraft(r, { claim: 'all' }, actor), r)
    assert.equal(transition(r, 'submit', pm, comment), r)
  }
})

test('Product Management can send a Draft without evidence; invalid assessment details still block submission', () => {
  assert.equal(transition(draft(), 'submit', pm, comment).stage, 'disclosure')
  for (const patch of [
    { claim: '' }, { type: '' }, { draftOwnerId: '' }, { assignments: {} },
    { assignments: { ...defaultAssignments(), risk: 'audit-casey' } },
  ]) {
    const r = { ...draft(), ...patch }
    assert.ok(submissionBlockers(r).length)
    assert.equal(transition(r, 'submit', pm, comment), r)
  }
})

test('only assigned Product Strategy can explicitly Run Verification; running does not record an approval', () => {
  const r = verificationStage()
  for (const actor of users.filter(u => u.id !== strategy.id)) assert.equal(transition(r, 'verify', actor), r)
  assert.equal(transition(r, 'accept', strategy, comment), r)
  const next = transition(r, 'verify', strategy)
  assert.equal(next.stage, 'verify')
  assert.equal(next.result, 'pass')
  assert.equal(next.verificationRunBy, strategy.id)
  assert.equal(next.evidence.length, 2)
  assert.equal(next.events.at(-1).role, 'Product Strategy')
  assert.deepEqual(next.report.snapshot, illustrativeEvidence())
  assert.equal(transition(next, 'accept', strategy, ''), next)
  assert.equal(transition(next, 'accept', strategy, comment).stage, 'risk')
  for (const stage of ['draft', 'disclosure', 'risk', 'approved']) {
    const current = atStage(stage)
    for (const actor of users) assert.equal(transition(current, 'verify', actor, comment), current)
  }
})

test('Product Strategy verification uses the actual screening records prepared by Disclosure Team', () => {
  const discrepancy = verified('all')
  assert.equal(discrepancy.result, 'fail')
  assert.equal(discrepancy.report.findings.length, 1)
  assert.deepEqual(discrepancy.report.findings[0].evidenceIds, ['BBG-001', 'MSCI-001'])
  assert.equal(transition(discrepancy, 'accept', strategy, comment), discrepancy)
  const screened = illustrativeEvidence().map(record => record.source === 'MSCI' ? { ...record, researchAvailable: true, result: 'screened' } : record)
  const prepared = saveEvidence(sent('all'), screened, disclosure, checks)
  const next = transition(transition(prepared, 'accept', disclosure, comment), 'verify', strategy)
  assert.equal(next.result, 'pass')
  assert.deepEqual(next.report.snapshot, screened)
  assert.equal(transition(next, 'accept', strategy, comment).stage, 'risk')
})

test('only Disclosure Team prepares evidence at Disclosure Review, before Product Strategy can verify', () => {
  for (const stage of ['draft', 'verify', 'risk', 'approved']) {
    const r = atStage(stage)
    for (const actor of users) {
      assert.equal(canEditEvidence(r, actor), false)
      assert.equal(saveEvidence(r, illustrativeEvidence(), actor, checks), r)
    }
  }
  const r = disclosureStage()
  assert.equal(canEditEvidence(r, disclosure), true)
  for (const actor of users.filter(u => u.id !== disclosure.id)) {
    assert.equal(canEditEvidence(r, actor), false)
    assert.equal(saveEvidence(r, illustrativeEvidence(), actor, checks), r)
  }
  assert.equal(transition(r, 'accept', disclosure, comment), r)
  const recorded = recordEvidence(r)
  assert.equal(recorded.stage, 'disclosure')
  assert.equal(recorded.evidenceConfirmedBy, disclosure.id)
  assert.equal(evidenceConfirmed(recorded), true)
  assert.equal(recorded.events.at(-1).role, 'Disclosure Team')
  assert.equal(recorded.report, r.report)
  assert.equal(recorded.result, null)
  assert.equal(recorded.verificationRunBy, undefined)
  assert.equal(transition(recorded, 'accept', disclosure, comment).stage, 'verify')
  assert.equal(transition(r, 'verify', strategy), r)
})

test('Disclosure Team must record all PDS, website and marketing checks before endorsement', () => {
  const r = disclosureStage()
  for (const key of ['pds', 'website', 'marketing']) {
    assert.equal(saveEvidence(r, illustrativeEvidence(), disclosure, { ...checks, [key]: ' \n ' }), r)
  }
  assert.equal(saveEvidence(r, [], disclosure, checks), r)
  assert.equal(saveEvidence(r, illustrativeEvidence(), disclosure), r)
  const recorded = saveEvidence(r, illustrativeEvidence(), disclosure, Object.fromEntries(Object.entries(checks).map(([key, value]) => [key, `  ${value}  `])))
  assert.deepEqual(recorded.disclosureChecks, checks)
  for (const key of ['pds', 'website', 'marketing']) {
    const missing = { ...recorded, disclosureChecks: { ...checks, [key]: '' } }
    assert.equal(transition(missing, 'accept', disclosure, comment), missing)
  }
})

test('evidence locks after Disclosure endorsement and a stale verification report cannot approve changed records', () => {
  const r = atStage('risk')
  for (const change of [
    records => records.map(record => ({ ...record, security: 'OTHER-001' })),
    records => records.map(record => record.source === 'Bloomberg' ? { ...record, included: false } : record),
    records => records.map(record => record.source === 'MSCI' ? { ...record, researchAvailable: true, result: 'screened' } : record),
  ]) {
    assert.equal(saveEvidence(r, change(illustrativeEvidence()), disclosure, checks), r)
    const changed = { ...r, evidence: change(r.evidence) }
    assert.match(decisionBlocker(changed, 'accept', assignee(changed), comment), /changed after verification/)
    assert.equal(transition(changed, 'accept', assignee(changed), comment), changed)
  }
  const notesOnly = saveEvidence(disclosureStage(), illustrativeEvidence().map(record => ({ ...record, note: 'Disclosure Team linked wording evidence to this prepared source.' })), disclosure, checks)
  assert.equal(transition(notesOnly, 'accept', disclosure, comment).stage, 'verify')
})

test('only the assigned role and user can accept or reject; alternative Product Strategy assignment works', () => {
  for (const stage of ['verify', 'disclosure', 'risk']) {
    const r = atStage(stage)
    for (const actor of users.filter(u => u.id !== assignee(r).id)) {
      assert.equal(transition(r, 'accept', actor, comment), r)
      assert.equal(transition(r, 'reject', actor, comment), r)
    }
    assert.equal(transition(r, 'approve', assignee(r), comment), r)
    assert.notEqual(transition(r, 'accept', assignee(r), comment), r)
    assert.notEqual(transition(r, 'reject', assignee(r), comment), r)
  }
  let r = saveDraft(draft(), { assignments: { ...defaultAssignments(), verify: 'strategy-lee' } }, pm)
  r = transition(r, 'submit', pm, comment)
  r = recordEvidence(r)
  r = transition(r, 'accept', disclosure, comment)
  assert.equal(transition(r, 'verify', strategy), r)
  r = transition(r, 'verify', user('strategy-lee'))
  assert.equal(transition(r, 'accept', user('strategy-lee'), comment).stage, 'risk')
})

test('the retired role cannot act; Product Strategy hands off directly to Risk / Compliance', () => {
  assert.ok(!roles.includes('Functional Head'))
  assert.ok(!workflow.some(step => step.stage === 'functional'))
  assert.ok(!Object.hasOwn(draft(), 'functionalGroup'))
  assert.ok(!Object.hasOwn(defaultAssignments(), 'functional'))
  const retired = { id: 'head-jordan', name: 'Retired reviewer', role: 'Functional Head' }
  const next = transition(verified(), 'accept', strategy, comment)
  assert.equal(next.stage, 'risk')
  assert.equal(owner(next), 'Risk / Compliance Team')
  for (const action of ['submit', 'verify', 'accept', 'reject']) assert.equal(transition(next, action, retired, comment), next)
  assert.equal(transition(next, 'accept', user('risk-sam'), comment).stage, 'approved')
})

test('self-review blocks decisions, automated verification and Disclosure Team evidence edits', () => {
  for (const stage of ['verify', 'disclosure', 'risk']) {
    const original = atStage(stage), actor = assignee(original)
    const r = { ...original, submittedBy: actor.id }
    assert.match(actionBlocker(r, actor), /own submission/)
    for (const action of ['verify', 'accept', 'reject']) assert.equal(transition(r, action, actor, comment), r)
    assert.equal(canEditEvidence(r, actor), false)
    assert.equal(saveEvidence(r, illustrativeEvidence(), actor, checks), r)
  }
})

test('comments remain mandatory for submission, verification acceptance, endorsement, approval and return decisions', () => {
  const initial = draft()
  for (const empty of ['', ' \n\t ']) assert.equal(transition(initial, 'submit', pm, empty), initial)
  for (const stage of ['verify', 'disclosure', 'risk']) {
    const r = atStage(stage)
    for (const action of ['accept', 'reject']) {
      for (const empty of ['', ' \n\t ']) assert.equal(transition(r, action, assignee(r), empty), r)
      const next = transition(r, action, assignee(r), `  ${comment}  `)
      assert.equal(next.events.at(-1).comment, comment)
      assert.equal(next.events.at(-1).userId, assignee(r).id)
    }
  }
})

test('Reject at any stage returns to Draft and requires a fresh run and new Disclosure Team confirmation', () => {
  for (const stage of ['verify', 'disclosure', 'risk']) {
    const r = atStage(stage)
    const returned = transition(r, 'reject', assignee(r), 'Please review the proposed wording again.')
    assert.equal(status(returned), 'Draft')
    assert.equal(owner(returned), 'Product Management')
    assert.equal(returned.report, undefined)
    assert.equal(returned.verificationRunBy, undefined)
    assert.equal(evidenceConfirmed(returned), false)
    let next = transition(returned, 'submit', pm, comment)
    assert.equal(next.stage, 'disclosure')
    assert.equal(transition(next, 'accept', strategy, comment), next)
    assert.equal(transition(next, 'accept', disclosure, comment), next)
    next = recordEvidence(next)
    for (const expected of ['disclosure', 'verify', 'risk']) {
      assert.equal(next.stage, expected)
      if (expected === 'verify') {
        assert.equal(transition(next, 'accept', strategy, comment), next)
        next = transition(next, 'verify', strategy)
      }
      next = transition(next, 'accept', assignee(next), comment)
    }
    assert.equal(next.stage, 'approved')
    assert.equal(next.exception, 'resolved')
  }
})

test('a discrepancy remains in history after correction and a fresh passing verification', () => {
  let r = verified('all')
  const failure = r.events.at(-1), originalSnapshot = JSON.stringify(failure)
  r = transition(r, 'reject', strategy, 'Qualify the screening scope to acknowledge unscreened securities.')
  r = saveDraft(r, { claim: 'qualified' }, pm)
  r = transition(r, 'submit', pm, comment)
  assert.equal(r.report, undefined)
  r = recordEvidence(r)
  r = transition(r, 'accept', disclosure, comment)
  r = transition(r, 'verify', strategy)
  assert.equal(r.report.findings.length, 0)
  assert.equal(JSON.stringify(failure), originalSnapshot)
  assert.equal(failure.snapshot.claim, 'all')
  r = transition(r, 'accept', strategy, comment)
  while (r.stage !== 'approved') r = transition(r, 'accept', assignee(r), comment)
  assert.equal(r.exception, 'resolved')
  assert.ok(r.events.some(e => e.report?.findings.length === 1))
})

test('history copies prepared evidence and wording checks, and verification takes an immutable snapshot', () => {
  const initial = disclosureStage(), evidence = illustrativeEvidence(), formChecks = { ...checks }
  const recorded = saveEvidence(initial, evidence, disclosure, formChecks)
  evidence[0].note = 'Changed outside the workflow'; formChecks.website = 'Changed outside the workflow'
  assert.notEqual(recorded.evidence[0].note, evidence[0].note)
  assert.equal(recorded.disclosureChecks.website, checks.website)
  assert.equal(recorded.report, initial.report)
  const event = recorded.events.at(-1)
  const verifiedReview = transition(transition(recorded, 'accept', disclosure, comment), 'verify', strategy)
  recorded.evidence[0].note = 'Later edit'; recorded.disclosureChecks.pds = 'Later edit'
  assert.notEqual(event.evidence[0].note, recorded.evidence[0].note)
  assert.equal(event.snapshot.disclosureChecks.pds, checks.pds)
  assert.notEqual(verifiedReview.report.snapshot[0].note, recorded.evidence[0].note)
})

test('Internal Audit stays outside management decisions, verification and evidence entry', () => {
  assert.equal(createReview('TEST', 'routine', 'qualified', audit), null)
  assert.equal(createReview('TEST', 'trigger', 'qualified', audit, true), null)
  for (const stage of ['draft', 'verify', 'disclosure', 'risk', 'approved']) {
    const r = atStage(stage)
    assert.equal(saveDraft(r, { claim: 'all' }, audit), r)
    assert.equal(saveEvidence(r, illustrativeEvidence(), audit, checks), r)
    for (const action of ['submit', 'verify', 'accept', 'reject']) assert.equal(transition(r, action, audit, comment), r)
  }
  const request = createReview('TRIGGER', 'trigger', 'qualified', user('risk-sam'), true)
  assert.equal(request.stage, 'draft')
  assert.equal(assignee(request).id, pm.id)
})

test('persistence keeps verification and document checks, retains legacy history and rejects malformed records', () => {
  const approved = atStage('approved')
  assert.deepEqual(restoreReviews(JSON.stringify({ version: storageVersion, reviews: [approved] })), [approved])
  const legacy = { id: 'LEGACY', type: 'routine', target: 'proposed', claim: 'qualified', original: 'all', stage: 'approved',
    result: 'pass', exception: 'resolved', risk: 'resolved', evidence: illustrativeEvidence(),
    events: [{ at: new Date().toISOString(), role: 'Product Management', text: 'Old authorised review completed.' }] }
  const restored = restoreReviews(JSON.stringify({ version: 4, reviews: [legacy] }))[0]
  assert.equal(restored.stage, 'draft')
  assert.equal(restored.events[0].text, legacy.events[0].text)
  assert.equal(transition(restored, 'submit', pm, comment).stage, 'disclosure')
  const oldAutomaticResult = { ...verified(), verificationRunBy: undefined }
  const restoredResult = restoreReviews(JSON.stringify({ version: storageVersion, reviews: [oldAutomaticResult] }))[0]
  assert.equal(transition(restoredResult, 'accept', strategy, comment), restoredResult)
  assert.equal(transition(transition(restoredResult, 'verify', strategy), 'accept', strategy, comment).stage, 'risk')
  for (const stage of ['disclosure', 'verify', 'risk']) {
    const oldReview = atStage(stage)
    const updated = restoreReviews(JSON.stringify({ version: 5, reviews: [oldReview] }))[0]
    assert.equal(updated.stage, 'disclosure')
    assert.equal(updated.report, undefined)
    assert.equal(updated.verificationRunBy, undefined)
    assert.equal(evidenceConfirmed(updated), false)
    assert.deepEqual(updated.events.slice(0, -1), oldReview.events)
    assert.deepEqual(updated.evidence, oldReview.evidence)
  }
  assert.deepEqual(restoreReviews(JSON.stringify({ version: 5, reviews: [approved] })), [approved])
  const pendingRemovedStage = { ...atStage('risk'), stage: 'functional', functionalGroup: 'Fixed Income',
    assignments: { ...defaultAssignments(), functional: 'head-jordan' } }
  const migrated = restoreReviews(JSON.stringify({ version: 6, reviews: [pendingRemovedStage] }))[0]
  assert.equal(migrated.stage, 'risk')
  assert.equal(owner(migrated), 'Risk / Compliance Team')
  assert.ok(!Object.hasOwn(migrated, 'functionalGroup'))
  assert.ok(!Object.hasOwn(migrated.assignments, 'functional'))
  assert.deepEqual(migrated.events.slice(0, -1), pendingRemovedStage.events)
  assert.equal(transition(migrated, 'accept', user('risk-sam'), comment).stage, 'approved')
  assert.throws(() => restoreReviews('{invalid'))
  for (const patch of [{ stage: 'ready' }, { assignments: {} }, { disclosureChecks: { pds: 1 } }, { verificationRunBy: disclosure.id }]) {
    assert.throws(() => restoreReviews(JSON.stringify({ version: storageVersion, reviews: [{ ...approved, ...patch }] })))
  }
  assert.throws(() => restoreReviews(JSON.stringify({ version: storageVersion, reviews: [approved, approved] })))
})
