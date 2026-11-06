"use client"

import { useState } from 'react'
import { Check, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { disclosureAreas, disclosureOutcomes, validDisclosureChecks, type DisclosureChecks } from '@/lib/review'

type Props = {
 checks?: DisclosureChecks
 editable: boolean
 decide: (action: 'accept' | 'reject', comment: string, checks: DisclosureChecks) => Promise<string | null>
 approvalBlocker: (checks: DisclosureChecks, comment: string) => string | null
}

const choiceStyles = {
 pass: 'peer-checked:border-green-600 peer-checked:bg-green-50 peer-checked:text-green-800',
 'needs-revision': 'peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-800',
 na: 'peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-800',
}

export function DisclosureTeamReview({ checks, editable, decide, approvalBlocker }: Props) {
 const [values, setValues] = useState<DisclosureChecks>(checks ?? { pds: '', website: '', marketing: '' })
 const [comment, setComment] = useState('')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const needsRevision = Object.values(values).includes('needs-revision')
 const complete = validDisclosureChecks(values)
 const reviewed = disclosureAreas.filter(({ key }) => Object.hasOwn(disclosureOutcomes, values[key])).length
 const blocked = approvalBlocker(values, comment.trim() || 'Preview decision')

 async function submit(action: 'accept' | 'reject') {
  if (!editable || busy) return
  if (!comment.trim()) { setError('Add review comments before approving or rejecting.'); return }
  if (action === 'accept' && (!complete || needsRevision || blocked)) {
   setError(blocked ?? 'Every checklist item must be Pass or N/A before approval.'); return
  }
  setBusy(true)
  setError('')
  try {
   const message = await decide(action, comment, values)
   if (message) setError(message)
  } catch { setError('The review decision could not be saved. Please try again.') }
  finally { setBusy(false) }
 }

 return <section className="border-t p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Disclosure Team Review</h3><span className="text-xs text-muted-foreground">{reviewed} of 3 reviewed</span></div>
  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Confirm that the disclosures accurately reflect Product Strategy&apos;s verified ESG screening methodology, exclusions, issuer coverage and limitations.</p>
  <form onSubmit={event => { event.preventDefault(); void submit('accept') }} className="mt-4 flex flex-col gap-3">
   {disclosureAreas.map(({ key, label }) => <fieldset key={key} disabled={!editable || busy} className="rounded-lg border bg-background/50 p-3">
    <legend className="px-1 text-sm font-semibold">{label}</legend>
    <div className="grid grid-cols-3 gap-2">{Object.entries(disclosureOutcomes).map(([value, title]) => {
     const Icon = value === 'pass' ? Check : value === 'na' ? Minus : X
     return <label key={value} className={`min-w-0 ${editable && !busy ? 'cursor-pointer' : 'cursor-default'}`}>
      <input type="radio" name={`disclosure-${key}`} value={value} checked={values[key] === value} onChange={() => { setValues(old => ({ ...old, [key]: value })); setError('') }} className="peer sr-only" />
      <span className={`flex h-full min-h-12 flex-col items-center justify-center gap-1 rounded-md border bg-card px-2 py-2 text-center text-xs font-medium text-muted-foreground transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary sm:flex-row sm:text-sm ${editable && !busy ? 'hover:border-slate-400' : ''} ${choiceStyles[value as keyof typeof choiceStyles]}`}><Icon className="size-4 shrink-0" aria-hidden="true" />{title}</span>
     </label>
    })}</div>
   </fieldset>)}
   {editable && <>
    <p role="status" className={`rounded-md border p-3 text-sm ${needsRevision ? 'border-red-200 bg-red-50 text-red-800' : complete ? 'border-green-200 bg-green-50 text-green-800' : 'bg-background text-muted-foreground'}`}>{needsRevision ? 'Needs revision selected. Only Reject is available.' : complete ? 'All checklist items are Pass or N/A. Add review comments to approve.' : 'Select an outcome for each item to enable approval.'}</p>
    <label className="mt-1 flex flex-col gap-2 text-sm font-medium">Review comments (required)<textarea required disabled={busy} className="min-h-28 rounded-md border bg-card px-3 py-2 font-normal" value={comment} onChange={event => { setComment(event.target.value); setError('') }} placeholder="Explain your review findings and approval or rejection decision" /></label>
    <div className="flex flex-wrap gap-2"><Button type="submit" variant="success" disabled={busy || !comment.trim() || !complete || needsRevision || !!blocked}><Check />Approve</Button><Button type="button" variant="destructive" disabled={busy || !comment.trim()} onClick={() => void submit('reject')}><X />Reject</Button></div>
    {complete && !needsRevision && blocked && <p className="text-sm text-primary">{blocked}</p>}
    <p className="text-xs text-muted-foreground">Approve sends the assessment to Risk / Compliance. Reject returns it to Product Management as Draft with an additional Revisions Required badge. Your checklist and comments are saved with the decision.</p>
   </>}
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
 </section>
}
