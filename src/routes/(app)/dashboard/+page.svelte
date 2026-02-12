<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<div class="min-h-screen bg-black text-white p-8">
	<h1 class="text-2xl font-bold mb-4">ASQN 1st SFOD — Dashboard</h1>
	<p class="text-gray-400">Welcome. You are authenticated.</p>
	{#if data.userRole}
		<p class="text-gray-400 mt-2">Role: {data.userRole}</p>
	{/if}
</div>
