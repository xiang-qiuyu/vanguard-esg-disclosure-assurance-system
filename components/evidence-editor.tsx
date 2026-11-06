"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { validateEvidence, type EvidenceRecord } from '@/lib/evidence'
import { EvidenceUpload } from '@/components/evidence-upload'
import { type EvidenceFile } from '@/lib/evidence-file'
import { evidencePermissions, type Role } from '@/lib/review'

export function EvidenceEditor({ records, evidenceFile, role, editable, save, upload, onBusyChange, onDirtyChange }: { records: EvidenceRecord[]; evidenceFile?: EvidenceFile; role: Role; upload: (file: File) => Promise<void>; onBusyChange: (busy: boolean) => void; editable: boolean; save: (records: EvidenceRecord[]) => void; onDirtyChange: (dirty: boolean) => void }) {
 const populated = records.length === 2
 const initial: EvidenceRecord[] = [{ id: 'BBG-001', source: 'Bloomberg', security: '', name: '', included: true, researchAvailable: false, result: 'unscreened', note: '' }, { id: 'MSCI-001', source: 'MSCI', security: '', name: '', included: true, researchAvailable: false, result: 'unscreened', note: '' }]
 const [bond, setBond] = useState(records.find(r => r.source === 'Bloomberg') ?? initial[0])
 const [research, setResearch] = useState(records.find(r => r.source === 'MSCI') ?? initial[1])
 const [message, setMessage] = useState('')
 const baseline = JSON.stringify(!records.length ? initial : records)
 const dirty = populated && editable && (JSON.stringify([bond, research]) !== baseline)
 useEffect(() => {
  onDirtyChange(dirty)
 }, [dirty, onDirtyChange])

 function submit(e: React.FormEvent) {
  e.preventDefault()
  if (!editable || !populated) return
  const next = [{ ...bond, security: bond.security.trim().toUpperCase() }, { ...research, security: research.security.trim().toUpperCase() }]
  const error = validateEvidence(next)
  if (error) { setMessage(error); return }
  save(next)
  setBond(next[0]); setResearch(next[1])
  setMessage(role === 'Product Management' ? 'Supporting evidence saved. Send the Draft to Product Strategy for verification when ready.' : 'Supporting evidence saved. Run Verification again before selecting Approve.')
 }

 const field = 'rounded border bg-card p-2 text-sm disabled:opacity-70'
 return <section className="border-t p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Supporting evidence</h3><span className="text-sm text-muted-foreground">{!populated ? 'Awaiting evidence upload' : dirty ? 'Unsaved changes' : 'Evidence saved'}</span></div>
  {!populated && <p className="mt-2 text-sm text-muted-foreground">Empty Bloomberg example. Product Management uploads supporting evidence separately to populate the Bloomberg and MSCI records. Both product teams can edit the records at their respective stages.</p>}
  <p className="mt-2 text-sm text-muted-foreground">Illustrative records only, not real Bloomberg{populated ? ' or MSCI' : ''} data. {evidencePermissions[role]}</p>
  {populated && <p className="mt-2 text-xs text-muted-foreground">For this fixed example, research availability and screening status can be edited, but only changing the disclosure wording from &ldquo;All&rdquo; to &ldquo;Some&rdquo; can clear verification.</p>}
  <EvidenceUpload file={evidenceFile} editable={editable} upload={upload} onBusyChange={onBusyChange} />
  <form className="mt-3 flex flex-col gap-3" onSubmit={submit}>
   <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable || !populated}>
    <legend className="px-1 text-sm font-semibold">Bloomberg · index constituent {populated ? `(${bond.id})` : ''}</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={populated ? bond.security : ''} onChange={e => setBond({ ...bond, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Security name<input required maxLength={120} className={field} value={populated ? bond.name : ''} onChange={e => setBond({ ...bond, name: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Fund inclusion<select className={field} value={populated ? String(bond.included) : ''} onChange={e => setBond({ ...bond, included: e.target.value === 'true' })}><option value="" disabled></option><option value="true">Included</option><option value="false">Not included</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={populated ? bond.note : ''} onChange={e => setBond({ ...bond, note: e.target.value })} /></label>
    </div>
   </fieldset>
   {populated && <fieldset className="flex flex-col gap-3 rounded border bg-background p-3" disabled={!editable}>
    <legend className="px-1 text-sm font-semibold">MSCI · ESG screening record ({research.id})</legend>
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="flex flex-col gap-1 text-sm">Security ID<input required maxLength={40} className={field} value={populated ? research.security : ''} onChange={e => setResearch({ ...research, security: e.target.value })} /></label>
     <label className="flex flex-col gap-1 text-sm">Research available<select className={field} value={populated ? String(research.researchAvailable) : ''} onChange={e => setResearch({ ...research, researchAvailable: e.target.value === 'true' })}><option value="" disabled></option><option value="false">No research available</option><option value="true">Research available</option></select></label>
     <label className="flex flex-col gap-1 text-sm">Screening status<select className={field} value={populated ? research.result : ''} onChange={e => setResearch({ ...research, result: e.target.value as EvidenceRecord['result'] })}><option value="" disabled></option><option value="unscreened">Not screened</option><option value="screened">Screened</option></select></label>
     <label className="flex flex-col gap-1 text-sm sm:col-span-2">Source note (required)<textarea required className={field} value={populated ? research.note : ''} onChange={e => setResearch({ ...research, note: e.target.value })} /></label>
    </div>
   </fieldset>}
   {populated && editable && <div className="flex flex-wrap items-center gap-2"><Button size="sm" type="submit">Save supporting evidence</Button></div>}
   {message && <p role="status" className="text-sm">{message}</p>}
  </form>
 </section>
}
