import { storeFileBlob } from './pds'

export const evidenceFileAccept = '.pdf,.csv,.xlsx,.xls,.txt'
export const maxEvidenceBytes = 10 * 1024 * 1024
export type EvidenceFile = { id: string; name: string; size: number; type: string; uploadedAt: string; uploadedBy: string }

export function validEvidenceFile(value: unknown): value is EvidenceFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Record<string, unknown>
  return typeof file.id === 'string' && !!file.id.trim()
    && typeof file.name === 'string' && /\.(pdf|csv|xlsx|xls|txt)$/i.test(file.name)
    && typeof file.size === 'number' && file.size > 0 && file.size <= maxEvidenceBytes
    && typeof file.type === 'string' && typeof file.uploadedBy === 'string'
    && typeof file.uploadedAt === 'string' && !Number.isNaN(Date.parse(file.uploadedAt))
}

export async function storeEvidenceFile(file: File, uploadedBy: string): Promise<EvidenceFile> {
  if (!/\.(pdf|csv|xlsx|xls|txt)$/i.test(file.name)) throw new Error('Choose a PDF, CSV, Excel or text evidence file.')
  if (!file.size || file.size > maxEvidenceBytes) throw new Error('Choose a non-empty evidence file up to 10 MB.')
  if (/\.pdf$/i.test(file.name) && await file.slice(0, 5).text() !== '%PDF-') throw new Error('This file does not appear to be a valid PDF.')
  const metadata: EvidenceFile = { id: crypto.randomUUID(), name: file.name, size: file.size,
    type: file.type || 'application/octet-stream', uploadedAt: new Date().toISOString(), uploadedBy }
  await storeFileBlob(metadata.id, file.slice(0, file.size, metadata.type))
  return metadata
}
