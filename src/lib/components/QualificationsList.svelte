<script lang="ts">
	let {
		qualifications,
	}: {
		qualifications: {
			id: string
			awarded_date: string | null
			expiration_date: string | null
			status: string | null
			notes: string | null
			qualifications: {
				id: string
				name: string
				abbreviation: string | null
				badge_url: string | null
				category: string | null
			} | { id: string; name: string; abbreviation: string | null; badge_url: string | null; category: string | null }[] | null
		}[]
	} = $props()

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	function getQual(q: (typeof qualifications)[0]) {
		const raw = q.qualifications
		if (!raw) return null
		return Array.isArray(raw) ? raw[0] : raw
	}

	function statusClass(status: string | null): string {
		switch (status) {
			case 'active':
				return 'text-od-green-light'
			case 'expired':
				return 'text-ranger-tan-muted'
			case 'revoked':
				return 'text-alert'
			default:
				return 'text-steel/50'
		}
	}
</script>

{#if qualifications.length === 0}
	<p class="text-steel/50 text-sm italic">No qualifications recorded</p>
{:else}
	<div class="space-y-2">
		{#each qualifications as entry (entry.id)}
			{@const qual = getQual(entry)}
			<div class="flex items-start justify-between gap-4 py-2 border-b border-night-border last:border-0">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						{#if qual?.badge_url}
							<img src={qual.badge_url} alt={qual.name} class="w-5 h-5 object-contain shrink-0" />
						{/if}
						<span class="text-steel font-medium text-sm">
							{qual?.name ?? 'Unknown'}
							{#if qual?.abbreviation}
								<span class="text-steel/50 text-xs">({qual.abbreviation})</span>
							{/if}
						</span>
					</div>
					{#if qual?.category}
						<p class="text-steel/50 text-xs mt-0.5">{qual.category}</p>
					{/if}
					{#if entry.notes}
						<p class="text-steel/60 text-xs mt-0.5 italic">{entry.notes}</p>
					{/if}
				</div>
				<div class="text-right shrink-0">
					<p class="text-steel/70 text-xs">{formatDate(entry.awarded_date)}</p>
					<span class="text-xs uppercase font-bold tracking-wider {statusClass(entry.status)}">
						{entry.status ?? '—'}
					</span>
					{#if entry.expiration_date}
						<p class="text-steel/40 text-xs">Exp: {formatDate(entry.expiration_date)}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}
