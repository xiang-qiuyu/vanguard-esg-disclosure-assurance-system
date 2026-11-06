export function validTargetDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function singaporeDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-')
}
export function isOverdue(review: { stage: string; targetDate?: string }, now = new Date()): boolean {
  return review.stage !== 'approved' && validTargetDate(review.targetDate) && singaporeDay(now) > review.targetDate
}
export function formatTargetDate(value?: string): string {
  return validTargetDate(value) ? new Date(`${value}T00:00:00+08:00`).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'
}
