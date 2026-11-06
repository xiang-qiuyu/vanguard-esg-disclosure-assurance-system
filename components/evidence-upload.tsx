"use client"

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { evidenceFileAccept, type EvidenceFile } from '@/lib/evidence-file'
import { readPds } from '@/lib/pds'
import { getUser } from '@/lib/review'

export function EvidenceUpload({ file, editable, upload, onBusyChange }: {
  file?: EvidenceFile; editable: boolean; upload: (file: File) => Promise<void>; onBusyChange: (busy: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [url, setUrl] = useState('')
  const [fileError, setFileError] = useState('')
  useEffect(() => {
    let cancelled = false, objectUrl = ''
    setUrl(''); setFileError('')
    if (file) readPds(file.id).then(blob => {
      if (cancelled) return
      if (!blob) { setFileError('This evidence file is unavailable in this browser. Product Management can re-upload it in Draft, or Product Strategy during verification.'); return }
      objectUrl = URL.createObjectURL(blob); setUrl(objectUrl)
    }).catch(() => { if (!cancelled) setFileError('The evidence file could not be read from browser storage.') })
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [file?.id])
  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget, chosen = input.files?.[0]
    if (!editable || !chosen) return
    setBusy(true); onBusyChange(true); setError('')
    try { await upload(chosen) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Evidence upload failed. Please try again.') }
    finally { setBusy(false); onBusyChange(false); input.value = '' }
  }
  return <div className="mt-3 flex flex-col gap-2 rounded border bg-background p-3">
    {editable && <><label className="flex flex-col gap-2 text-sm font-medium">{file ? 'Replace supporting evidence file' : 'Upload supporting evidence file'}<input type="file" accept={evidenceFileAccept} disabled={busy} onChange={choose} className="w-full min-w-0 rounded border bg-card p-2 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground" /></label><p className="text-xs text-muted-foreground">PDF, CSV, Excel or text, up to 10 MB. Uploading simulates populating the Bloomberg and MSCI fields; review and edit the examples before verification.</p></>}
    {file ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><div className="min-w-0"><p className="break-all font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB &middot; Uploaded by {getUser(file.uploadedBy)?.role ?? 'Product team'}</p></div>{url && <a download={file.name} href={url} className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"><Download className="size-4" />Download evidence</a>}</div>
      : <p className="text-sm text-muted-foreground">No supporting evidence file uploaded. Product Management uploads this separately from the PDS before sending the Draft to Product Strategy.</p>}
    {busy && <p role="status" className="text-sm">Uploading evidence and populating example fields...</p>}
    {(error || fileError) && <p role="alert" className="text-sm text-destructive">{error || fileError}</p>}
  </div>
}
