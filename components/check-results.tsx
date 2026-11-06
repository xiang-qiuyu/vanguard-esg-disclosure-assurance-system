import { verificationResult, type CheckReport } from '@/lib/evidence'

export function CheckResults({ report }: { report: CheckReport }) {
  const outcome = verificationResult(report)
  return <div className="flex flex-col gap-3 text-sm">
    <p className={`font-semibold ${outcome === 'review-required' ? 'text-amber-800' : ''}`}>{report.blockers.length ? 'Verification blocked' : outcome === 'fail' ? 'Discrepancy identified' : outcome === 'review-required' ? 'Review required: unscreened security' : 'No discrepancy detected under prototype rules'}</p>
    {report.blockers.map(blocker => <p key={blocker} className="text-destructive">{blocker}</p>)}
    {report.findings.map((finding, index) => <div key={index} className={`rounded border p-3 ${finding.severity === 'review-required' || finding.kind === 'Unverified exclusion coverage' ? 'border-amber-300 bg-amber-50' : ''}`}>
      <p className={`font-semibold ${finding.severity === 'review-required' || finding.kind === 'Unverified exclusion coverage' ? 'text-amber-900' : 'text-destructive'}`}>{finding.kind} &mdash; {finding.security}</p>
      <p className="mt-1">{finding.detail}</p><p className="mt-1 text-muted-foreground">Linked evidence: {finding.evidenceIds.join(', ')}</p>
    </div>)}
    {outcome === 'review-required' && <p className="text-amber-900">Investigate the screening gap and record whether corrective disclosure is required in your decision comment. The finding remains visible throughout Disclosure Team and Risk / Compliance review.</p>}
    <p className="text-muted-foreground">A security that was not screened is different from a security that was screened and failed the ESG criteria.</p>
  </div>
}
