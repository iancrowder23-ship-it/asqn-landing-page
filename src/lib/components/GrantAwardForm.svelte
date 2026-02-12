<script lang="ts">
	import { superForm } from 'sveltekit-superforms'

	let {
		form: formProp,
		awards,
	}: {
		form: Parameters<typeof superForm>[0]
		awards: { id: string; name: string; abbreviation: string | null; award_type: string | null }[]
	} = $props()

	const { form, errors, message, enhance, delayed } = superForm(formProp)

	// Auto-populate award_name when award_id changes
	function handleAwardSelect(e: Event) {
		const select = e.target as HTMLSelectElement
		const award = awards.find((a) => a.id === select.value)
		$form.award_name = award?.name ?? ''
	}

	// Default date to today in YYYY-MM-DD format
	const today = new Date().toISOString().split('T')[0]
</script>

<form method="POST" action="?/grantAward" use:enhance class="space-y-4">
	{#if $message}
		<div
			class="p-3 rounded border {$message.includes('successfully')
				? 'border-od-green/30 bg-od-green/10 text-od-green-light'
				: 'border-alert/30 bg-alert/10 text-alert'} text-sm"
		>
			{$message}
		</div>
	{/if}

	<!-- Hidden field for award_name -->
	<input type="hidden" name="award_name" bind:value={$form.award_name} />

	<!-- Award Select -->
	<div class="flex flex-col">
		<label for="grant-award-id" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Award / Decoration
		</label>
		<select
			id="grant-award-id"
			name="award_id"
			bind:value={$form.award_id}
			onchange={handleAwardSelect}
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
		>
			<option value="">Select award...</option>
			{#each awards as award (award.id)}
				<option value={award.id}>
					{award.name}{award.abbreviation ? ` (${award.abbreviation})` : ''}{award.award_type ? ` — ${award.award_type}` : ''}
				</option>
			{/each}
		</select>
		{#if $errors.award_id}
			<span class="text-alert text-xs mt-1">{$errors.award_id}</span>
		{/if}
	</div>

	<!-- Date -->
	<div class="flex flex-col">
		<label for="grant-award-date" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Award Date
		</label>
		<input
			id="grant-award-date"
			type="date"
			name="awarded_date"
			bind:value={$form.awarded_date}
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
		/>
		{#if $errors.awarded_date}
			<span class="text-alert text-xs mt-1">{$errors.awarded_date}</span>
		{/if}
	</div>

	<!-- Citation (required) -->
	<div class="flex flex-col">
		<label for="grant-award-citation" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Citation <span class="text-alert text-xs">*</span>
		</label>
		<textarea
			id="grant-award-citation"
			name="citation"
			rows="4"
			minlength="10"
			maxlength="2000"
			bind:value={$form.citation}
			placeholder="Enter citation text (minimum 10 characters)..."
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green resize-none"
		></textarea>
		{#if $errors.citation}
			<span class="text-alert text-xs mt-1">{$errors.citation}</span>
		{/if}
	</div>

	<button
		type="submit"
		disabled={$delayed}
		class="bg-od-green hover:bg-od-green-light text-night font-bold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{#if $delayed}Granting...{:else}Grant Award{/if}
	</button>
</form>
