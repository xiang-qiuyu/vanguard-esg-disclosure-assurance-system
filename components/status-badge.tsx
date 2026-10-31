import { Badge } from '@/components/ui/badge'
import { workflow, type Stage } from '@/lib/review'

const colours: Record<Stage, string> = {
  draft: 'border-slate-300 bg-slate-100 text-slate-800',
  disclosure: 'border-amber-300 bg-amber-100 text-amber-900',
  verify: 'border-blue-300 bg-blue-100 text-blue-900',
  risk: 'border-violet-300 bg-violet-100 text-violet-900',
  approved: 'border-emerald-300 bg-emerald-100 text-emerald-900',
}

export function StatusBadge({ stage = 'draft' }: { stage?: Stage }) {
  return <Badge variant="outline" data-status={stage} className={`h-auto max-w-full whitespace-normal text-left leading-relaxed ${colours[stage]}`}>
    {workflow.find(step => step.stage === stage)?.status ?? 'Unknown status'}
  </Badge>
}
