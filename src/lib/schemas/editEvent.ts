import { z } from 'zod'

export const EVENT_TYPES = ['operation', 'training', 'ftx'] as const
export const EVENT_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export const editEventSchema = z.object({
	title: z.string().min(3, 'Title must be at least 3 characters').max(200),
	description: z.string().max(2000).optional(),
	event_date: z.string().min(1, 'Date is required'),
	event_type: z.enum(EVENT_TYPES, { error: 'Select event type' }),
	status: z.enum(EVENT_STATUSES),
})
