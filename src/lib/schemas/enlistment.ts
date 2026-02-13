import { z } from 'zod'

export const enlistmentSchema = z.object({
	display_name: z.string().min(2, 'Name must be at least 2 characters').max(50),
	discord_username: z.string().min(2, 'Discord username required').max(50),
	age: z.coerce.number().int().min(16, 'Must be at least 16').max(99),
	timezone: z.string().min(1, 'Timezone required'),
	arma_experience: z.string().min(10, 'Please describe your experience (10+ chars)').max(1000),
	why_join: z.string().min(10, 'Please tell us why you want to join (10+ chars)').max(2000),
	referred_by: z.string().max(100).optional()
})
