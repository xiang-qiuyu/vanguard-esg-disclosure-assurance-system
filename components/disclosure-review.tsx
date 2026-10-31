"use client"

import { useState } from 'react'
import { LockKeyhole, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { EvidenceEditor } from '@/components/evidence-editor'
import { CheckResults } from '@/components/check-results'
import { type EvidenceRecord } from '@/lib/evidence'
import { claims, fund, owner, workflow, task, canEditDraft, canEditEvidence, evidenceConfirmed, actionBlocker, decisionBlocker, submissionBlockers, type Review, type User, type ReviewType, type Action, type Claim, type DraftPatch, type DisclosureChecks } from '@/lib/review'

type Props = {
  review?: Review; claim: Claim; user: User; ready: boolean
  initiate: (type: ReviewType) => void; act: (action: Action, comment: string) => void
  save: (records: EvidenceRecord[], checks: DisclosureChecks) => void; edit: (patch: DraftPatch) => void
}

export function DisclosureReview({ review, claim, user, initiate, act, ready, save, edit }: Props) {
  const [type, setType] = useState<ReviewType>('routine')
  const [comment, setComment] = useState('')
  const [evidenceDirty, setEvidenceDirty] = useState(false)
  const [error, setError] = useState('')
  const editable = ready && !!review && canEditDraft(review, user)
  const evidenceEditable = ready && !!review && canEditEvidence(review, user)
  const canAct = ready && !!review && actionBlocker(review, user) === null
  const canStart = user.role === 'Product Management' && (!review || review.stage === 'approved')
  const reviewing = !!review && !['draft', 'approved'].includes(review.stage)
  const blockers = review?.stage === 'draft' ? submissionBlockers(review) : []
  const acceptBlocker = reviewing ? decisionBlocker(review, 'accept', user, comment.trim() || 'Preview decision') : null
  const lastReturn = review?.events.findLast(event => event.to === 'draft' && event.from !== 'draft')
  const field = 'rounded border bg-card px-3 py-2 text-sm disabled:opacity-70'

  function submit(action: Action) {
    if (!review || !ready) return
    const blocked = decisionBlocker(review, action, user, comment)
    if (blocked || (action === 'accept' && evidenceDirty)) {
      setError(blocked ?? 'Save your evidence changes before accepting.'); return
    }
    act(action, comment)
    if (action !== 'verify') setComment('')
    setError('')
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-xl font-semibold">ESG screening disclosure</h2><p className="mt-1 text-sm text-muted-foreground">PDS-001 · Newly drafted PDS{review ? ` · ${review.id}` : ''}</p></div>
      <StatusBadge stage={review?.stage} />
    </div>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="panel">
          <div className="border-b p-4"><p className="eyebrow">Fund</p><h3 className="mt-2 font-semibold">{fund}</h3></div>
          <div className="p-4">
            <h3 className="text-sm font-semibold">Current disclosure wording</h3>
            <blockquote className="mt-3 text-base leading-relaxed">&ldquo;{claims[claim]}&rdquo;</blockquote>
            <p className="mt-2 text-xs text-muted-foreground">{claim === 'all' ? 'Illustrative draft claim for this prototype, not verbatim historical Vanguard wording.' : 'Predefined illustrative amendment applied by Product Management, not verbatim Vanguard wording.'}</p>
          </div>
          {review?.report && <div className="flex flex-col gap-3 border-t p-4"><CheckResults report={review.report} /><p className="text-xs text-muted-foreground">Checks one illustrative security (GOV-001) under simplified rules. Product Strategy must review the result and record its verification decision.</p></div>}
          {review && <EvidenceEditor key={`${review.id}-${evidenceEditable}`} records={review.evidence} preparedRecords={review.report?.snapshot} checks={review.disclosureChecks} editable={evidenceEditable} confirmed={evidenceConfirmed(review)} save={save} onDirtyChange={setEvidenceDirty} />}
        </section>
      </div>
      <aside className="flex flex-col gap-4">
        <section className="panel">
          <div className="border-b p-4"><h3 className="font-semibold">{user.role === 'Internal Audit' ? 'Independent assurance' : 'Your actions'}</h3><p className="mt-1 text-sm text-muted-foreground">{user.role}</p></div>
          <div className="flex flex-col gap-3 p-4" aria-live="polite">
            {review && review.stage !== 'draft' && <p className="flex items-center gap-2 rounded border bg-background p-3 text-sm"><LockKeyhole className="size-4 shrink-0" />{review.stage === 'disclosure' ? 'Assessment content is locked. Disclosure Team can complete supporting evidence and wording checks.' : 'Assessment content and supporting evidence are locked.'}</p>}
            {user.role === 'Internal Audit' ? <p className="text-sm leading-relaxed">Internal Audit works alongside this process through separate assurance activities. Inspect evidence and decisions in Review History. Participating in management approvals would compromise its independence when auditing those decisions.</p>
              : canStart ? <>
                <p className="text-sm text-muted-foreground">Create a Draft, complete the disclosure details, then send it to Disclosure Team to prepare supporting evidence and check the wording.</p>
                <label className="flex flex-col gap-2 text-sm">Review type<select className={field} value={type} onChange={e => setType(e.target.value as ReviewType)}><option value="routine">Routine Review · new PDS</option><option value="trigger">Trigger-Event Review · new concern</option></select></label>
                <Button disabled={!ready} onClick={() => initiate(type)}>Create Draft</Button>
              </> : review?.stage === 'approved' ? <p className="text-sm text-muted-foreground">Assessment approved by Risk / Compliance. No further approval action is required.</p>
              : canAct && review ? <>
                <p className="text-sm leading-relaxed">{task(review)}</p>
                {review.stage === 'verify' && <>
                  <p className="text-sm leading-relaxed text-muted-foreground">Compares the PDS claim against the prepared Bloomberg and MSCI records for GOV-001. An included security that is not screened contradicts a claim that all securities are screened. This checks one illustrative security under simplified rules and does not establish full regulatory compliance.</p>
                  <Button disabled={!ready} onClick={() => submit('verify')}>Run Verification</Button>
                  {review.report && <p className="text-sm font-medium">Review the verification result alongside the proposed wording before recording your decision.</p>}
                </>}
                {editable && <>
                  <label className="flex flex-col gap-2 text-sm">Review type (required)<select className={field} value={review.type} onChange={e => edit({ type: e.target.value as ReviewType })}><option value="routine">Routine Review</option><option value="trigger">Trigger-Event Review</option></select></label>
                </>}
                {editable && lastReturn && <div className="rounded border border-primary p-3 text-sm"><p className="font-semibold">Returned by {lastReturn.role}</p><p className="mt-1 whitespace-pre-wrap">{lastReturn.comment}</p></div>}
                {editable && lastReturn && review.claim === 'all' && <>
                  <p className="text-sm font-medium">Predefined proposed amendment</p>
                  <blockquote className="border bg-background p-3 text-sm leading-relaxed">&ldquo;{claims.qualified}&rdquo;</blockquote>
                  <Button variant="outline" onClick={() => edit({ claim: 'qualified' })}>Apply predefined amendment</Button>
                </>}
                <label className="flex flex-col gap-2 text-sm font-medium">Comments (required)<textarea required className="min-h-24 rounded border bg-card px-3 py-2 font-normal" value={comment} onChange={e => { setComment(e.target.value); setError('') }} placeholder={editable ? 'Explain the assessment and readiness for review' : 'Record your verification, endorsement, approval or return rationale'} /></label>
                <p className="text-xs text-muted-foreground">A comment is required for every decision. You cannot review or approve your own submission.</p>
                {editable ? <>
                  <Button disabled={!ready || !comment.trim() || blockers.length > 0} onClick={() => submit('submit')}>Send to Disclosure Team</Button>
                  {blockers.length > 0 && <div role="status" className="rounded border bg-background p-3 text-sm"><p className="font-medium">Complete before submission</p><ul className="mt-2 list-disc space-y-1 pl-4">{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div>}
                </> : <>
                  <div className="flex flex-wrap gap-2"><Button variant="success" disabled={!ready || !comment.trim() || !!acceptBlocker || evidenceDirty} onClick={() => submit('accept')}><Check />Accept</Button><Button variant="destructive" disabled={!ready || !comment.trim()} onClick={() => submit('reject')}><X />Reject</Button></div>
                  {evidenceDirty && <p className="text-sm text-muted-foreground">Save the supporting evidence before accepting.</p>}
                  {acceptBlocker && <p role="status" className="text-sm text-primary">{acceptBlocker}</p>}
                  <p className="text-xs text-muted-foreground">Reject returns the assessment to Product Management as Draft. Resubmission restarts verification and all subsequent reviews.{review.stage === 'risk' ? ' Accept marks the assessment Approved.' : ''}</p>
                </>}
              </> : <div className="flex flex-col gap-3 rounded border bg-background p-3 text-sm">
                <dl className="flex flex-col gap-2"><div><dt className="text-muted-foreground">Current action owner</dt><dd className="mt-1 font-medium">{owner(review) ?? 'Complete'}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge stage={review?.stage} /></dd></div></dl>
                <p className="text-muted-foreground">{review ? actionBlocker(review, user) : 'Only Product Management can create and edit a Draft.'}</p>
              </div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        </section>
        <section className="panel p-4">
          <h3 className="font-semibold">Assessment workflow</h3>
          <ol className="mt-3 flex flex-col gap-3">{workflow.map((step, index) => {
            const currentIndex = workflow.findIndex(item => item.stage === (review?.stage ?? 'draft'))
            const current = index === currentIndex
            return <li key={step.stage} aria-current={current ? 'step' : undefined} className="flex items-start gap-3"><span className={`step-number ${current ? 'active' : index < currentIndex ? 'complete' : ''}`}>{index < currentIndex ? <Check className="size-4" /> : index + 1}</span><div className="min-w-0 text-sm"><StatusBadge stage={step.stage} /><p className="mt-1 text-muted-foreground">{step.role ?? 'Review complete'}</p></div></li>
          })}</ol>
          <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">Internal Audit (LOD 3) provides separate, independent assurance outside this approval chain.</p>
        </section>
      </aside>
    </div>
  </div>
}
