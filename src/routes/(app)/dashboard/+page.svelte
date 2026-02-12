<script lang="ts">
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-2xl font-bold text-ranger-tan mb-4 font-tactical">Dashboard</h1>
  <p class="text-steel">Welcome. You are authenticated.</p>
</div>
