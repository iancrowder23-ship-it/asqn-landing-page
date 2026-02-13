import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createAdminClient } from '$lib/supabase/admin'

const ASQN_GUILD_ID = '1464714214819102964'

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code')
	const next = url.searchParams.get('next') ?? '/dashboard'

	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)

		if (!error && data.session) {
			const providerToken = data.session.provider_token

			// Cannot verify membership without a provider token — reject
			if (!providerToken) {
				const adminClient = createAdminClient()
				try {
					await adminClient.auth.admin.deleteUser(data.session.user.id)
				} catch (deleteErr) {
					console.error('Failed to delete user after missing provider token:', deleteErr)
				}
				redirect(303, '/auth/rejected')
			}

			// Check Discord guild membership
			const memberRes = await fetch(
				`https://discord.com/api/v10/users/@me/guilds/${ASQN_GUILD_ID}/member`,
				{
					headers: {
						Authorization: `Bearer ${providerToken}`,
					},
				}
			)

			if (!memberRes.ok) {
				// User is not a member — delete their account and reject
				const adminClient = createAdminClient()
				try {
					await adminClient.auth.admin.deleteUser(data.session.user.id)
				} catch (deleteErr) {
					console.error('Failed to delete non-member user:', deleteErr)
				}
				redirect(303, '/auth/rejected')
			}

			// Member confirmed — proceed to dashboard
			redirect(303, `/${next.replace(/^\//, '')}`)
		}
	}

	// Auth failed — redirect to login with error indicator
	redirect(303, '/auth/login?error=auth_failed')
}
