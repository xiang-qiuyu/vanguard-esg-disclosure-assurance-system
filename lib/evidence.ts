export type Source = 'Bloomberg' | 'MSCI' | 'Internal'
export type EvidenceRecord = { id: string; source: Source; security: string; name: string; included: boolean; result: 'passed' | 'unscreened' | 'failed'; applicable: boolean; criterion: string; note: string }
export type Finding = { kind: 'Unscreened security' | 'Failed exclusion'; security: string; name: string; evidenceIds: string[]; detail: string }
export type CheckReport = { findings: Finding[]; triggers: EvidenceRecord[]; blockers: string[]; included: number; screened: number; snapshot: EvidenceRecord[] }
export function validateEvidence(records: EvidenceRecord[]): string | null {
 const ids = new Set<string>(), keys = new Set<string>()
 for (const r of records) {
  if (!r.id?.trim() || ids.has(r.id)) return 'Evidence IDs must be present and unique.'
  ids.add(r.id)
  if (!['Bloomberg','MSCI','Internal'].includes(r.source) || !r.security?.trim() || !r.note?.trim()) return 'Source, security ID and source note are required for every record.'
  if (r.source !== 'Internal') { const key = `${r.source}:${r.security.trim().toUpperCase()}`; if (keys.has(key)) return 'Only one current record per security and source is allowed. Edit the existing record instead.'; keys.add(key) }
  if (r.source === 'Bloomberg' && (!r.name?.trim() || typeof r.included !== 'boolean')) return 'Bloomberg records require a bond name and inclusion decision.'
  if (r.source === 'MSCI' && (!['passed','unscreened','failed'].includes(r.result) || typeof r.applicable !== 'boolean' || (r.result === 'failed' && !r.criterion?.trim()))) return 'MSCI records require a screening result; failed results also require a criterion.'
 }
 return null
}
export function crossCheck(claim: 'all' | 'qualified', records: EvidenceRecord[]): CheckReport {
 const report: CheckReport = { findings: [], triggers: records.filter(r => r.source === 'Internal'), blockers: [], included: 0, screened: 0, snapshot: records.map(r => ({ ...r })) }
 const invalid = validateEvidence(records)
 if (invalid) { report.blockers.push(invalid); return report }
 const constituents = records.filter(r => r.source === 'Bloomberg' && r.included)
 report.included = constituents.length
 if (!constituents.length) report.blockers.push('Save at least one included Bloomberg constituent before verification. An empty scope cannot pass.')
 for (const bond of constituents) {
  const research = records.find(r => r.source === 'MSCI' && r.security.trim().toUpperCase() === bond.security.trim().toUpperCase())
  const unscreened = !research || research.result === 'unscreened'
  if (!unscreened) report.screened++
  if (unscreened && claim === 'all') report.findings.push({ kind: 'Unscreened security', security: bond.security, name: bond.name, evidenceIds: [bond.id, ...(research ? [research.id] : [])], detail: research ? 'Included constituent is explicitly marked unscreened; contradicts the all-securities PDS claim.' : 'Included constituent has no matching MSCI screening record; screening is not evidenced for the all-securities PDS claim.' })
  if (research?.result === 'failed' && research.applicable) report.findings.push({ kind: 'Failed exclusion', security: bond.security, name: bond.name, evidenceIds: [bond.id, research.id], detail: `Included constituent failed applicable exclusion criterion: ${research.criterion}. Qualified coverage wording does not resolve an exclusion failure.` })
 }
 return report
}
export function dummyEvidence(): EvidenceRecord[] {
 const names = ['Harbour Utilities 2030', 'Southern Rail 2032', 'Pacific Telecom 2029', 'Cedar Industrials 2031', 'Coastal Energy 2034', 'Summit Finance 2028']
 const base = { included: true, result: 'passed' as const, applicable: true, criterion: 'Thermal coal exclusion', note: 'Simulated index methodology: included securities must satisfy applicable ESG exclusions where researched.' }
 const index: EvidenceRecord[] = names.map((name, i) => ({ ...base, id: `BBG-${i+1}`, source: 'Bloomberg', security: `SIM-${String(i+1).padStart(3,'0')}`, name }))
 const research: EvidenceRecord[] = index.slice(0,5).map((r,i) => ({ ...r, id: `MSCI-${i+1}`, source: 'MSCI', result: i === 2 ? 'unscreened' : i === 4 ? 'failed' : 'passed', note: i === 2 ? 'Simulated record: research not performed.' : i === 4 ? 'Simulated research: thermal coal exposure breaches the applicable exclusion.' : 'Simulated research: passed the applicable exclusion checks.' }))
 return [...index, ...research, { ...base, id: 'INT-1', source: 'Internal', security: 'SIM-006', name: '', note: 'Simulated concern: confirm whether research coverage includes this constituent before PDS release. A potential review trigger, not proof of a disclosure discrepancy.' }]
}
