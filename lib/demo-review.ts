import { illustrativeEvidence } from './evidence'
import { storePds, type PdsFile } from './pds'
import { attachPds, createReview, exampleWording, getUser, saveDraft, saveEvidence, transition, type Review } from './review'

export const overdueExampleId = 'PDS-002'

export function overdueExamplePdf(): string {
  const lines = ['Illustrative PDS - overdue verification example', ...exampleWording.match(/.{1,82}(?:\s|$)/g)!]
  const stream = `BT /F1 10 Tf 50 760 Td ${lines.map((line, index) => `${index ? '0 -16 Td ' : ''}(${line.trim().replace(/[\\()]/g, '\\$&')}) Tj`).join('\n')} ET`
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return pdf
}

export function createOverdueReview(pds: PdsFile): Review {
  const pm = getUser('pm-alex')!, strategy = getUser('strategy-maya')!
  let review = createReview(overdueExampleId, 'example', pm)!
  review = attachPds(review, { ...pds, uploadedAt: '2026-11-02T01:00:00Z' }, pm)
  review = saveDraft(review, { targetDate: '2026-11-05' }, pm)
  review = transition(review, 'submit', pm, 'PDS submitted for specialist screening methodology and issuer coverage checks.')
  review = saveEvidence(review, illustrativeEvidence(), strategy)
  const extraction = { ...review.extraction!, at: '2026-11-02T01:00:00Z' }
  return { ...review, extraction, events: [
    ...review.events.map((event, index) => ({ ...event, at: `2026-11-02T01:0${index}:00Z`, ...(event.snapshot?.extraction ? { snapshot: { ...event.snapshot, extraction: { ...extraction } } } : {}) })),
    { at: '2026-11-05T08:00:00Z', role: 'System', text: 'Overdue example: Product Strategy is taking longer to check screening methodology, issuer coverage, exclusions and limitations. Verification and its approval decision are still outstanding.' },
  ] }
}

export async function ensureOverdueExample(reviews: Review[]): Promise<Review[]> {
  if (reviews.some(review => review.id === overdueExampleId)) return reviews
  const pds = await storePds(new File([overdueExamplePdf()], 'overdue-verification-example.pdf', { type: 'application/pdf' }), 'pm-alex')
  return [createOverdueReview(pds), ...reviews]
}
