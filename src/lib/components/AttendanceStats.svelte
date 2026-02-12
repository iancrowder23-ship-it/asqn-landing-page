<script lang="ts">
	let {
		operationCount,
		totalOperations,
		attendancePercent,
		lastActiveDate,
	}: {
		operationCount: number
		totalOperations: number
		attendancePercent: number | null
		lastActiveDate: string | null
	} = $props()

	const formattedLastActive = $derived(
		lastActiveDate
			? new Date(lastActiveDate).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short',
					day: 'numeric',
				})
			: 'No activity',
	)
</script>

<div class="bg-night-surface border border-night-border rounded-lg p-4">
	<div class="grid grid-cols-1 gap-4">
		<div>
			<p class="text-steel text-xs uppercase tracking-wider mb-1">Operations Attended</p>
			<p class="text-ranger-tan text-xl font-bold font-tactical">
				{operationCount}
				<span class="text-steel text-sm font-normal">of {totalOperations}</span>
			</p>
		</div>
		<div>
			<p class="text-steel text-xs uppercase tracking-wider mb-1">Attendance Rate</p>
			<p class="text-ranger-tan text-xl font-bold font-tactical">
				{attendancePercent !== null ? `${attendancePercent}%` : 'N/A'}
			</p>
		</div>
		<div>
			<p class="text-steel text-xs uppercase tracking-wider mb-1">Last Active</p>
			<p class="text-ranger-tan text-xl font-bold font-tactical">{formattedLastActive}</p>
		</div>
	</div>
</div>
