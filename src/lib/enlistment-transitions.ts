export const VALID_TRANSITIONS: Record<string, string[]> = {
	pending:             ['reviewing'],
	reviewing:           ['interview_scheduled', 'rejected'],
	interview_scheduled: ['accepted', 'rejected'],
	accepted:            [],   // terminal
	rejected:            [],   // terminal
}

export function isValidTransition(from: string, to: string): boolean {
	return (VALID_TRANSITIONS[from] ?? []).includes(to)
}

export const STATUS_LABELS: Record<string, string> = {
	pending:             'Pending Review',
	reviewing:           'Under Review',
	interview_scheduled: 'Interview Scheduled',
	accepted:            'Accepted',
	rejected:            'Denied',
}

export const NEXT_STATES: Record<string, { label: string; value: string; style: string }[]> = {
	pending:             [{ label: 'Begin Review', value: 'reviewing', style: 'secondary' }],
	reviewing:           [
		{ label: 'Schedule Interview', value: 'interview_scheduled', style: 'secondary' },
		{ label: 'Deny', value: 'rejected', style: 'danger' },
	],
	interview_scheduled: [
		{ label: 'Accept', value: 'accepted', style: 'primary' },
		{ label: 'Deny', value: 'rejected', style: 'danger' },
	],
	accepted:            [],
	rejected:            [],
}
