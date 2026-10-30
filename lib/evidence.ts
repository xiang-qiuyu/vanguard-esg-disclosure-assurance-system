export type Source = 'Bloomberg' | 'MSCI'
export type EvidenceRecord = { id: string; source: Source; security: string; name: string; included: boolean; researchAvailable: boolean; result: 'screened' | 'unscreened'; note: string }
export type Finding = { kind: 'Unscreened security'; security: string; name: string; evidenceIds: string[]; detail: string }
export type CheckReport = { findings: Finding[]; blockers: string[]; snapshot: EvidenceRecord[] }

export function validateEvidence(records: EvidenceRecord[]): string | null {
 const bloomberg = records.filter(r => r.source === 'Bloomberg'), msci = records.filter(r => r.source === 'MSCI')
 if (bloomberg.length !== 1 || msci.length !== 1) return 'Save one Bloomberg index constituent record and one MSCI screening record.'
 if (records.some(r => !r.security?.trim() || !r.note?.trim())) return 'Security ID and source note are required for both records.'
 if (!bloomberg[0].name?.trim()) return 'The Bloomberg record requires a security name.'
 if (bloomberg[0].security.trim().toUpperCase() !== msci[0].security.trim().toUpperCase()) return 'The MSCI record must reference the same security ID as the Bloomberg constituent.'
 return null
}

export function crossCheck(claim: 'all' | 'qualified', records: EvidenceRecord[]): CheckReport {
 const report: CheckReport = { findings: [], blockers: [], snapshot: records.map(r => ({ ...r })) }
 const invalid = validateEvidence(records)
 if (invalid) { report.blockers.push(invalid); return report }
 const bond = records.find(r => r.source === 'Bloomberg')!
 const research = records.find(r => r.source === 'MSCI')!
 const unscreened = !research.researchAvailable || research.result === 'unscreened'
 if (claim === 'all' && bond.included && unscreened) report.findings.push({ kind: 'Unscreened security', security: bond.security, name: bond.name, evidenceIds: [bond.id, research.id], detail: 'This security is included in the Fund, but the MSCI record shows no available research and a screening status of "Not screened". This contradicts the PDS claim that all securities are screened.' })
 return report
}

export function illustrativeEvidence(): EvidenceRecord[] {
 return [
  { id: 'BBG-001', source: 'Bloomberg', security: 'GOV-001', name: 'Illustrative Government Bond', included: true, researchAvailable: false, result: 'unscreened', note: 'Simulated Bloomberg index constituent record: security is included in the Fund.' },
  { id: 'MSCI-001', source: 'MSCI', security: 'GOV-001', name: '', included: true, researchAvailable: false, result: 'unscreened', note: 'Simulated MSCI screening record: no ESG research available for this security.' },
 ]
}
