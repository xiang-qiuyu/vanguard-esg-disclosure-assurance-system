"use client"

import { CalendarClock, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { type Review } from '@/lib/review'
import { formatTargetDate, isOverdue } from '@/lib/timing'

export function Deadline({ review, now }: { review: Pick<Review, 'stage' | 'targetDate'>; now: Date }) {
  const overdue = isOverdue(review, now)
  return <div className="flex flex-wrap items-center gap-2 text-sm"><CalendarClock className="size-4 shrink-0" /><span>Target completion: <strong>{formatTargetDate(review.targetDate)}</strong></span>{overdue && <Badge variant="destructive" className="border-red-300 bg-red-100 text-red-900">Overdue</Badge>}</div>
}

export function ReviewTiming({ review, now, delayedChecks = false }: { review: Review; now: Date; delayedChecks?: boolean }) {
  const overdue = isOverdue(review, now)
  return <section className={`panel p-4 ${overdue ? 'border-red-300 bg-red-50' : ''}`}>
    <Deadline review={review} now={now} />
    {overdue && <p className="mt-2 flex items-start gap-2 text-sm text-red-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{delayedChecks ? 'Product Strategy checks are overdue. Screening methodology, issuer coverage, exclusions and limitations are taking longer to verify. Product Strategy must complete the checks and its approval decision.' : 'The target completion date has passed.'}</p>}
  </section>
}
