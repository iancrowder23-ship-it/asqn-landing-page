/**
 * Shared date formatting utilities for ASQN 1st SFOD.
 *
 * Military Zulu time format: "15 MAR 2026 -- 1900Z"
 * All times are displayed in UTC (Zulu) to match military operations.
 */

export function formatDate(iso: string): string {
	const d = new Date(iso)
	const day = d.getUTCDate()
	const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
	const year = d.getUTCFullYear()
	const hours = d.getUTCHours().toString().padStart(2, '0')
	const minutes = d.getUTCMinutes().toString().padStart(2, '0')
	return `${day} ${month} ${year} \u2014 ${hours}${minutes}Z`
}
