export const maxPdsBytes = 10 * 1024 * 1024
export type PdsFile = { id: string; name: string; size: number; type: 'application/pdf'; uploadedAt: string; uploadedBy: string }

export function validPdsMetadata(value: unknown): value is PdsFile {
  if (!value || typeof value !== 'object') return false
  const file = value as Record<string, unknown>
  return typeof file.id === 'string' && !!file.id.trim() && typeof file.name === 'string' && /\.pdf$/i.test(file.name)
    && typeof file.size === 'number' && file.size > 5 && file.size <= maxPdsBytes && file.type === 'application/pdf'
    && typeof file.uploadedAt === 'string' && !Number.isNaN(Date.parse(file.uploadedAt)) && typeof file.uploadedBy === 'string'
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('esg-assurance-pds', 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('files') }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('PDS storage is unavailable in this browser.'))
    request.onblocked = () => reject(new Error('Close other prototype tabs and try the upload again.'))
  })
}
async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('files', mode)
    const request = work(transaction.objectStore('files'))
    transaction.oncomplete = () => { db.close(); resolve(request.result) }
    transaction.onerror = transaction.onabort = () => { db.close(); reject(new Error('The PDS file could not be stored or read. Check browser storage and try again.')) }
  })
}
export async function storePds(file: File, uploadedBy: string): Promise<PdsFile> {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Choose a PDF file.')
  if (file.size <= 5 || file.size > maxPdsBytes) throw new Error('Choose a PDF file up to 10 MB.')
  if (await file.slice(0, 5).text() !== '%PDF-') throw new Error('This file does not appear to be a PDF. Choose a valid PDS PDF.')
  const metadata: PdsFile = { id: crypto.randomUUID(), name: file.name, size: file.size, type: 'application/pdf', uploadedAt: new Date().toISOString(), uploadedBy }
  await withStore('readwrite', store => store.put(file.slice(0, file.size, 'application/pdf'), metadata.id))
  return metadata
}
export async function readPds(id: string): Promise<Blob | undefined> {
  return withStore('readonly', store => store.get(id))
}
export async function clearPdsFiles(): Promise<void> {
  await withStore('readwrite', store => store.clear())
}
