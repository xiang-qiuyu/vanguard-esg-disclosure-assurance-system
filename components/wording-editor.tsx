"use client"

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WordingEditor({ wording, source, editable, save, onDirtyChange }: {
  wording: string; source: string; editable: boolean; save: (text: string) => void; onDirtyChange: (dirty: boolean) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(wording)
  function close() { setEditing(false); onDirtyChange(false) }
  return <div className="p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Current disclosure wording</h3>
      {editable && !editing && <Button type="button" size="sm" variant="outline" onClick={() => { setText(wording); setEditing(true); onDirtyChange(true) }}><Pencil />Edit wording</Button>}
    </div>
    {editing && editable ? <div className="mt-3 flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm font-medium">Disclosure wording<textarea autoFocus required maxLength={10000} className="min-h-52 w-full rounded border bg-card p-3 text-sm font-normal leading-relaxed" value={text} onChange={event => setText(event.target.value)} /></label>
      <p className="text-xs text-muted-foreground">Save your changes before continuing. A fresh verification run is required after wording changes.</p>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={!text.trim()} onClick={() => { save(text); close() }}>Save wording</Button><Button type="button" size="sm" variant="outline" onClick={close}>Cancel</Button></div>
    </div> : <blockquote className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed">&ldquo;{wording}&rdquo;</blockquote>}
    <p className="mt-2 break-words text-xs text-muted-foreground">Initially populated by simulated extraction from {source}. Product Management and Product Strategy may update this wording at their respective stages.</p>
  </div>
}
