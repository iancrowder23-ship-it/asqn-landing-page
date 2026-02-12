import { createSupabaseServerClient } from '$lib/supabase/server'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies)

	// CRITICAL: Use getClaims(), NOT getSession()
	// getSession() trusts unvalidated cookie data — can be spoofed.
	// getClaims() validates the JWT signature against Supabase's public keys.
	event.locals.getClaims = async () => {
		const { data, error } = await event.locals.supabase.auth.getClaims()
		if (error || !data?.claims) return null
		return data.claims as Record<string, unknown>
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		}
	})
}
