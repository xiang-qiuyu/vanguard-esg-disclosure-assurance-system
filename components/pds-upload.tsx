"use client"

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, FileText, Upload, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readPds, type PdsFile } from '@/lib/pds'

export function PdsUpload({ pds, editable, upload, remove, onBusyChange }: {
  pds?: PdsFile; editable: boolean; upload: (file: File) => Promise<void>; remove: () => void; onBusyChange: (busy: boolean) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadFirst = editable && !pds
  useEffect(() => {
    let cancelled = false, objectUrl = ''
    setUrl(''); setFileError('')
    if (pds) readPds(pds.id).then(blob => {
      if (cancelled) return
      if (!blob) { setFileError('This PDS file is unavailable in this browser. Product Management must re-upload it in Draft.'); return }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(() => { if (!cancelled) setFileError('The PDS file could not be read from browser storage.') })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [pds?.id])

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, file = input.files?.[0]
    if (!editable || !file) return
    setBusy(true); onBusyChange(true); setError('')
    try { await upload(file) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The PDS upload failed. Please try again.') }
    finally { setBusy(false); onBusyChange(false); input.value = '' }
  }

  return <section id="supporting-pds-upload" className={`flex scroll-mt-6 flex-col gap-3 border-t p-4 ${uploadFirst ? 'border-l-4 border-l-primary bg-primary/5 sm:p-5' : ''}`}>
    {uploadFirst ? <>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Start here &middot; Product Management</p>
      <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Upload className="size-5" aria-hidden="true" /></span><div><h3 className="text-lg font-semibold">Upload the PDS</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Upload the Product Disclosure Statement (PDS) PDF first. Its example disclosure wording will appear below. Then upload the supporting evidence separately before sending the Draft to Product Strategy.</p></div></div>
    </> : <h3 className="flex items-center gap-2 font-semibold"><FileText className="size-4" />Supporting PDS file</h3>}
    {pds ? <div className="flex flex-wrap items-start justify-between gap-3 rounded border bg-background p-3">
      <div className="min-w-0 text-sm"><p className="break-all font-medium">{pds.name}</p><p className="mt-1 text-muted-foreground">{(pds.size / 1024).toFixed(1)} KB · Uploaded by Product Management · {new Date(pds.uploadedAt).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore' })}</p></div>
      {url && <div className="flex flex-wrap gap-3 text-sm font-medium text-primary"><a className="inline-flex items-center gap-1 underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Open PDS</a><a className="inline-flex items-center gap-1 underline underline-offset-4" href={url} download={pds.name}><Download className="size-4" />Download PDS</a></div>}
    </div> : !editable && <p className="text-sm text-muted-foreground">No PDS uploaded. Product Management attaches the supporting PDF before sending the Draft for review.</p>}
    {editable && <>
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" disabled={busy} onChange={choose} hidden aria-label="Supporting PDS PDF" />
      <Button type="button" variant={uploadFirst ? 'default' : 'outline'} size="lg" className="h-auto min-h-11 whitespace-normal px-4 py-3 sm:self-start" disabled={busy} onClick={() => inputRef.current?.click()}><Upload />{busy ? 'Uploading PDS...' : pds ? 'Replace PDS (PDF)' : 'Upload PDS (PDF)'}</Button>
      <p className="text-xs text-muted-foreground">PDF only, up to 10 MB. This prototype uses the supplied example wording to simulate extraction.</p>
      {pds && !fileError && <p role="status" className="flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>PDS uploaded. Next, upload the supporting evidence below, set the target completion date, add submission comments and send to Product Strategy.</span></p>}
      {pds && <Button size="sm" variant="outline" className="self-start" disabled={busy} onClick={remove}>Remove PDS</Button>}
    </>}
    {busy && <p role="status" className="text-sm">Uploading PDS and simulating disclosure extraction…</p>}
    {(error || fileError) && <p role="alert" className="text-sm text-destructive">{error || fileError}</p>}
  </section>
}
