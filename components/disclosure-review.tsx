"use client"

import { useState } from 'react'
import { LockKeyhole, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { EvidenceEditor } from '@/components/evidence-editor'
import { DisclosureTeamReview } from '@/components/disclosure-team-review'
import { CheckResults } from '@/components/check-results'
import { PdsUpload } from '@/components/pds-upload'
import { ReviewTiming } from '@/components/review-timing'
import { type EvidenceRecord } from '@/lib/evidence'
import { overdueExampleId } from '@/lib/demo-review'
import { claims, fund, owner, workflow, task, lineOfDefence, canEditDraft, canEditEvidence, canReviewDisclosure, isReturnedForRevision, actionBlocker, decisionBlocker, submissionBlockers, type Review, type User, type Action, type Claim, type DraftPatch, type DisclosureChecks } from '@/lib/review'

type Props = {
  review?: Review; claim: Claim; user: User; ready: boolean; now: Date
  initiate: () => void; act: (action: Action, comment: string, checks?: DisclosureChecks) => Promise<string | null>
  save: (records: EvidenceRecord[]) => void; edit: (patch: DraftPatch) => void
  upload: (file: File) => Promise<void>; removePds: () => void
}

export function DisclosureReview({ review, claim, user, initiate, act, ready, save, edit, now, upload, removePds }: Props) {
  const [comment, setComment] = useState('')
  const [evidenceDirty, setEvidenceDirty] = useState(false)
  const [error, setError] = useState('')
  const [pdsBusy, setPdsBusy] = useState(false)
  const [acting, setActing] = useState(false)
  const editable = ready && !!review && canEditDraft(review, user)
  const evidenceEditable = ready && !!review && canEditEvidence(review, user)
  const disclosureEditable = ready && !!review && canReviewDisclosure(review, user)
  const canAct = ready && !!review && actionBlocker(review, user) === null
  const canStart = user.role === 'Product Management' && (!review || review.stage === 'approved')
  const reviewing = !!review && !['draft', 'approved'].includes(review.stage)
  const blockers = review?.stage === 'draft' ? submissionBlockers(review) : []
  const acceptBlocker = reviewing ? decisionBlocker(review, 'accept', user, comment.trim() || 'Preview decision') : null
  const lastReturn = review?.events.findLast(event => event.to === 'draft' && event.from !== 'draft')
  const field = 'rounded border bg-card px-3 py-2 text-sm disabled:opacity-70'
  const amendedClaim = claim === 'example' ? 'exampleQualified' : 'qualified'
  const wordingExtracted = !!review?.pds && review.extraction?.pdsId === review.pds.id

  async function submit(action: Action) {
    if (!review || !ready || acting || pdsBusy) return
    const blocked = decisionBlocker(review, action, user, comment)
    if (blocked || (['verify', 'accept'].includes(action) && evidenceDirty)) {
      setError(blocked ?? 'Save your evidence changes before running verification or accepting.'); return
    }
    setActing(true)
    try {
      const message = await act(action, comment)
      if (message) { setError(message); return }
      if (action !== 'verify') setComment('')
      setError('')
    } catch { setError('The action could not be completed. Please try again.') }
    finally { setActing(false) }
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-xl font-semibold">ESG screening disclosure</h2><p className="mt-1 text-sm text-muted-foreground">{review?.id === overdueExampleId ? 'PDS-002 · Product Strategy delay example' : 'PDS-001 · Newly drafted PDS'}{review && review.id !== overdueExampleId ? ` · ${review.id}` : ''}</p></div>
      <StatusBadge review={review} />
    </div>
    {review && <ReviewTiming review={review} now={now} delayedChecks={review.id === overdueExampleId && review.stage === 'verify'} />}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="panel">
          <div className="border-b p-4"><p className="eyebrow">Fund</p><h3 className="mt-2 font-semibold">{fund}</h3></div>
          {review && <PdsUpload pds={review.pds} editable={editable} upload={upload} remove={removePds} onBusyChange={setPdsBusy} />}
          <div className="p-4">
            <h3 className="text-sm font-semibold">Current disclosure wording</h3>
            {wordingExtracted ? <>
              <blockquote className="mt-3 text-base leading-relaxed">&ldquo;{claims[claim]}&rdquo;</blockquote>
              <p className="mt-2 break-words text-xs text-muted-foreground">Simulated extraction from {review!.pds!.name}.{['exampleQualified', 'qualified'].includes(claim) ? ' Wording amended by Product Management after review.' : ' The supplied example wording is used for this prototype.'}</p>
            </> : <p className="mt-3 text-sm text-muted-foreground">Upload the supporting PDS to simulate extracting its disclosure wording.</p>}
          </div>
          {review?.report && <div className="flex flex-col gap-3 border-t p-4"><CheckResults report={review.report} /><p className="text-xs text-muted-foreground">Checks one illustrative security (GOV-001) under simplified rules. Product Strategy must review the result and record its verification decision.</p></div>}
          {review && <EvidenceEditor key={`${review.id}-${review.pds?.id ?? 'no-pds'}-${evidenceEditable}`} records={review.evidence} preparedRecords={review.report?.snapshot} role={user.role} pdsUploaded={wordingExtracted} editable={evidenceEditable} save={save} onDirtyChange={setEvidenceDirty} />}
          {review && wordingExtracted && (['disclosure', 'risk', 'approved'].includes(review.stage) || review.disclosureChecks) && <DisclosureTeamReview checks={review.disclosureChecks} editable={disclosureEditable} decide={act} approvalBlocker={(checks, text) => decisionBlocker(review, 'accept', user, text, checks)} />}
        </section>
      </div>
      <aside className="flex flex-col gap-4">
        <section className="panel">
          <div className="border-b p-4"><h3 className="font-semibold">{user.role === 'Internal Audit' ? 'Independent assurance' : 'Your actions'}</h3><p className="mt-1 text-sm text-muted-foreground">{user.role} · {lineOfDefence(user.role)}</p></div>
          <div className="flex flex-col gap-3 p-4" aria-live="polite">
            {review && review.stage !== 'draft' && <p className="flex items-center gap-2 rounded border bg-background p-3 text-sm"><LockKeyhole className="size-4 shrink-0" />{review.stage === 'verify' ? 'Assessment content and the uploaded PDS are locked. Product Strategy can edit the supporting screening evidence during verification.' : review.stage === 'disclosure' ? 'Assessment content and screening evidence are locked. Disclosure Team can complete the checklist and add review comments before approving or rejecting.' : 'Assessment content and supporting evidence are locked.'}</p>}
            {user.role === 'Internal Audit' ? <p className="text-sm leading-relaxed">Internal Audit works alongside this process through separate assurance activities. Inspect evidence and decisions in Review History. Participating in management approvals would compromise its independence when auditing those decisions.</p>
              : canStart ? <>
                <p className="text-sm text-muted-foreground">Create a Draft to get started, then upload the PDS PDF first. The upload displays its example disclosure wording and supporting evidence for review.</p>
                <Button disabled={!ready} onClick={initiate}>Create Draft</Button>
              </> : review?.stage === 'approved' ? <p className="text-sm text-muted-foreground">Assessment approved by Risk / Compliance. No further approval action is required.</p>
              : disclosureEditable && review ? <><p className="text-sm leading-relaxed">{task(review)}</p><p className="text-sm text-muted-foreground">Use the checklist, review comments and Approve or Reject buttons in Disclosure Team Review.</p></>
              : canAct && review ? <>
                {editable && !review.pds && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Choose a PDS to populate the disclosure wording and evidence.</p>}
                {(!editable || review.pds) && <p className="text-sm leading-relaxed">{task(review)}</p>}
                {review.stage === 'verify' && <>
                  <p className="text-sm leading-relaxed text-muted-foreground">Compares the example disclosure with prepared Bloomberg and MSCI records for GOV-001, highlighting screening coverage gaps and limitations relevant to the stated exclusions. This checks one illustrative security under simplified rules and does not establish full regulatory compliance.</p>
                  <Button disabled={!ready || acting || evidenceDirty} onClick={() => submit('verify')}>Run Verification</Button>
                  {evidenceDirty && <p className="text-sm text-muted-foreground">Save the supporting evidence before running verification.</p>}
                  {review.report && <p className="text-sm font-medium">{review.result === 'review-required' ? 'Review the coverage limitation, add your decision comment, then select Approve. The finding remains visible to later reviewers.' : 'Review the verification result alongside the proposed wording before recording your decision.'}</p>}
                </>}
                {editable && <>
                  <label className="flex flex-col gap-2 text-sm">Target completion date (required)<input required type="date" className={field} value={review.targetDate ?? ''} onChange={event => edit({ targetDate: event.target.value })} /></label>
                  <p className="text-xs text-muted-foreground">Due by the end of this date in Singapore time. Unfinished assessments are flagged overdue from the next day.</p>
                </>}
                {editable && lastReturn && <div className="rounded border border-primary p-3 text-sm"><p className="font-semibold">Returned by {lastReturn.role}</p><p className="mt-1 whitespace-pre-wrap">{lastReturn.comment}</p></div>}
                {editable && lastReturn && ['all', 'example'].includes(review.claim) && <>
                  <p className="text-sm font-medium">Predefined proposed amendment</p>
                  <blockquote className="border bg-background p-3 text-sm leading-relaxed">&ldquo;{claims[amendedClaim]}&rdquo;</blockquote>
                  <Button variant="outline" onClick={() => edit({ claim: amendedClaim })}>Apply predefined amendment</Button>
                </>}
                <label className="flex flex-col gap-2 text-sm font-medium">Comments (required)<textarea required className="min-h-24 rounded border bg-card px-3 py-2 font-normal" value={comment} onChange={e => { setComment(e.target.value); setError('') }} placeholder={editable ? 'Explain the assessment and readiness for review' : 'Record your verification, endorsement, approval or return rationale'} /></label>
                <p className="text-xs text-muted-foreground">A comment is required for every decision. You cannot review or approve your own submission.</p>
                {editable ? <>
                  <Button disabled={!ready || acting || pdsBusy || !comment.trim() || blockers.length > 0} onClick={() => submit('submit')}>{isReturnedForRevision(review) ? 'Resubmit to Product Strategy' : 'Send to Product Strategy'}</Button>
                  {blockers.length > 0 && <div role="status" className="rounded border bg-background p-3 text-sm"><p className="font-medium">Complete before submission</p><ul className="mt-2 list-disc space-y-1 pl-4">{blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div>}
                </> : <>
                  <div className="flex flex-wrap gap-2"><Button variant="success" className="h-auto max-w-full whitespace-normal py-2" disabled={!ready || acting || !comment.trim() || !!acceptBlocker || evidenceDirty} onClick={() => submit('accept')}><Check />{review.stage === 'verify' ? 'Approve' : 'Accept'}</Button><Button variant="destructive" disabled={!ready || acting || !comment.trim()} onClick={() => submit('reject')}><X />Reject</Button></div>
                  {evidenceDirty && <p className="text-sm text-muted-foreground">Save the supporting evidence before accepting.</p>}
                  {acceptBlocker && <p role="status" className="text-sm text-primary">{acceptBlocker}</p>}
                </>}
              </> : <div className="flex flex-col gap-3 rounded border bg-background p-3 text-sm">
                <dl className="flex flex-col gap-2"><div><dt className="text-muted-foreground">Current action owner</dt><dd className="mt-1 font-medium">{owner(review) ?? 'Complete'}</dd></div><div><dt className="text-muted-foreground">Disclosure Status</dt><dd className="mt-1"><StatusBadge review={review} /></dd></div></dl>
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
            return <li key={step.stage} aria-current={current ? 'step' : undefined} className="flex items-start gap-3"><span className={`step-number ${current ? 'active' : index < currentIndex ? 'complete' : ''}`}>{index < currentIndex ? <Check className="size-4" /> : index + 1}</span><div className="min-w-0 text-sm"><StatusBadge stage={step.stage} /><p className="mt-1 text-muted-foreground">{step.role ?? 'Review complete'}{step.lod ? ` · ${step.lod}` : ''}</p></div></li>
          })}</ol>
          <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">Internal Audit (LOD 3) provides separate, independent assurance outside this approval chain.</p>
        </section>
      </aside>
    </div>
  </div>
}
