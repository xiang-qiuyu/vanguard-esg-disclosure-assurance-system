"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { illustrativeEvidence, validateEvidence, type EvidenceRecord } from '@/lib/evidence'
import { type DisclosureChecks } from '@/lib/review'

export function EvidenceEditor({ records, preparedRecords, checks, editable, confirmed, save, onDirtyChange }: { records: EvidenceRecord[]; preparedRecords?: EvidenceRecord[]; checks?: DisclosureChecks; editable: boolean; confirmed: boolean; save: (records: EvidenceRecord[], checks: DisclosureChecks) => void; onDirtyChange: (dirty: boolean) => void }) {
 const initial = preparedRecords?.length === 2 ? preparedRecords : illustrativeEvidence()
 const [bond, setBond] = useState(records.find(r => r.source === 'Bloomberg') ?? initial[0])
 const [research, setResearch] = useState(records.find(r => r.source === 'MSCI') ?? initial[1])
 const [message, setMessage] = useState('')
 const [wordingChecks, setWordingChecks] = useState<DisclosureChecks>(checks ?? { pds: '', website: '', marketing: '' })
 useEffect(() => {
  onDirtyChange(editable && (JSON.stringify([bond, research]) !== JSON.stringify(records) || JSON.stringify(wordingChecks) !== JSON.stringify(checks ?? { pds: '', website: '', marketing: '' })))
 }, [bond, research, records, wordingChecks, checks, editable, onDirtyChange])

 function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!editable) return
  const next = [{ ...bond, security: bond.security.trim().toUpperCase() }, { ...research, security: research.security.trim().toUpperCase() }]
  const error = validateEvidence(next)
  if (error) { setMessage(error); return }
  if (!wordingChecks.pds.trim() || !wordingChecks.website.trim() || !wordingChecks.marketing.trim()) { setMessage('Record the PDS, website and marketing wording consistency checks.'); return }
  save(next, { ...wordingChecks })
  setMessage('Supporting evidence and wording checks saved. Accept to send the assessment to Product Strategy for verification, or Reject with a comment.')
 }

 const field = 'rounded border bg-card p-2 text-sm disabled:opacity-70'
 return <section className="border-t p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Supporting evidence</h3><span className="text-sm text-muted-foreground">{confirmed ? 'Records confirmed' : 'Not yet confirmed'}</span></div>
  <p className="mt-2 text-sm text-muted-foreground">Illustrative records only, not real Bloomberg or MSCI data. The Disclosure Team enters or confirms both records and checks wording consistency across the PDS, website and marketing material before Product Strategy verification.</p>
  <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">Bloomberg · index constituent ({bond.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={bond.security} onChange={e => setBond({ ...bond, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Security name<input required maxLength={120} className={field} value={bond.name} onChange={e => setBond({ ...bond, name: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Fund inclusion<select className={field} value={String(bond.included)} onChange={e => setBond({ ...bond, included: e.target.value === 'true' })}><option value="true">Included</option><option value="false">Not included</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={bond.note} onChange={e => setBond({ ...bond, note: e.target.value })} /></label>
    </div>
   </fieldset>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">MSCI · ESG screening record ({research.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={research.security} onChange={e => setResearch({ ...research, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Research available<select className={field} value={String(research.researchAvailable)} onChange={e => setResearch({ ...research, researchAvailable: e.target.value === 'true' })}><option value="false">No research available</option><option value="true">Research available</option></select></label>
     <label className="flex flex-col gap-1 text-sm">Screening status<select className={field} value={research.result} onChange={e => setResearch({ ...research, result: e.target.value as EvidenceRecord['result'] })}><option value="unscreened">Not screened</option><option value="screened">Screened</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={research.note} onChange={e => setResearch({ ...research, note: e.target.value })} /></label>
    </div>
   </fieldset>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">Disclosure Team Check</legend>
    <p className="text-sm text-muted-foreground">Record how the proposed disclosures consistently describe screening methodology, issuer coverage, exclusions and limitations. Product Strategy verifies these against the prepared evidence next. These are simulated review notes for this prototype.</p>
    {([{ key: 'pds', label: 'Product Disclosure Statement Check' }, { key: 'website', label: 'Website check' }, { key: 'marketing', label: 'Marketing material check' }] as const).map(({ key, label }) => <label key={key} className="flex flex-col gap-1 text-sm">{label} (required)<textarea required className={field} value={wordingChecks[key]} onChange={e => setWordingChecks({ ...wordingChecks, [key]: e.target.value })} placeholder="Record proposed wording consistency with the prepared evidence and other materials" /></label>)}
   </fieldset>
   {editable && <div className="flex flex-wrap items-center gap-2"><Button size="sm" type="submit">{confirmed ? 'Save changes' : 'Confirm supporting evidence'}</Button></div>}
   {message && <p role="status" className="text-sm">{message}</p>}
  </form>
 </section>
}
