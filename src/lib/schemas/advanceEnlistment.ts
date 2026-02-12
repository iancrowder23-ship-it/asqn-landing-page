import { z } from 'zod'

export const advanceEnlistmentSchema = z.object({
	target_status: z.string().min(1, 'Target status required'),
})
