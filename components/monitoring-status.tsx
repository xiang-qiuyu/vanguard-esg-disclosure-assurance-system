import { Badge } from '@/components/ui/badge'
import { monitoringStatus } from '@/lib/monitoring'
import { type Review } from '@/lib/review'

export function MonitoringStatus({ review }: { review?: Pick<Review, 'stage' | 'concerns'> }) {
 const status = monitoringStatus(review)
 return <Badge variant="outline" className={status === 'Active' ? 'border-amber-300 bg-amber-50 text-amber-900' : status === 'Addressed' ? 'border-green-300 bg-green-50 text-green-800' : 'text-muted-foreground'}>{status}</Badge>
}
