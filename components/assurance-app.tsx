"use client"

import { useEffect, useState } from 'react'
import { RotateCcw, LayoutDashboard, FileText, History, ArrowRight, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DisclosureReview } from '@/components/disclosure-review'
import { ReviewHistory } from '@/components/review-history'
import { MonitoringStatus } from '@/components/monitoring-status'
import { OngoingMonitoring } from '@/components/ongoing-monitoring'
import { concernBlocker, flagConcern, addressConcern, responseBlocker, canAddressConcern, openConcernCount, type ConcernInput } from '@/lib/monitoring'
import { Deadline } from '@/components/review-timing'
import { ensureOverdueExample, overdueExampleId } from '@/lib/demo-review'
import { type EvidenceRecord } from '@/lib/evidence'
import { createReview, saveDraft, saveEvidence, attachPds, canEditDraft, decisionBlocker, transition, roles, users, fund, owner, assignee, task, canEditEvidence, actionBlocker, isReturnedForRevision, type Review, type Role, type Action, type DraftPatch, type DisclosureChecks } from '@/lib/review'
import { restoreReviews, storageKey, storageVersion } from '@/lib/review-storage'
import { storePds, readPds, clearPdsFiles } from '@/lib/pds'
import { isOverdue, formatTargetDate } from '@/lib/timing'
import { dashboardMetrics } from '@/lib/dashboard'


