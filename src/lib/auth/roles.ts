/**
 * Role constants and hierarchy helpers for ASQN 1st SFOD.
 *
 * These mirror the public.app_role PostgreSQL enum exactly.
 * Update both if the enum changes.
 *
 * IMPORTANT: hasRole() is for UI-layer checks only.
 * RLS is the actual enforcement layer — do not rely on client-side role checks for security.
 */

export const APP_ROLES = ['admin', 'command', 'nco', 'member'] as const
export type AppRole = typeof APP_ROLES[number]

/** Numeric hierarchy — higher number = more permissions */
const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin:   4,
  command: 3,
  nco:     2,
  member:  1,
}

/**
 * Returns true if userRole meets or exceeds requiredRole.
 *
 * Examples:
 *   hasRole('admin', 'nco')    // true  — admin outranks nco
 *   hasRole('member', 'nco')   // false — member is below nco
 *   hasRole(null, 'member')    // false — no role = no access
 *
 * Use for UI-layer gates only (show/hide elements, redirect in load functions).
 * Never use as a substitute for RLS.
 */
export function hasRole(userRole: AppRole | string | null | undefined, requiredRole: AppRole): boolean {
  if (!userRole) return false
  if (!APP_ROLES.includes(userRole as AppRole)) return false
  return ROLE_HIERARCHY[userRole as AppRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Returns the display label for a role.
 */
export function roleLabel(role: AppRole | string | null | undefined): string {
  const labels: Record<AppRole, string> = {
    admin: 'Administrator',
    command: 'Command',
    nco: 'Non-Commissioned Officer',
    member: 'Member',
  }
  if (!role || !APP_ROLES.includes(role as AppRole)) return 'No Role'
  return labels[role as AppRole]
}
