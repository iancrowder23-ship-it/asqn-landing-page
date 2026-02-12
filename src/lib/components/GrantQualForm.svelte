<script lang="ts">
	import { superForm } from 'sveltekit-superforms'

	let {
		form: formProp,
		qualifications,
	}: {
		form: Parameters<typeof superForm>[0]
		qualifications: { id: string; name: string; abbreviation: string | null; category: string | null }[]
	} = $props()

	const { form, errors, message, enhance, delayed } = superForm(formProp)

	// Auto-populate qualification_name when qualification_id changes
	function handleQualSelect(e: Event) {
		const select = e.target as HTMLSelectElement
		const qual = qualifications.find((q) => q.id === select.value)
		$form.qualification_name = qual?.name ?? ''
	}

	// Default date to today in YYYY-MM-DD format
	const today = new Date().toISOString().split('T')[0]
</script>

<form method="POST" action="?/grantQualification" use:enhance class="space-y-4">
	{#if $message}
		<div
			class="p-3 rounded border {$message.includes('successfully')
				? 'border-od-green/30 bg-od-green/10 text-od-green-light'
				: 'border-alert/30 bg-alert/10 text-alert'} text-sm"
		>
			{$message}
		</div>
	{/if}

	<!-- Hidden field for qualification_name -->
	<input type="hidden" name="qualification_name" bind:value={$form.qualification_name} />

	<!-- Qualification Select -->
	<div class="flex flex-col">
		<label for="grant-qual-id" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Qualification
		</label>
		<select
			id="grant-qual-id"
			name="qualification_id"
			bind:value={$form.qualification_id}
			onchange={handleQualSelect}
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
		>
			<option value="">Select qualification...</option>
			{#each qualifications as qual (qual.id)}
				<option value={qual.id}>
					{qual.name}{qual.abbreviation ? ` (${qual.abbreviation})` : ''}{qual.category ? ` — ${qual.category}` : ''}
				</option>
			{/each}
		</select>
		{#if $errors.qualification_id}
			<span class="text-alert text-xs mt-1">{$errors.qualification_id}</span>
		{/if}
	</div>

	<!-- Date -->
	<div class="flex flex-col">
		<label for="grant-qual-date" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Award Date
		</label>
		<input
			id="grant-qual-date"
			type="date"
			name="awarded_date"
			bind:value={$form.awarded_date}
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
		/>
		{#if $errors.awarded_date}
			<span class="text-alert text-xs mt-1">{$errors.awarded_date}</span>
		{/if}
	</div>

	<!-- Notes (optional) -->
	<div class="flex flex-col">
		<label for="grant-qual-notes" class="text-steel text-xs font-medium mb-1 uppercase tracking-wider block">
			Notes <span class="text-steel/50">(optional)</span>
		</label>
		<textarea
			id="grant-qual-notes"
			name="notes"
			rows="2"
			maxlength="500"
			bind:value={$form.notes}
			placeholder="Additional notes..."
			class="bg-night-surface border border-night-border text-steel rounded px-3 py-2 w-full focus:outline-none focus:border-od-green resize-none"
		></textarea>
		{#if $errors.notes}
			<span class="text-alert text-xs mt-1">{$errors.notes}</span>
		{/if}
	</div>

	<button
		type="submit"
		disabled={$delayed}
		class="bg-od-green hover:bg-od-green-light text-night font-bold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
	>
		{#if $delayed}Granting...{:else}Grant Qualification{/if}
	</button>
</form>
