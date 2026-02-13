import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
	login: async ({ locals: { supabase }, url }) => {
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'discord',
			options: {
				redirectTo: `${url.origin}/auth/callback`,
				scopes: 'guilds.members.read',
			}
		})

		if (error) {
			return { error: error.message }
		}

		if (data.url) {
			redirect(303, data.url)
		}
	}
}
