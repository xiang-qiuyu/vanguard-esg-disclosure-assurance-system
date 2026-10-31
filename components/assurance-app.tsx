"use client"

import { useEffect, useState } from 'react'
import { RotateCcw, LayoutDashboard, FileText, History, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DisclosureReview } from '@/components/disclosure-review'
import { ReviewHistory } from '@/components/review-history'
import { type EvidenceRecord } from '@/lib/evidence'
import { createReview, saveDraft, saveEvidence, transition, roles, users, fund, owner, assignee, task, canEditEvidence, actionBlocker, type Review, type ReviewType, type Role, type Action, type DraftPatch, type DisclosureChecks } from '@/lib/review'
import { restoreReviews, storageKey, storageVersion } from '@/lib/review-storage'

export function AssuranceApp() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState('dashboard')
  const [role, setRole] = useState<Role>('Product Management')
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setReviews(restoreReviews(raw))
    } catch { setStorageError(true) }
    setReady(true)
  }, [])
  useEffect(() => {
    if (ready && !storageError) {
      try { localStorage.setItem(storageKey, JSON.stringify({ version: storageVersion, reviews })) }
      catch { setStorageError(true) }
    }
  }, [reviews, ready, storageError])

  const review = reviews.at(-1)
  // Resolve the existing workflow identity automatically; the demo is operated by role.
  const assigned = review && assignee(review)
  const user = (assigned?.role === role ? assigned : undefined)
    ?? users.find(u => u.role === role)!
  const claim = review?.claim ?? 'all'
  const inProgress = !!review && review.stage !== 'approved'
  function initiate(type: ReviewType) {
    if (!ready || inProgress) return
    setReviews(old => {
      const created = createReview(`ESG-${String(old.length + 1).padStart(3, '0')}`, type, claim, user)
      return created && (!old.length || old.at(-1)?.stage === 'approved') ? [...old, created] : old
    })
  }
  function act(action: Action, comment: string) {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? transition(r, action, user, comment) : r))
  }
  function save(records: EvidenceRecord[], checks: DisclosureChecks) {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? saveEvidence(r, records, user, checks) : r))
  }
  function edit(patch: DraftPatch) {
    if (!ready) return
    setReviews(old => old.map(r => r.id === review?.id ? saveDraft(r, patch, user) : r))
  }
  function flag() {
    if (!ready || inProgress) return
    setReviews(old => {
      if (old.length && old.at(-1)?.stage !== 'approved') return old
      const created = createReview(`ESG-${String(old.length + 1).padStart(3, '0')}`, 'trigger', claim, user, true)
      return created ? [...old, created] : old
    })
  }
  function reset() {
    setReviews([]); setSelected(null); setTab('dashboard'); setRole('Product Management'); setResetting(false); setStorageError(false)
  }
  function switchRole(next: Role) {
    setRole(next)
    if (next === 'Internal Audit') setTab('history')
  }
  const attention = role === 'Internal Audit' ? 'Independently inspect evidence and management decisions through separate assurance activities.'
    : review && canEditEvidence(review, user) ? 'Prepare supporting evidence and check PDS, website and marketing wording before Product Strategy verification.'
    : review && actionBlocker(review, user) === null ? task(review)
    : review?.stage === 'approved' ? task(review)
    : `Current responsibility: ${owner(review)}. ${task(review)}`
  const metrics = [
    { label: 'Draft', count: reviews.filter(r => r.stage === 'draft').length },
    { label: 'In review', count: reviews.filter(r => !['draft', 'approved'].includes(r.stage)).length },
    { label: 'Open exceptions', count: reviews.filter(r => r.exception === 'open').length },
    { label: 'Approved', count: reviews.filter(r => r.stage === 'approved').length },
  ]

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
          <div className="overflow-x-auto pb-1"><TabsList variant="line"><TabsTrigger value="dashboard"><LayoutDashboard />Dashboard</TabsTrigger><TabsTrigger value="disclosures"><FileText />Disclosures</TabsTrigger><TabsTrigger value="history"><History />Review History</TabsTrigger></TabsList></div>
          <Button size="sm" variant="ghost" disabled={!ready} onClick={() => setResetting(true)}><RotateCcw data-icon="inline-start" />Reset Demo</Button>
        </div>
        {resetting && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border bg-card p-3"><p className="text-sm">Reset disclosure wording and clear all local review history?</p><div className="flex gap-2"><Button variant="outline" onClick={() => setResetting(false)}>Cancel</Button><Button onClick={reset}>Confirm reset</Button></div></div>}
        {storageError && <p role="alert" className="text-sm text-destructive">Local data could not be read or saved. Changes work in this session only. Reset Demo to clear invalid data.</p>}
        <TabsContent value="dashboard" className="min-w-0 pt-4"><div className="flex min-w-0 flex-col gap-4">
          <div><p className="eyebrow">{role === 'Internal Audit' ? 'LOD 3 · Independent assurance' : role === 'Risk / Compliance Team' ? 'LOD 2 · Oversight & monitoring' : 'LOD 1 · Disclosure controls'}</p><h2 className="mt-2 text-2xl font-semibold">{role === 'Risk / Compliance Team' ? 'Disclosure monitoring' : 'Disclosure dashboard'}</h2><p className="mt-1 text-sm text-muted-foreground">{role} · {attention}</p></div>
          <div className="grid grid-cols-2 divide-x divide-y rounded border bg-card sm:grid-cols-4 sm:divide-y-0">{metrics.map(metric => <div key={metric.label} className="px-4 py-3"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-semibold">{metric.count}</p></div>)}</div>
          <section className="panel min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b p-4"><h3 className="font-semibold">Disclosure register</h3><Badge variant="outline">1 disclosure</Badge></div>
            <div className="relative overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-background text-muted-foreground"><tr>{['Disclosure / fund', 'Status', 'Current action owner', ''].map(h => <th key={h} className="px-4 py-3 font-medium">{h || <span className="sr-only">Open record</span>}</th>)}</tr></thead>
              <tbody><tr className="border-t"><td className="min-w-60 px-4 py-4"><p className="font-semibold">ESG screening disclosure</p><p className="mt-1 max-w-md text-muted-foreground">{fund}</p><p className="mt-1 text-muted-foreground">PDS-001 · Newly drafted PDS</p></td><td className="px-4 py-4"><StatusBadge stage={review?.stage} />{review?.exception === 'open' && <p className="mt-1 text-primary">Open exception</p>}</td><td className="px-4 py-4">{owner(review) ?? 'Complete'}</td><td className="px-4 py-4"><Button variant="outline" onClick={() => setTab(role === 'Internal Audit' ? 'history' : 'disclosures')}>{role === 'Internal Audit' ? 'View history' : 'Open disclosure'}<ArrowRight data-icon="inline-end" /></Button></td></tr></tbody>
            </table></div>
          </section>
          {role === 'Risk / Compliance Team' && <section className="panel"><div className="border-b p-4"><h3 className="font-semibold">Exceptions & ongoing monitoring</h3></div><div className="flex flex-col gap-3 p-4">
            {reviews.filter(r => r.exception === 'open').map(r => <div className="flex flex-wrap items-center gap-2 border-b pb-3 text-sm" key={r.id}><strong>{r.id}</strong><StatusBadge stage={r.stage} /><span>{task(r)}</span></div>)}
            {!reviews.some(r => r.exception === 'open') && <p className="text-sm text-muted-foreground">No unresolved exceptions recorded.</p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm text-muted-foreground">Flag a simulated screening concern to request a Trigger-Event Review from Product Management.</p><Button disabled={!ready || inProgress} onClick={flag}>Flag new screening concern</Button></div>
            {inProgress && <p className="text-sm text-muted-foreground">An active assessment already exists for this disclosure.</p>}
          </div></section>}
          {role === 'Internal Audit' && <section className="panel p-4"><h3 className="font-semibold">Separate assurance activities</h3><p className="mt-2 text-sm text-muted-foreground">Internal Audit independently examines evidence and management decisions. It does not verify, endorse or approve assessments in the management approval chain.</p><Button className="mt-3" variant="outline" onClick={() => setTab('history')}>Inspect decision history</Button></section>}
        </div></TabsContent>
        <TabsContent value="disclosures" className="min-w-0 pt-4"><DisclosureReview key={`${review?.id}-${review?.stage}-${user.id}`} review={review} claim={claim} user={user} initiate={initiate} act={act} ready={ready} save={save} edit={edit} /></TabsContent>
        <TabsContent value="history" className="min-w-0 pt-4"><ReviewHistory reviews={reviews} selected={selected} select={setSelected} /></TabsContent>
      </Tabs>
      <footer className="mt-6 flex flex-wrap justify-between gap-2 border-t py-4 text-sm text-muted-foreground"><span>Simulated role actions · Deterministic checks · No authentication</span><span>{ready ? 'Demo data stored in this browser only' : 'Loading local demo…'}</span></footer>
    </main>
  </div>
}
