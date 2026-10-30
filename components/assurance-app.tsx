"use client"
import { useEffect, useState } from 'react'
import { ShieldCheck, RotateCcw, ClipboardCheck, History, BookOpen, Users, Scale, Eye, HardDrive, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DisclosureReview } from '@/components/disclosure-review'
import { ReviewHistory } from '@/components/review-history'
import { createReview, transition, type Review, type ReviewType, type Claim, type Action } from '@/lib/review'
const KEY = 'esg-assurance-demo-v1'
export function AssuranceApp() {
 const [reviews, setReviews] = useState<Review[]>([])
 const [active, setActive] = useState<string | null>(null)
 const [tab, setTab] = useState('review')
 const [type, setType] = useState<ReviewType>('routine')
 const [example, setExample] = useState<Claim>('all')
 const [target, setTarget] = useState<Review['target']>('proposed')
 const [ready, setReady] = useState(false)
 const [storageError, setStorageError] = useState(false)
 const [resetting, setResetting] = useState(false)
 useEffect(() => {
   try { const raw = localStorage.getItem(KEY); if (raw) { const data = JSON.parse(raw); if (data.version !== 1 || !Array.isArray(data.reviews) || !data.reviews.every((r: Review) => typeof r.id === 'string' && Array.isArray(r.events) && ['all','qualified'].includes(r.claim))) throw new Error('Invalid demo data'); setReviews(data.reviews); setActive(data.active ?? null) } } catch { setStorageError(true) }
   setReady(true)
 }, [])
 useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify({ version: 1, reviews, active })) } catch { setStorageError(true) } } }, [reviews, active, ready])
 const review = reviews.find(r => r.id === active)
 function initiate() { const id = `ESG-${String(reviews.length + 1).padStart(3, '0')}`; setReviews(old => [...old, createReview(id, type, target, example)]); setActive(id) }
 function act(action: Action) { setReviews(old => old.map(r => r.id === active ? transition(r, action) : r)) }
 function trigger() { setActive(null); setType('trigger'); setTarget('existing'); setExample('all'); setTab('review') }
 function reset() { setReviews([]); setActive(null); setTab('review'); setType('routine'); setExample('all'); setTarget('proposed'); setResetting(false); setStorageError(false) }
 return <div className="min-h-screen"><header className="border-t-4 border-t-primary border-b bg-card"><div className="border-b bg-background"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-2 lg:px-10"><span className="text-sm text-muted-foreground">Vanguard Australia · Governance, Risk & Compliance</span><span className="text-sm text-muted-foreground">Academic prototype — not an official Vanguard system</span></div></div><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-5 px-6 py-5 lg:px-10"><span className="font-serif text-3xl font-bold tracking-tight text-primary" aria-label="Vanguard">Vanguard</span><div className="border-l pl-5"><h1 className="text-balance text-lg font-semibold tracking-tight md:text-xl">ESG Disclosure Assurance System</h1><p className="mt-1 text-sm text-muted-foreground">Internal disclosure review & oversight</p></div></div></header>
 <main className="mx-auto max-w-7xl px-6 py-5 lg:px-10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Disclosure control workspace</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Verify disclosure claims, resolve exceptions and retain evidence of review.</p></div><Button variant="outline" onClick={() => setResetting(true)} disabled={!ready}><RotateCcw data-icon="inline-start" />Reset Demo</Button></div>
 {resetting && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4"><p className="text-sm">Clear all locally saved reviews and decision history?</p><div className="flex gap-2"><Button variant="outline" onClick={() => setResetting(false)}>Cancel</Button><Button onClick={reset}>Confirm reset</Button></div></div>}
 {storageError && <p role="alert" className="mt-4 text-sm text-destructive">Browser storage could not be read or saved. This session still works, but persistence is not guaranteed. Reset Demo to clear invalid demo data.</p>}
 <Tabs value={tab} onValueChange={value => setTab(String(value))} className="main-tabs mt-3"><div className="overflow-x-auto border-b pb-1"><TabsList variant="line"><TabsTrigger value="review"><ClipboardCheck />Disclosure Review</TabsTrigger><TabsTrigger value="history"><History />Monitoring & Review History</TabsTrigger></TabsList></div>
 <TabsContent value="review"><div className="grid items-start gap-5 pt-4 lg:grid-cols-[minmax(0,1fr)_280px]"><DisclosureReview review={review} type={type} setType={setType} example={example} setExample={setExample} target={target} setTarget={setTarget} initiate={initiate} act={act} ready={ready} newReview={() => setActive(null)} /><aside className="flex flex-col gap-5"><section className="panel p-5"><div className="flex items-center gap-2 text-primary"><BookOpen className="size-4" /><h2 className="text-sm font-semibold">The case behind the controls</h2></div><h3 className="mt-4 text-lg font-semibold">Vanguard Australia</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ethically Conscious Global Aggregate Bond Index Fund</p><div className="my-5 border-t" /><p className="text-sm leading-relaxed text-muted-foreground">Misleading representations overstated the extent of ESG screening. By February 2021, approximately <strong className="font-semibold text-foreground">74% of securities by market value</strong> had not been researched or screened.</p><p className="mt-4 text-sm leading-relaxed text-muted-foreground">This prototype tests whether disclosure wording is supported by that evidence—not whether a fund is ethical.</p><a href="https://asic.gov.au/about-asic/news-centre/find-a-media-release/2024-releases/24-213mr-asic-s-vanguard-greenwashing-action-results-in-record-12-9-million-penalty/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">ASIC case background <ArrowUpRight className="size-4" /></a></section>
 <section className="panel p-5"><h2 className="eyebrow">Three lines of accountability</h2><div className="mt-5 flex flex-col gap-5">{[{ icon: Users, title: 'First line', role: 'Product Management, Disclosure Team & Product Strategy', detail: 'Initiate, coordinate, verify and correct.' }, { icon: Scale, title: 'Second line', role: 'Risk/Compliance', detail: 'Assess material discrepancies and monitor disclosures.' }, { icon: Eye, title: 'Third line', role: 'Internal Audit', detail: 'Independently evaluate control evidence. No approval role.' }].map(item => <div className="flex items-start gap-3" key={item.title}><item.icon className="mt-1 size-4 shrink-0 text-primary" /><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-relaxed">{item.role}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.detail}</p></div></div>)}</div></section>
 <div className="flex items-start gap-2 px-1 text-sm leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>Deterministic checks. Human accountability. No AI or external data processing.</p></div></aside></div></TabsContent>
 <TabsContent value="history" className="pt-4"><ReviewHistory reviews={reviews} selected={active} select={setActive} resume={id => { setActive(id); setTab('review') }} trigger={trigger} /></TabsContent>
 </Tabs>
 <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t py-4 text-sm text-muted-foreground"><span>NUS academic proof of concept · Not legal or investment advice</span><span className="flex items-center gap-2"><HardDrive className="size-4" />{ready ? 'Demo data stored in this browser only' : 'Loading local demo…'}</span></footer>
 </main></div>
}
