<script lang="ts">
	let {
		records,
	}: {
		records: Array<{
			id: string
			action_type: string
			payload: Record<string, unknown>
			performed_by: string | null
			visibility: string
			occurred_at: string
		}>
	} = $props()

	function getActionLabel(actionType: string): string {
		const labels: Record<string, string> = {
			rank_change: 'Rank Change',
			award: 'Award',
			qualification: 'Qualification',
			transfer: 'Transfer',
			status_change: 'Status Change',
			enlistment: 'Enlistment',
			note: 'Note',
		}
		return labels[actionType] ?? actionType
	}

	function getActionIcon(actionType: string): string {
		const icons: Record<string, string> = {
			rank_change: '▲',
			award: '★',
			qualification: '✓',
			transfer: '→',
			status_change: '●',
			enlistment: '+',
			note: '⊟',
		}
		return icons[actionType] ?? '·'
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}
</script>

{#if records.length === 0}
	<p class="text-steel text-sm">No service records.</p>
{:else}
	<div class="relative">
		<div class="border-l-2 border-night-border ml-4 space-y-0">
			{#each records as record (record.id)}
				{@const performedByName = (record.payload.performed_by_name as string | undefined) ?? 'Command'}
				<div class="relative pl-6 pb-6 last:pb-0">
					<!-- Timeline dot -->
					<div class="absolute left-0 top-1 w-4 h-4 -translate-x-[calc(50%+1px)] flex items-center justify-center">
						<span class="text-ranger-tan-muted text-xs leading-none">{getActionIcon(record.action_type)}</span>
					</div>

					<div class="flex flex-col sm:flex-row sm:gap-4">
						<!-- Date (left) -->
						<div class="text-steel/50 text-xs shrink-0 w-28 mt-0.5">
							{formatDate(record.occurred_at)}
						</div>

						<!-- Content (right) -->
						<div class="flex-1">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="text-ranger-tan font-bold text-sm">{getActionLabel(record.action_type)}</span>
								{#if record.visibility === 'leadership_only'}
									<span class="text-ranger-tan-muted text-xs uppercase tracking-wider">[NCO+]</span>
								{/if}
							</div>
							{#if record.payload.title}
								<p class="text-steel text-sm">{record.payload.title as string}</p>
							{/if}
							{#if record.payload.description}
								<p class="text-steel/70 text-xs mt-0.5">{record.payload.description as string}</p>
							{/if}
							<p class="text-steel/40 text-xs mt-0.5">by {performedByName}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
