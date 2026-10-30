"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { illustrativeEvidence, validateEvidence, type EvidenceRecord } from '@/lib/evidence'

export function EvidenceEditor({ records, editable, save }: { records: EvidenceRecord[]; editable: boolean; save: (records: EvidenceRecord[]) => void }) {
 const initial = records.length === 2 ? records : illustrativeEvidence()
 const [bond, setBond] = useState(initial.find(r => r.source === 'Bloomberg')!)
 const [research, setResearch] = useState(initial.find(r => r.source === 'MSCI')!)
 const [message, setMessage] = useState('')
 const saved = records.length > 0

 function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!editable) return
  const next = [{ ...bond, security: bond.security.trim().toUpperCase() }, { ...research, security: research.security.trim().toUpperCase() }]
  const error = validateEvidence(next)
  if (error) { setMessage(error); return }
  save(next)
  setMessage('Evidence records saved. Fresh verification is required.')
 }

 const field = 'rounded border bg-card p-2 text-sm disabled:opacity-70'
 return <section className="border-t p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Supporting evidence</h3><span className="text-sm text-muted-foreground">{saved ? 'Records saved' : 'Not yet confirmed'}</span></div>
  <p className="mt-2 text-sm text-muted-foreground">Illustrative records only, not real Bloomberg or MSCI data. The Disclosure Team enters or confirms both records.</p>
  <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">Bloomberg · index constituent ({bond.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={bond.security} onChange={e => setBond({ ...bond, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Security name<input required maxLength={120} className={field} value={bond.name} onChange={e => setBond({ ...bond, name: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Fund inclusion<select className={field} value={String(bond.included)} onChange={e => setBond({ ...bond, included: e.target.value === 'true' })}><option value="true">Included</option><option value="false">Not included</option></select></label>
    </div>
   </fieldset>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">MSCI · ESG screening record ({research.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={research.security} onChange={e => setResearch({ ...research, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Research available<select className={field} value={String(research.researchAvailable)} onChange={e => setResearch({ ...research, researchAvailable: e.target.value === 'true' })}><option value="false">No research available</option><option value="true">Research available</option></select></label>
     <label className="flex flex-col gap-1 text-sm">Screening status<select className={field} value={research.result} onChange={e => setResearch({ ...research, result: e.target.value as EvidenceRecord['result'] })}><option value="unscreened">Not screened</option><option value="screened">Screened</option></select></label>
    </div>
   </fieldset>
   {editable && <div className="flex flex-wrap items-center gap-2"><Button size="sm" type="submit">{saved ? 'Save changes' : 'Confirm evidence records'}</Button></div>}
   {message && <p role="status" className="text-sm">{message}</p>}
  </form>
 </section>
}
