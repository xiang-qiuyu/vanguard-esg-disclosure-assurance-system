"use client"

import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { claims, owner, type Review } from '@/lib/review'
import { CheckResults } from '@/components/check-results'

export function ReviewHistory({ reviews, selected, select }: { reviews: Review[]; selected: string | null; select: (id: string) => void }) {
  const current = reviews.find(r => r.id === selected) ?? reviews.at(-1)
  return <div className="flex min-w-0 flex-col gap-4">
    <div><h2 className="text-xl font-semibold">Review History</h2><p className="mt-1 text-sm text-muted-foreground">Read-only evidence of first- and second-line decisions, available for independent Internal Audit assurance. All role actions are simulated.</p></div>
    <section className="panel overflow-hidden">
      <div className="border-b p-4"><h3 className="font-semibold">Assessment register</h3></div>
      {reviews.length ? <div className="relative overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-background"><tr>{['Assessment', 'Status', 'Current action owner'].map(h => <th className="px-4 py-3 font-medium" key={h}>{h}</th>)}</tr></thead>
        <tbody>{reviews.map(r => <tr key={r.id} className="border-t">
          <td className="px-4 py-3"><button className="font-medium text-primary underline underline-offset-4" onClick={() => select(r.id)} aria-label={`View history ${r.id}`}>{r.id}</button><p className="mt-1 text-muted-foreground">{r.type === 'routine' ? 'Routine' : 'Trigger-event'} · PDS-001</p></td>
          <td className="px-4 py-3"><StatusBadge stage={r.stage} />{r.exception && <p className="mt-1 text-muted-foreground">Exception {r.exception}</p>}</td>
          <td className="px-4 py-3">{owner(r) ?? 'Complete'}</td>
        </tr>)}</tbody>
      </table></div> : <p className="p-5 text-sm text-muted-foreground">No assessments recorded. Product Management can create a Draft from Disclosures.</p>}
    </section>
    {current && <section className="panel">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><h3 className="font-semibold">Decision history · {current.id}</h3><Badge variant="outline">Read only</Badge></header>
      <ol className="divide-y px-4">{current.events.map((event, i) => <li key={i} className="grid gap-2 py-4 sm:grid-cols-[150px_1fr]">
        <div className="text-sm text-muted-foreground"><p>{new Date(event.at).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Singapore' })}</p><p>Event {i + 1} · SGT</p></div>
        <div><p className="text-sm font-semibold">{event.role}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{event.text}</p>
          {event.comment && <div className="mt-3 rounded border bg-background p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision comment</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{event.comment}</p></div>}
          {event.snapshot?.disclosureChecks && <dl className="mt-3 space-y-2 rounded border bg-background p-3 text-sm">{([{ key: 'pds', label: 'Product Disclosure Statement Check' }, { key: 'website', label: 'Website check' }, { key: 'marketing', label: 'Marketing material check' }] as const).map(({ key, label }) => <div key={key}><dt className="font-medium">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.snapshot!.disclosureChecks![key]}</dd></div>)}</dl>}
          {event.snapshot && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Assessment snapshot</summary><div className="mt-2 rounded border p-3"><p className="font-medium">{event.snapshot.type === 'routine' ? 'Routine' : 'Trigger-event'}</p><blockquote className="mt-2">{claims[event.snapshot.claim]}</blockquote></div></details>}
          {event.report && <div className="mt-3 border p-3"><CheckResults report={event.report} /></div>}
          {(event.evidence || event.snapshot?.evidence) && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Saved evidence snapshot · {(event.evidence ?? event.snapshot!.evidence).length} records</summary><div className="mt-2 flex flex-col gap-2">{(event.evidence ?? event.snapshot!.evidence).map(record => <div className="border p-2" key={record.id}><p className="font-medium">{record.id} · {record.source} · {record.security}</p><p>{record.source === 'Bloomberg' ? `${record.name} · ${record.included ? 'Included' : 'Not included'}` : `${record.researchAvailable ? 'Research available' : 'No research available'} · ${record.result === 'unscreened' ? 'Not screened' : 'Screened'}`}</p><p className="text-muted-foreground">{record.note}</p></div>)}</div></details>}
        </div>
      </li>)}</ol>
    </section>}
    <p className="text-sm leading-relaxed text-muted-foreground">Internal Audit provides separate assurance and does not approve assessments or participate in management decisions. Browser-local records are demonstration evidence only and are not tamper-proof audit records.</p>
  </div>
}
