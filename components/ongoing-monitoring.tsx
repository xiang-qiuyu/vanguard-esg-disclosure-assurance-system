"use client"

import { useState } from 'react'
import { Flag, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { MonitoringStatus } from '@/components/monitoring-status'
import { fund, type Review, type User } from '@/lib/review'
import { canAddressConcern, openConcernCount, concernCategories, concernTitles, riskSeverities, remediationTeams, concernInputError, type Concern, type ConcernInput } from '@/lib/monitoring'

type Props = {
 reviews: Review[]
 selected: string | null
 select: (id: string) => void
 ready: boolean
 user: User
 flag: (id: string, input: ConcernInput) => string | null
 address: (id: string, concernId: string, response: string) => string | null
}

const severityStyles = {
 low: 'border-slate-300 bg-slate-50 text-slate-700',
 medium: 'border-yellow-300 bg-yellow-50 text-yellow-900',
 high: 'border-orange-300 bg-orange-50 text-orange-900',
 critical: 'border-red-300 bg-red-50 text-red-900',
}
const selectedSeverityStyles = {
 low: 'peer-checked:border-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900',
 medium: 'peer-checked:border-yellow-500 peer-checked:bg-yellow-50 peer-checked:text-yellow-900',
 high: 'peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-900',
 critical: 'peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-900',
}

function ConcernForm({ review, ready, flag }: { review: Review; ready: boolean; flag: Props['flag'] }) {
 const empty: ConcernInput = { category: '', severity: '', description: '', assignedTo: '' }
 const [input, setInput] = useState<ConcernInput>(empty)
 const [message, setMessage] = useState('')
 const [error, setError] = useState('')
 const invalid = concernInputError(input)
 const field = 'min-w-0 rounded-md border bg-card px-3 py-2 text-sm'
 function update(patch: Partial<ConcernInput>) { setInput(old => ({ ...old, ...patch })); setMessage(''); setError('') }
 function submit(event: React.FormEvent) {
  event.preventDefault()
  if (!ready) return
  if (invalid) { setError(invalid); return }
  const blocked = flag(review.id, input)
  if (blocked) { setError(blocked); return }
  setInput(empty)
  setMessage('Concern flagged. Monitoring Status is Active; Disclosure Status remains Approved.')
 }
 return <section className="panel min-w-0">
  <div className="border-b p-4"><h3 className="font-semibold">Raise a New Concern</h3><p className="mt-1 text-sm text-muted-foreground">Record an issue identified during ongoing monitoring and assign a team to address it.</p></div>
  <form className="flex flex-col gap-4 p-4" onSubmit={submit}>
   <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">Concern Category<select required className={field} value={input.category} onChange={event => update({ category: event.target.value as ConcernInput['category'] })}><option value="" disabled>Choose a category</option>{Object.entries(concernCategories).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
   <fieldset><legend className="mb-2 text-sm font-medium">Risk Severity</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Object.entries(riskSeverities).map(([value, title]) => <label key={value} className="cursor-pointer"><input required type="radio" className="peer sr-only" name="concern-severity" value={value} checked={input.severity === value} onChange={() => update({ severity: value as ConcernInput['severity'] })} /><span className={`flex min-h-11 items-center justify-center rounded-md border bg-card px-2 py-2 text-sm font-medium text-muted-foreground hover:border-slate-400 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${selectedSeverityStyles[value as keyof typeof selectedSeverityStyles]}`}>{title}</span></label>)}</div></fieldset>
   <label className="flex flex-col gap-2 text-sm font-medium">Concern Description<textarea required maxLength={4000} className={`${field} min-h-32 font-normal`} value={input.description} onChange={event => update({ description: event.target.value })} placeholder="e.g. Corporate bond CORP-001 lacks verified exclusion-screening coverage. Assess whether the published disclosure communicates this limitation." /></label>
   <label className="flex min-w-0 flex-col gap-2 text-sm font-medium">Assign Remediation To<select required className={`${field} w-full`} value={input.assignedTo} onChange={event => update({ assignedTo: event.target.value as ConcernInput['assignedTo'] })}><option value="" disabled>Choose a team</option>{Object.entries(remediationTeams).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
   <p className="text-xs text-muted-foreground">All fields are required. The concern will be recorded as Open.</p>
   <Button type="submit" disabled={!ready || !!invalid} className="min-h-11 self-start px-4"><Flag />Flag Concern</Button>
   {message && <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{message}</p>}
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
 </section>
}

function ConcernCard({ review, concern, user, ready, address }: { review: Review; concern: Concern; user: User; ready: boolean; address: Props['address'] }) {
 const [response, setResponse] = useState('')
 const [error, setError] = useState('')
 const assigned = canAddressConcern(review, concern, user)
 const addressed = concern.status === 'addressed'
 function submit(event: React.FormEvent) {
  event.preventDefault()
  if (!ready || !assigned) return
  const message = address(review.id, concern.id, response)
  if (message) setError(message)
  else { setError(''); setResponse('') }
 }
 return <article className={`min-w-0 rounded-lg border p-4 ${addressed ? 'border-green-200 bg-green-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
  <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 font-semibold">{review.id}: {concernTitles[concern.category]}</h4><Badge variant="outline" className={addressed ? 'border-green-300 bg-green-50 text-green-800' : 'border-amber-300 bg-amber-50 text-amber-900'}>{addressed ? 'Addressed' : 'Open'}</Badge></div>
  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{concern.description}</p>
  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span>Assigned to <strong>{concern.assignedTo}</strong></span><Badge variant="outline" className={severityStyles[concern.severity]}>{riskSeverities[concern.severity]} priority</Badge></div>
  <p className="mt-3 text-xs text-muted-foreground">{concern.id} &middot; {new Date(concern.raisedAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' })} SGT</p>
  {concern.response && <div className="mt-4 rounded-md border border-green-200 bg-card p-3"><p className="text-sm font-semibold">Response from {concern.assignedTo}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{concern.response.text}</p><p className="mt-2 text-xs text-muted-foreground">Addressed {new Date(concern.response.at).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' })} SGT</p></div>}
  {assigned && <form className="mt-4 flex flex-col gap-3 border-t border-amber-200 pt-4" onSubmit={submit}>
   <p className="text-sm font-semibold text-amber-900">Your team must address this concern.</p>
   <label className="flex flex-col gap-2 text-sm font-medium">Remediation response (required)<textarea required maxLength={4000} className="min-h-28 rounded-md border bg-card px-3 py-2 font-normal" value={response} onChange={event => { setResponse(event.target.value); setError('') }} placeholder="Describe the checks or corrections your team completed and the outcome." /></label>
   <Button type="submit" variant="success" className="self-start" disabled={!ready || !response.trim()}>Mark addressed</Button>
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>}
 </article>
}

export function OngoingMonitoring({ reviews, selected, select, ready, user, flag, address }: Props) {
 const approved = reviews.filter(review => review.stage === 'approved')
 const review = approved.find(review => review.id === selected) ?? approved.at(-1)
 const assignedCount = review?.concerns?.filter(concern => canAddressConcern(review, concern, user)).length ?? 0
 return <div className="flex min-w-0 flex-col gap-4">
  <div><p className="eyebrow">{user.role} &middot; Ongoing Monitoring</p><h2 className="mt-2 text-2xl font-semibold">ESG Disclosure Monitoring</h2><p className="mt-1 text-sm text-muted-foreground">{fund}</p></div>
  {!review ? <section className="panel flex flex-col items-start gap-3 p-5"><ShieldCheck className="size-7 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">No approved disclosures to monitor yet</h3><p className="text-sm text-muted-foreground">Complete the disclosure approval process first. Risk / Compliance can then flag concerns here.</p></section> : <>
   {approved.length > 1 ? <label className="flex max-w-md flex-col gap-2 text-sm font-medium">Approved disclosure<select className="rounded border bg-card px-3 py-2" value={review.id} onChange={event => select(event.target.value)}>{approved.map(record => <option key={record.id} value={record.id}>{record.id} &middot; Approved disclosure</option>)}</select></label> : <p className="text-sm text-muted-foreground">{review.id}</p>}
   <dl className="grid gap-3 sm:grid-cols-3"><div className="panel p-4"><dt className="text-sm text-muted-foreground">Disclosure Status</dt><dd className="mt-2"><StatusBadge stage={review.stage} /></dd></div><div className="panel p-4"><dt className="text-sm text-muted-foreground">Monitoring Status</dt><dd className="mt-2"><MonitoringStatus review={review} /></dd></div><div className="panel p-4"><dt className="text-sm text-muted-foreground">Open concerns</dt><dd className="mt-1 text-2xl font-semibold">{openConcernCount(review)}</dd></div></dl>
   {assignedCount > 0 && <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">Your team has {assignedCount} open {assignedCount === 1 ? 'concern' : 'concerns'} to address. Record a remediation response below.</p>}
   <section className="panel"><div className="border-b p-4"><h3 className="font-semibold">Existing concerns</h3></div><div className="flex flex-col gap-3 p-4">
    {!review.concerns?.length ? <p className="text-sm text-muted-foreground">No concerns raised. Monitoring Status is Nil.</p> : review.concerns.map(concern => <ConcernCard key={concern.id} review={review} concern={concern} user={user} ready={ready} address={address} />)}
   </div></section>
   {user.role === 'Risk / Compliance Team' && <ConcernForm key={review.id} review={review} ready={ready} flag={flag} />}
  </>}
 </div>
}
