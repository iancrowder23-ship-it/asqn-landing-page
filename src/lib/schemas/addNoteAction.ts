import { z } from 'zod'

export const addNoteActionSchema = z.object({
	note_text: z.string().min(10, 'Note must be at least 10 characters').max(2000),
})
