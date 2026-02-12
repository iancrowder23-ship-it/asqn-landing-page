<script lang="ts">
	let {
		awards,
	}: {
		awards: {
			id: string
			awarded_date: string | null
			citation: string | null
			awards: {
				id: string
				name: string
				abbreviation: string | null
				ribbon_url: string | null
				award_type: string | null
			} | { id: string; name: string; abbreviation: string | null; ribbon_url: string | null; award_type: string | null }[] | null
		}[]
	} = $props()

	let expanded: Set<string> = $state(new Set())

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return '—'
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	function getAward(entry: (typeof awards)[0]) {
		const raw = entry.awards
		if (!raw) return null
		return Array.isArray(raw) ? raw[0] : raw
	}

	function toggleExpand(id: string) {
		if (expanded.has(id)) {
			expanded.delete(id)
		} else {
			expanded.add(id)
		}
		expanded = new Set(expanded)
	}

	const CITATION_PREVIEW_LENGTH = 120
</script>

{#if awards.length === 0}
	<p class="text-steel/50 text-sm italic">No awards recorded</p>
{:else}
	<div class="space-y-3">
		{#each awards as entry (entry.id)}
			{@const award = getAward(entry)}
			<div class="py-2 border-b border-night-border last:border-0">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							{#if award?.ribbon_url}
								<img src={award.ribbon_url} alt={award.name} class="w-8 h-5 object-contain shrink-0" />
							{/if}
							<span class="text-steel font-medium text-sm">
								{award?.name ?? 'Unknown'}
								{#if award?.abbreviation}
									<span class="text-steel/50 text-xs">({award.abbreviation})</span>
								{/if}
							</span>
						</div>
						{#if award?.award_type}
							<p class="text-steel/50 text-xs mt-0.5 capitalize">{award.award_type}</p>
						{/if}

						{#if entry.citation}
							<div class="mt-1">
								{#if expanded.has(entry.id) || entry.citation.length <= CITATION_PREVIEW_LENGTH}
									<p class="text-steel/70 text-xs leading-relaxed italic">"{entry.citation}"</p>
								{:else}
									<p class="text-steel/70 text-xs leading-relaxed italic">
										"{entry.citation.slice(0, CITATION_PREVIEW_LENGTH)}..."
									</p>
								{/if}
								{#if entry.citation.length > CITATION_PREVIEW_LENGTH}
									<button
										type="button"
										onclick={() => toggleExpand(entry.id)}
										class="text-od-green-light text-xs mt-0.5 hover:underline"
									>
										{expanded.has(entry.id) ? 'Show less' : 'Read more'}
									</button>
								{/if}
							</div>
						{/if}
					</div>
					<div class="text-right shrink-0">
						<p class="text-steel/70 text-xs">{formatDate(entry.awarded_date)}</p>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