export function AssuranceApp() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [monitoringId, setMonitoringId] = useState<string | null>(null)
  const [disclosureId, setDisclosureId] = useState<string | null>(null)
  const [exampleError, setExampleError] = useState('')
  const [tab, setTab] = useState('dashboard')
  const [role, setRole] = useState<Role>('Product Management')
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer) }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      let saved: Review[] = []
      try { const raw = localStorage.getItem(storageKey); if (raw) saved = restoreReviews(raw) }
      catch { if (!cancelled) setStorageError(true) }
      try { saved = await ensureOverdueExample(saved) }
      catch { if (!cancelled) setExampleError('The overdue example could not be prepared. Check browser file storage and reload.') }
      if (!cancelled) { setReviews(saved); setReady(true) }
    }
    void load()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (ready && !storageError) {
      try { localStorage.setItem(storageKey, JSON.stringify({ version: storageVersion, reviews })) }
      catch { setStorageError(true) }
    }
  }, [reviews, ready, storageError])

  const primaryReviews = reviews.filter(record => record.id !== overdueExampleId)
  const primaryReview = primaryReviews.at(-1)
  const review = reviews.find(record => record.id === disclosureId) ?? primaryReview ?? (role === 'Product Management' ? undefined : reviews.find(record => record.id === overdueExampleId))
  // Resolve the existing workflow identity automatically; the demo is operated by role.
  const assigned = review && assignee(review)
  const user = (assigned?.role === role ? assigned : undefined)
    ?? users.find(u => u.role === role)!
  const claim = review?.claim ?? 'example'
  function initiate() {
    if (!ready) return
    const nextNumber = Math.max(0, ...primaryReviews.map(record => Number(record.id.match(/^ESG-(\d+)$/)?.[1] ?? 0))) + 1
    const created = createReview(`ESG-${String(nextNumber).padStart(3, '0')}`, 'example', user)
    if (!created) return
    setReviews(old => old.some(record => record.id === created.id) ? old : [...old, created])
    setDisclosureId(created.id); setTab('disclosures')
  }
  async function act(action: Action, comment: string, checks?: DisclosureChecks): Promise<string | null> {
    if (!ready || !review) return 'The assessment is not ready.'
    const blocked = decisionBlocker(review, action, user, comment, checks)
    if (blocked) return blocked
    if (action === 'submit') {
      try { if (!review.pds || !await readPds(review.pds.id)) return 'Upload the supporting PDS again; the file is unavailable in this browser.' }
      catch { return 'The supporting PDS could not be read. Please try the upload again.' }
    }
    setReviews(old => old.map(r => r.id === review?.id ? transition(r, action, user, comment, checks) : r))
    return null
  }
  function save(records: EvidenceRecord[]) {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? saveEvidence(r, records, user) : r))
  }
  function edit(patch: DraftPatch) {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? saveDraft(r, patch, user) : r))
  }
  async function upload(file: File) {
    if (!ready || !review || !canEditDraft(review, user)) throw new Error('Only Product Management can upload a PDS while the assessment is Draft.')
    const pds = await storePds(file, user.id)
    setReviews(old => old.map(r => r.id === review.id ? attachPds(r, pds, user) : r))
  }
  function removePds() {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? attachPds(r, undefined, user) : r))
  }
  function raiseConcern(id: string, input: ConcernInput): string | null {
    const record = reviews.find(record => record.id === id)
    if (!ready || !record) return 'The disclosure is not ready.'
    const blocked = concernBlocker(record, input, user)
    if (blocked) return blocked
    setReviews(old => old.map(record => record.id === id ? flagConcern(record, input, user) : record))
    return null
  }
  function respondToConcern(id: string, concernId: string, response: string): string | null {
    const record = reviews.find(record => record.id === id)
    if (!ready || !record) return 'The disclosure is not ready.'
    const blocked = responseBlocker(record, concernId, response, user)
    if (blocked) return blocked
    setReviews(old => old.map(record => record.id === id ? addressConcern(record, concernId, response, user) : record))
    return null
  }
  function openRecord(record?: Review) {
    if (record?.stage === 'approved') {
      setMonitoringId(record.id); setTab('monitoring')
    } else if (role === 'Internal Audit') {
      setSelected(record?.id ?? null); setTab('history')
    } else {
      setDisclosureId(record?.id ?? null); setTab('disclosures')
    }
  }
  async function reset() {
    setResetError('')
    let resetReviews: Review[]
    try { await clearPdsFiles(); resetReviews = await ensureOverdueExample([]) }
    catch { setResetError('Uploaded PDS files could not be cleared. Close other prototype tabs and try again.'); return }
    setReviews(resetReviews); setSelected(null); setMonitoringId(null); setDisclosureId(null); setExampleError(''); setTab('dashboard'); setRole('Product Management'); setResetting(false); setStorageError(false)
  }
  function switchRole(next: Role) {
    setRole(next)
    if (next === 'Internal Audit') setTab('history')
  }
  const attention = role === 'Internal Audit' ? 'Independently inspect evidence and management decisions through separate assurance activities.'
    : review && canEditEvidence(review, user) ? task(review)
    : review && actionBlocker(review, user) === null ? task(review)
    : review?.stage === 'approved' ? task(review)
    : `Current responsibility: ${owner(review)}. ${task(review)}`
  const registerReviews = reviews.length ? reviews : [undefined]
  const flaggedReviews = reviews.filter(record => record.concerns?.length)
  const assignedConcerns = reviews.flatMap(record => (record.concerns ?? []).filter(concern => canAddressConcern(record, concern, user)).map(concern => ({ record, concern })))
  const totalOpenConcerns = reviews.reduce((count, record) => count + openConcernCount(record), 0)
  const overdueAssessments = reviews.filter(r => isOverdue(r, now))
  const metrics = dashboardMetrics(reviews, now)
  const revisionsRequiredCount = reviews.filter(isReturnedForRevision).length

  return <div className="min-h-screen">
    <header className="border-t-4 border-t-primary border-b bg-card">
      <div className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-2 lg:px-8">
        <span className="text-sm text-muted-foreground">Vanguard Australia · Internal compliance portal</span>
        <span className="text-sm text-muted-foreground">Academic prototype — not an official Vanguard system</span>
      </div></div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <div className="flex items-center gap-4"><span className="font-serif text-3xl font-bold tracking-tight text-primary">Vanguard</span><h1 className="max-w-sm border-l pl-4 text-balance text-lg font-semibold">ESG Disclosure Assurance System</h1></div>
        <label className="flex flex-col gap-1 text-sm font-medium">Simulated role<select className="rounded border bg-card px-3 py-2" value={role} onChange={e => switchRole(e.target.value as Role)}>{roles.map(r => <option key={r}>{r}</option>)}</select></label>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-4 lg:px-8">
      <Tabs value={tab} onValueChange={v => setTab(String(v))} className="main-tabs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b">
          <div className="w-full pb-1 sm:w-auto sm:overflow-x-auto"><TabsList variant="line"><TabsTrigger value="dashboard"><LayoutDashboard />Dashboard</TabsTrigger><TabsTrigger value="disclosures"><FileText />Disclosures</TabsTrigger><TabsTrigger value="history"><History />Review History</TabsTrigger><TabsTrigger value="monitoring"><Activity />Ongoing Monitoring</TabsTrigger></TabsList></div>
          <Button size="sm" variant="ghost" disabled={!ready} onClick={() => setResetting(true)}><RotateCcw data-icon="inline-start" />Reset Demo</Button>
        </div>
        {resetting && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border bg-card p-3"><p className="text-sm">Reset disclosure wording and clear all uploaded PDS files, monitoring concerns and local review history?</p><div className="flex gap-2"><Button variant="outline" onClick={() => setResetting(false)}>Cancel</Button><Button onClick={reset}>Confirm reset</Button></div>{resetError && <p className="w-full text-sm text-destructive">{resetError}</p>}</div>}
        {exampleError && <p role="alert" className="text-sm text-destructive">{exampleError}</p>}
        {storageError && <p role="alert" className="text-sm text-destructive">Local data could not be read or saved. Changes work in this session only. Reset Demo to clear invalid data.</p>}
        <TabsContent value="dashboard" className="min-w-0 pt-4"><div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><h2 className="text-2xl font-semibold">{role === 'Risk / Compliance Team' ? 'Disclosure monitoring' : 'Disclosure dashboard'}</h2>{role === 'Product Management' && <Button className="ml-auto" disabled={!ready} onClick={initiate}>Create disclosure</Button>}<p className="w-full text-sm text-muted-foreground">{role} · {attention}</p></div>
          <div className="grid grid-cols-2 divide-x divide-y rounded border bg-card sm:grid-cols-4 sm:divide-y-0">{metrics.map(metric => <div key={metric.label} className="px-4 py-3"><p className="text-sm text-muted-foreground">{metric.label}</p><p className={`mt-1 text-xl font-semibold ${metric.label === 'Overdue' && metric.count ? 'text-red-700' : ''}`}>{metric.count}</p></div>)}</div>
          {revisionsRequiredCount > 0 && <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span>Additional status</span><Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-900">Revisions Required: {revisionsRequiredCount}</Badge></div>}
          {flaggedReviews.length > 0 && <section className="panel border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Risk / Compliance concerns</h3><p className="mt-1 text-sm">{totalOpenConcerns} open {totalOpenConcerns === 1 ? 'concern' : 'concerns'} across approved disclosures.</p>{assignedConcerns.length > 0 && <p className="mt-2 text-sm font-semibold text-amber-900">Your team must address {assignedConcerns.length} assigned {assignedConcerns.length === 1 ? 'concern' : 'concerns'}.</p>}<Button className="mt-3" variant="outline" onClick={() => { setMonitoringId(assignedConcerns[0]?.record.id ?? flaggedReviews.at(-1)!.id); setTab('monitoring') }}>{assignedConcerns.length ? 'Address assigned concerns' : 'View concerns'}</Button></section>}
          <section className="panel min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><h3 className="font-semibold">Disclosure register</h3><Badge variant="outline">{registerReviews.length} {registerReviews.length === 1 ? 'disclosure' : 'disclosures'}</Badge></div>
            <div className="relative overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-background text-muted-foreground"><tr>{['Disclosure / fund', 'Disclosure Status', 'Monitoring Status', 'Current action owner', 'Target completion date', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h || <span className="sr-only">Open record</span>}</th>)}</tr></thead>
              <tbody>{registerReviews.map(record => {
                const overdue = !!record && isOverdue(record, now)
                const example = record?.id === overdueExampleId
                return <tr key={record?.id ?? 'new-disclosure'} className={overdue ? 'border-y border-red-300 bg-red-50' : 'border-t'}><td className={`min-w-60 px-4 py-4 ${overdue ? 'border-l-4 border-l-red-600' : ''}`}><button disabled={!ready} className="text-left font-semibold underline-offset-4 hover:underline" onClick={() => openRecord(record)}>ESG screening disclosure</button><p className="mt-1 max-w-md text-muted-foreground">{fund}</p><p className="mt-1 text-muted-foreground">{example ? 'PDS-002' : 'PDS-001'} &middot; {example ? 'Overdue Product Strategy example' : record?.id ?? 'Newly drafted PDS'}</p></td><td className="w-64 min-w-52 px-4 py-4"><div className="flex flex-col items-start gap-2"><StatusBadge review={record} />{overdue && <Badge variant="destructive" className="border-red-300 bg-red-100 text-red-900">Overdue</Badge>}</div></td><td className="px-4 py-4"><MonitoringStatus review={record} /></td><td className="px-4 py-4">{owner(record) ?? 'Complete'}</td><td className="px-4 py-4">{formatTargetDate(record?.targetDate)}</td><td className={`px-4 py-4 ${overdue ? 'border-r border-r-red-300' : ''}`}><Button variant="outline" disabled={!ready} onClick={() => openRecord(record)}>{record?.stage === 'approved' ? role === 'Risk / Compliance Team' ? 'Flag Concern' : 'View concerns' : role === 'Internal Audit' ? 'View history' : example && record?.stage === 'verify' && role === 'Product Strategy' ? 'Review checks' : 'Open disclosure'}<ArrowRight data-icon="inline-end" /></Button></td></tr>
              })}</tbody>
            </table></div>
          </section>
          {role === 'Risk / Compliance Team' && <section className="panel"><div className="border-b p-4"><h3 className="font-semibold">Revisions Required & overdue assessments</h3></div><div className="flex flex-col gap-3 p-4">
            <h4 className="text-sm font-semibold">Overdue assessments</h4>
            {overdueAssessments.map(r => <div key={`timing-${r.id}`} className="rounded border border-red-200 bg-red-50 p-3 text-sm"><p className="font-semibold">{r.id} · Overdue · Current action owner: {owner(r)}</p><div className="mt-2"><Deadline review={r} now={now} /></div></div>)}
            {overdueAssessments.length === 0 && <p className="text-sm text-muted-foreground">No overdue assessments.</p>}
            {reviews.filter(isReturnedForRevision).map(r => <div className="flex flex-wrap items-center gap-2 border-b pb-3 text-sm" key={r.id}><strong>{r.id}</strong><StatusBadge review={r} /><span>{task(r)}</span></div>)}
            {!reviews.some(isReturnedForRevision) && <p className="text-sm text-muted-foreground">No disclosures require revisions.</p>}
          </div></section>}
          {role === 'Internal Audit' && <section className="panel p-4"><h3 className="font-semibold">Separate assurance activities</h3><p className="mt-2 text-sm text-muted-foreground">Internal Audit independently examines evidence and management decisions. It does not verify, endorse or approve assessments in the management approval chain.</p><Button className="mt-3" variant="outline" onClick={() => setTab('history')}>Inspect decision history</Button></section>}
        </div></TabsContent>
        <TabsContent value="disclosures" className="min-w-0 pt-4">{reviews.length > 1 && <label className="mb-4 flex max-w-md flex-col gap-2 text-sm font-medium">Select disclosure<select className="rounded border bg-card px-3 py-2" value={review?.id ?? ''} onChange={event => setDisclosureId(event.target.value)}><option value="" disabled>Choose a disclosure</option>{reviews.map(record => <option key={record.id} value={record.id}>{record.id} &middot; {owner(record) ?? 'Approved'}</option>)}</select></label>}<DisclosureReview key={`${review?.id}-${review?.stage}-${user.id}`} review={review} claim={claim} user={user} initiate={initiate} act={act} ready={ready} save={save} edit={edit} now={now} upload={upload} removePds={removePds} /></TabsContent>
        <TabsContent value="monitoring" className="min-w-0 pt-4"><OngoingMonitoring reviews={reviews} selected={monitoringId} select={setMonitoringId} ready={ready} user={user} flag={raiseConcern} address={respondToConcern} /></TabsContent>
        <TabsContent value="history" className="min-w-0 pt-4"><ReviewHistory reviews={reviews} selected={selected} select={setSelected} now={now} /></TabsContent>
      </Tabs>
      <footer className="mt-6 flex flex-wrap justify-between gap-2 border-t py-4 text-sm text-muted-foreground"><span>Simulated role actions · Deterministic checks · No authentication</span><span>{ready ? 'Demo data stored in this browser only' : 'Loading local demo…'}</span></footer>
    </main>
  </div>
}
