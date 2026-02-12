import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public'
import { createServerClient } from '@supabase/ssr'
import type { Cookies } from '@sveltejs/kit'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseServerClient(cookies: Cookies) {
	// Temporary until plan 01-03 generates types
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return createServerClient<any>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						// path: '/' is REQUIRED — without it, cookies are scoped to the
						// current route and disappear on navigation
						cookies.set(name, value, { ...options, path: '/' })
					})
				}
			}
		}
	)
}
