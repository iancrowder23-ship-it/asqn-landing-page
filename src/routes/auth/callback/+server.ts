import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code')
	const next = url.searchParams.get('next') ?? '/dashboard'

	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code)
		if (!error) {
			// Strip leading slash from next to prevent double-slash
			redirect(303, `/${next.replace(/^\//, '')}`)
		}
	}

	// Auth failed — redirect to login with error indicator
	redirect(303, '/auth/login?error=auth_failed')
}
