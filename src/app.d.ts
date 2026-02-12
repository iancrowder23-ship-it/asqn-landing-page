import type { SupabaseClient } from '@supabase/supabase-js'

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient
			getClaims: () => Promise<Record<string, unknown> | null>
		}
		interface PageData {}
		interface PageState {}
		interface Platform {}
	}
}
export {}
