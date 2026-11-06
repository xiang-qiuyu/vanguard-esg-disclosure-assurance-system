import { type Review } from './review'
import { isOverdue } from './timing'

const labels = ['Draft', 'In review', 'Overdue', 'Approved'] as const
type SummaryCategory = typeof labels[number]

export function dashboardMetrics(reviews: readonly Pick<Review, 'stage' | 'targetDate'>[], now: Date) {
 const counts: Record<SummaryCategory, number> = { Draft: 0, 'In review': 0, Overdue: 0, Approved: 0 }
 for (const review of reviews) {
  const category: SummaryCategory = review.stage === 'approved' ? 'Approved'
   : isOverdue(review, now) ? 'Overdue'
   : review.stage === 'draft' ? 'Draft' : 'In review'
  counts[category]++
 }
 return labels.map(label => ({ label, count: counts[label] }))
}
