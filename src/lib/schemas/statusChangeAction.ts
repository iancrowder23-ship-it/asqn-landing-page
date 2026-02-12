import { z } from 'zod'

export const SOLDIER_STATUSES = ['active', 'loa', 'awol', 'discharged', 'retired'] as const

export const statusChangeActionSchema = z.object({
	new_status:  z.enum(SOLDIER_STATUSES),
	from_status: z.enum(SOLDIER_STATUSES),
	reason:      z.string().min(5, 'Reason required').max(500),
})
