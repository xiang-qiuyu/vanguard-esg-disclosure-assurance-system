import { Badge } from '@/components/ui/badge'
import { isReturnedForRevision, workflow, type Review, type Stage } from '@/lib/review'

const colours: Record<Stage, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-800',
  disclosure: 'border-amber-300 bg-amber-100 text-amber-900',
  verify: 'border-blue-300 bg-blue-100 text-blue-900',
  risk: 'border-violet-300 bg-violet-100 text-violet-900',
  approved: 'border-emerald-300 bg-emerald-100 text-emerald-900',
}

export function StatusBadge({ stage = 'draft', review }: { stage?: Stage; review?: Pick<Review, 'stage' | 'events'> }) {
  const currentStage = review?.stage ?? stage
  const returned = !!review && isReturnedForRevision(review)
  const label = workflow.find(step => step.stage === currentStage)?.status ?? 'Unknown status'
  return <span className="inline-flex max-w-full flex-wrap items-center gap-2">
    <Badge variant="outline" data-status={currentStage} className={`h-auto max-w-full items-start justify-start whitespace-normal rounded-lg px-3 py-1.5 text-left leading-snug ${colours[currentStage]}`}><span className="min-w-0 break-words">{label}</span></Badge>
    {returned && <Badge variant="outline" data-revision-status="required" className="h-auto max-w-full whitespace-normal rounded-lg border-orange-300 bg-orange-50 px-3 py-1.5 leading-snug text-orange-900"><span className="min-w-0 break-words">Revisions Required</span></Badge>}
  </span>
}
