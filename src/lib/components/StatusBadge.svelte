<script lang="ts">
	let { status }: { status: string } = $props()

	const colorClasses = $derived(() => {
		switch (status) {
			case 'active':
				return 'bg-od-green text-night'
			case 'loa':
				return 'bg-ranger-tan-muted text-night'
			case 'awol':
				return 'bg-alert text-night'
			case 'inactive':
				return 'bg-night-border text-steel'
			case 'discharged':
				return 'bg-night-border text-steel'
			case 'retired':
				return 'bg-night-border text-ranger-tan'
			default:
				return 'bg-night-border text-steel'
		}
	})
</script>

<span class="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider {colorClasses()}">{status}</span>
