"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { illustrativeEvidence, validateEvidence, type EvidenceRecord } from '@/lib/evidence'
import { evidencePermissions, type Role } from '@/lib/review'

export function EvidenceEditor({ records, preparedRecords, role, pdsUploaded, editable, save, onDirtyChange }: { records: EvidenceRecord[]; preparedRecords?: EvidenceRecord[]; role: Role; pdsUploaded: boolean; editable: boolean; save: (records: EvidenceRecord[]) => void; onDirtyChange: (dirty: boolean) => void }) {
 const initial = preparedRecords?.length === 2 ? preparedRecords : illustrativeEvidence()
 const [bond, setBond] = useState(records.find(r => r.source === 'Bloomberg') ?? initial[0])
 const [research, setResearch] = useState(records.find(r => r.source === 'MSCI') ?? initial[1])
 const [message, setMessage] = useState('')
 const baseline = JSON.stringify(!records.length ? initial : records)
 const dirty = pdsUploaded && editable && (JSON.stringify([bond, research]) !== baseline)
 useEffect(() => {
  onDirtyChange(dirty)
 }, [dirty, onDirtyChange])

 function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!editable || !pdsUploaded) return
  const next = [{ ...bond, security: bond.security.trim().toUpperCase() }, { ...research, security: research.security.trim().toUpperCase() }]
  const error = validateEvidence(next)
  if (error) { setMessage(error); return }
  save(next)
  setBond(next[0]); setResearch(next[1])
  setMessage('Supporting evidence saved. Run Verification again before selecting Approve.')
 }

 const field = 'rounded border bg-card p-2 text-sm disabled:opacity-70'
 return <section className="border-t p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Supporting evidence</h3><span className="text-sm text-muted-foreground">{!pdsUploaded ? 'Awaiting PDS upload' : dirty ? 'Unsaved changes' : records.length ? 'Evidence saved' : 'Illustrative records prepared'}</span></div>
  {!pdsUploaded && <p className="mt-2 text-sm text-muted-foreground">Empty Bloomberg example. Upload the supporting PDS to populate the Bloomberg and MSCI records.</p>}
  <p className="mt-2 text-sm text-muted-foreground">Illustrative records only, not real Bloomberg{pdsUploaded ? ' or MSCI' : ''} data. {evidencePermissions[role]}</p>
  <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable || !pdsUploaded}>
    <legend className="px-1 text-sm font-semibold">Bloomberg · index constituent {pdsUploaded ? `(${bond.id})` : ''}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={pdsUploaded ? bond.security : ''} onChange={e => setBond({ ...bond, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Security name<input required maxLength={120} className={field} value={pdsUploaded ? bond.name : ''} onChange={e => setBond({ ...bond, name: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Fund inclusion<select className={field} value={pdsUploaded ? String(bond.included) : ''} onChange={e => setBond({ ...bond, included: e.target.value === 'true' })}><option value="" disabled></option><option value="true">Included</option><option value="false">Not included</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={pdsUploaded ? bond.note : ''} onChange={e => setBond({ ...bond, note: e.target.value })} /></label>
    </div>
   </fieldset>
   {pdsUploaded && <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">MSCI · ESG screening record ({research.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={pdsUploaded ? research.security : ''} onChange={e => setResearch({ ...research, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Research available<select className={field} value={pdsUploaded ? String(research.researchAvailable) : ''} onChange={e => setResearch({ ...research, researchAvailable: e.target.value === 'true' })}><option value="" disabled></option><option value="false">No research available</option><option value="true">Research available</option></select></label>
     <label className="flex flex-col gap-1 text-sm">Screening status<select className={field} value={pdsUploaded ? research.result : ''} onChange={e => setResearch({ ...research, result: e.target.value as EvidenceRecord['result'] })}><option value="" disabled></option><option value="unscreened">Not screened</option><option value="screened">Screened</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={pdsUploaded ? research.note : ''} onChange={e => setResearch({ ...research, note: e.target.value })} /></label>
    </div>
   </fieldset>}
   {pdsUploaded && editable && <div className="flex flex-wrap items-center gap-2"><Button size="sm" type="submit">Save supporting evidence</Button></div>}
   {message && <p role="status" className="text-sm">{message}</p>}
  </form>
 </section>
}
