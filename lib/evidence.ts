export type Source = 'Bloomberg' | 'MSCI'
export type EvidenceRecord = { id: string; source: Source; security: string; name: string; included: boolean; researchAvailable: boolean; result: 'screened' | 'unscreened'; note: string }
export type Finding = { kind: 'Unscreened security' | 'Unverified exclusion coverage'; security: string; name: string; evidenceIds: string[]; detail: string; severity?: 'review-required' | 'blocking' }
export type CheckReport = { findings: Finding[]; blockers: string[]; snapshot: EvidenceRecord[] }
export type VerificationResult = 'pass' | 'review-required' | 'fail'
export const corporateDisclosureWording = 'All corporate securities in the Fund are screened against ESG exclusion criteria'
export const someDisclosureWording = 'Some corporate securities in the Fund are screened against ESG exclusion criteria'

export function verificationResult(report: CheckReport): VerificationResult {
 if (report.blockers.length || report.findings.some(finding => finding.severity === 'blocking' || (finding.severity !== 'review-required' && finding.kind !== 'Unverified exclusion coverage'))) return 'fail'
 return report.findings.length ? 'review-required' : 'pass'
}

export function validateEvidence(records: EvidenceRecord[]): string | null {
 if (!Array.isArray(records) || records.some(r => !r || !['Bloomberg', 'MSCI'].includes(r.source))) return 'Provide valid Bloomberg and MSCI evidence records.'
 const bloomberg = records.filter(r => r.source === 'Bloomberg'), msci = records.filter(r => r.source === 'MSCI')
 if (bloomberg.length !== 1 || msci.length !== 1) return 'Save one Bloomberg index constituent record and one MSCI screening record.'
 if (records.some(r => !r.id?.trim()) || new Set(records.map(r => r.id)).size !== records.length) return 'Each evidence record requires a unique source reference.'
 if (records.some(r => !r.security?.trim() || !r.note?.trim())) return 'Security ID and source note are required for both records.'
 if (!bloomberg[0].name?.trim()) return 'The Bloomberg record requires a security name.'
 if (typeof bloomberg[0].included !== 'boolean' || typeof msci[0].researchAvailable !== 'boolean' || !['screened', 'unscreened'].includes(msci[0].result)) return 'Complete fund inclusion, research availability and screening status.'
 if (bloomberg[0].security.trim().toUpperCase() !== msci[0].security.trim().toUpperCase()) return 'The MSCI record must reference the same security ID as the Bloomberg constituent.'
 return null
}

export function crossCheck(claim: string, records: EvidenceRecord[], wording?: string): CheckReport {
 const report: CheckReport = { findings: [], blockers: [], snapshot: records.map(r => ({ ...r })) }
 const invalid = validateEvidence(records)
 if (invalid) { report.blockers.push(invalid); return report }
 const text = wording ?? (['qualified', 'exampleQualified'].includes(claim) ? someDisclosureWording : claim === 'example' ? corporateDisclosureWording : claim)
 // Fixed prototype scenario: evidence selections do not change the wording check.
 const qualifiedWording = /^\s*some\b/i.test(text) && !/\ball\b/i.test(text)
 if (!qualifiedWording) report.findings.push({ kind: 'Unscreened security', severity: 'blocking', security: 'CORP-001', name: 'Illustrative Corporate Bond', evidenceIds: records.map(record => record.id), detail: 'This corporate bond is included in the Fund, but the available MSCI record indicates that its issuer was not screened against the applicable ESG criteria. This contradicts the PDS claim that all corporate securities are screened.' })
 return report
}

export function illustrativeEvidence(): EvidenceRecord[] {
 return [
  { id: 'BBG-001', source: 'Bloomberg', security: 'CORP-001', name: 'Illustrative Corporate Bond', included: true, researchAvailable: false, result: 'unscreened', note: 'Simulated Bloomberg index constituent record: corporate bond is included in the Fund.' },
  { id: 'MSCI-001', source: 'MSCI', security: 'CORP-001', name: '', included: true, researchAvailable: true, result: 'unscreened', note: 'Simulated MSCI screening record: the issuer was not screened against the applicable ESG criteria.' },
 ]
}
