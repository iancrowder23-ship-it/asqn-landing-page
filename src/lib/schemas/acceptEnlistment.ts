import { z } from 'zod'

export const acceptEnlistmentSchema = z.object({
	rank_id: z.string().uuid('Select starting rank'),
	unit_id: z.string().uuid('Select unit assignment').optional(),
})
