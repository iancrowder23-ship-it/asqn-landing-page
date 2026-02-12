<script lang="ts">
	import type { ActionData } from './$types'

	let { form }: { form: ActionData } = $props()
</script>

<div class="min-h-screen bg-black flex items-center justify-center">
	<div class="bg-gray-900 border border-gray-700 p-8 rounded-lg w-full max-w-md">
		<h1 class="text-white text-2xl font-bold mb-2">ASQN 1st SFOD</h1>
		<p class="text-gray-400 text-sm mb-8">Personnel Management System</p>

		{#if form?.error}
			<p class="text-red-400 text-sm mb-4">{form.error}</p>
		{/if}

		<form method="POST" action="?/login">
			<button
				type="submit"
				class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
			>
				Sign in with Discord
			</button>
		</form>
	</div>
</div>
