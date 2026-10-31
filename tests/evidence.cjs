const assert = require('node:assert/strict')
const { test } = require('node:test')
require('./load-ts.cjs')
const { crossCheck, illustrativeEvidence, validateEvidence } = require('../lib/evidence.ts')

test('links the unscreened GOV-001 discrepancy to both evidence records', () => {
  const evidence = illustrativeEvidence()
  assert.equal(evidence.length, 2)
  assert.ok(evidence.every(r => r.security === 'GOV-001'))
  const report = crossCheck('all', evidence)
  assert.equal(report.findings.length, 1)
  assert.deepEqual(report.findings[0].evidenceIds, ['BBG-001', 'MSCI-001'])
})
test('qualified wording and genuinely screened evidence pass', () => {
  assert.equal(crossCheck('qualified', illustrativeEvidence()).findings.length, 0)
  const screened = illustrativeEvidence().map(r => r.source === 'MSCI' ? { ...r, researchAvailable: true, result: 'screened' } : r)
  assert.equal(crossCheck('all', screened).findings.length, 0)
})
test('mandatory evidence includes source references, notes, name, and matching security IDs', () => {
  assert.ok(validateEvidence([]))
  assert.ok(validateEvidence(illustrativeEvidence().slice(0, 1)))
  for (const patch of [{ id: '' }, { security: ' ' }, { note: '' }]) {
    assert.ok(validateEvidence(illustrativeEvidence().map(r => ({ ...r, ...patch }))))
  }
  assert.ok(validateEvidence(illustrativeEvidence().map(r => r.source === 'Bloomberg' ? { ...r, name: '' } : r)))
  assert.ok(validateEvidence(illustrativeEvidence().map(r => r.source === 'MSCI' ? { ...r, security: 'GOV-002' } : r)))
  assert.ok(validateEvidence(illustrativeEvidence().map(r => r.source === 'MSCI' ? { ...r, researchAvailable: undefined } : r)))
  assert.ok(validateEvidence(illustrativeEvidence().map(r => r.source === 'MSCI' ? { ...r, result: 'missing' } : r)))
  assert.equal(crossCheck('all', []).blockers.length, 1)
})
