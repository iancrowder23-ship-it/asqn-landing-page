import { z } from 'zod'

export const OPERATION_TYPES = ['operation', 'training', 'ftx'] as const
export const OPERATION_STATUSES = ['scheduled', 'completed', 'cancelled'] as const

export const createOperationSchema = z.object({
	title: z.string().min(3, 'Title required').max(200),
	operation_date: z.string().min(1, 'Date required'),
	operation_type: z.enum(OPERATION_TYPES, { error: 'Select type' }),
	status: z.enum(OPERATION_STATUSES).default('completed'),
	description: z.string().max(2000).optional(),
})
