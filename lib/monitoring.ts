import { getUser, type Review, type User } from './review'

export const concernCategories = {
  'screening-coverage': 'ESG screening coverage',
  methodology: 'Screening methodology',
  exclusions: 'Exclusions and thresholds',
  wording: 'Disclosure wording and consistency',
  other: 'Other ESG disclosure concern',
} as const
export const concernTitles = {
  'screening-coverage': 'Screening coverage limitation',
  methodology: 'Screening methodology concern',
  exclusions: 'Exclusions and thresholds concern',
  wording: 'Disclosure wording concern',
  other: 'ESG disclosure concern',
} as const
export const riskSeverities = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' } as const
export const remediationTeams = {
  'Product Strategy': 'Product Strategy — ESG evidence / methodology',
  'Product Management': 'Product Management — PDS update',
  'Disclosure Team': 'Disclosure Team — Disclosure wording',
} as const
export type Concern = {
  id: string
  category: keyof typeof concernCategories
  severity: keyof typeof riskSeverities
  description: string
  assignedTo: keyof typeof remediationTeams
  status: 'open' | 'addressed'
  raisedBy: string
  raisedAt: string
  response?: { text: string; by: string; at: string }
}
export type ConcernInput = {
  category: Concern['category'] | ''
  severity: Concern['severity'] | ''
  description: string
  assignedTo: Concern['assignedTo'] | ''
}

export function openConcernCount(review?: Pick<Review, 'concerns'>): number {
  return review?.concerns?.filter(concern => concern.status === 'open').length ?? 0
}
export function monitoringStatus(review?: Pick<Review, 'stage' | 'concerns'>): 'Nil' | 'Active' | 'Addressed' {
  if (review?.stage !== 'approved' || !review.concerns?.length) return 'Nil'
  return openConcernCount(review) ? 'Active' : 'Addressed'
}
export function canAddressConcern(review: Review, concern: Concern, actor: User): boolean {
  return review.stage === 'approved' && concern.status === 'open' && actor.role === concern.assignedTo && getUser(actor.id)?.role === actor.role
}
export function responseBlocker(review: Review, concernId: string, response: string, actor: User): string | null {
  const concern = review.concerns?.find(concern => concern.id === concernId)
  if (!concern) return 'The concern could not be found.'
  if (concern.status !== 'open') return 'This concern has already been addressed.'
  if (!canAddressConcern(review, concern, actor)) return `Only the assigned ${concern.assignedTo} team can address this concern.`
  if (typeof response !== 'string' || !response.trim()) return 'Describe how your team addressed the concern.'
  if (response.trim().length > 4000) return 'Keep the remediation response to 4,000 characters or fewer.'
  return null
}
export function addressConcern(review: Review, concernId: string, response: string, actor: User, now = new Date()): Review {
  if (responseBlocker(review, concernId, response, actor) || Number.isNaN(now.getTime())) return review
  const concern = review.concerns!.find(concern => concern.id === concernId)!
  const addressed: Concern = { ...concern, status: 'addressed', response: { text: response.trim(), by: actor.id, at: now.toISOString() } }
  const updated: Review = { ...review, concerns: review.concerns!.map(concern => concern.id === concernId ? addressed : concern) }
  return { ...updated, events: [...review.events, {
    at: addressed.response!.at, role: actor.role, userId: actor.id, userName: getUser(actor.id)!.name,
    kind: 'concern-addressed', concern: { ...addressed, response: { ...addressed.response! } }, comment: addressed.response!.text,
    text: `${actor.role} addressed monitoring concern ${concernId}. Monitoring Status is ${monitoringStatus(updated)}. Disclosure Status remains Approved.`,
  }] }
}
export function concernInputError(input: ConcernInput): string | null {
  if (!input || !Object.hasOwn(concernCategories, input.category)) return 'Choose a concern category.'
  if (!Object.hasOwn(riskSeverities, input.severity)) return 'Choose a risk severity.'
  if (typeof input.description !== 'string' || !input.description.trim()) return 'Describe the concern.'
  if (input.description.trim().length > 4000) return 'Keep the concern description to 4,000 characters or fewer.'
  if (!Object.hasOwn(remediationTeams, input.assignedTo)) return 'Choose a team to assign remediation to.'
  return null
}
export function concernBlocker(review: Review, input: ConcernInput, actor: User): string | null {
  if (actor.role !== 'Risk / Compliance Team' || getUser(actor.id)?.role !== actor.role) return 'Only Risk / Compliance can flag monitoring concerns.'
  if (review.stage !== 'approved') return 'A concern can be flagged only after the disclosure is approved.'
  return concernInputError(input)
}
export function flagConcern(review: Review, input: ConcernInput, actor: User, now = new Date()): Review {
  if (concernBlocker(review, input, actor) || Number.isNaN(now.getTime())) return review
  const concern: Concern = {
    id: `${review.id}-C${String((review.concerns?.length ?? 0) + 1).padStart(3, '0')}`,
    category: input.category as Concern['category'], severity: input.severity as Concern['severity'],
    description: input.description.trim(), assignedTo: input.assignedTo as Concern['assignedTo'],
    status: 'open', raisedBy: actor.id, raisedAt: now.toISOString(),
  }
  return { ...review, concerns: [...(review.concerns ?? []), concern], events: [...review.events, {
    at: concern.raisedAt, role: actor.role, userId: actor.id, userName: getUser(actor.id)!.name,
    kind: 'monitoring-concern', concern: { ...concern }, comment: concern.description,
    text: `Monitoring concern ${concern.id} flagged: ${concernTitles[concern.category]}. ${riskSeverities[concern.severity]} priority; assigned to ${concern.assignedTo}. Monitoring Status is Active. Disclosure Status remains Approved.`,
  }] }
}
export function validConcern(value: unknown): value is Concern {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  const response = record.response as Record<string, unknown> | undefined
  const validResponse = record.status === 'open' ? response === undefined : record.status === 'addressed' && !!response && typeof response === 'object'
    && typeof response.text === 'string' && !!response.text.trim() && response.text.trim().length <= 4000
    && typeof response.by === 'string' && getUser(response.by)?.role === record.assignedTo
    && typeof response.at === 'string' && !Number.isNaN(Date.parse(response.at))
  return typeof record.id === 'string' && !!record.id.trim() && validResponse
    && typeof record.category === 'string' && Object.hasOwn(concernCategories, record.category)
    && typeof record.severity === 'string' && Object.hasOwn(riskSeverities, record.severity)
    && typeof record.description === 'string' && !!record.description.trim() && record.description.trim().length <= 4000
    && typeof record.assignedTo === 'string' && Object.hasOwn(remediationTeams, record.assignedTo)
    && typeof record.raisedBy === 'string' && getUser(record.raisedBy)?.role === 'Risk / Compliance Team'
    && typeof record.raisedAt === 'string' && !Number.isNaN(Date.parse(record.raisedAt))
}
