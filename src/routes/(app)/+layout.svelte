<script lang="ts">
  import type { LayoutData } from './$types'
  import { roleLabel } from '$lib/auth/roles'

  let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props()
</script>

<div class="min-h-screen bg-night text-steel">
  <!-- Navigation Bar -->
  <nav class="bg-night-surface border-b border-night-border px-4 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-6">
        <a href="/dashboard" class="text-ranger-tan font-tactical font-bold text-lg tracking-wider hover:text-ranger-tan-muted transition-colors">
          ASQN 1st SFOD
        </a>
        <div class="flex items-center gap-4 text-sm">
          <a href="/dashboard" class="text-steel hover:text-ranger-tan transition-colors">Dashboard</a>
          {#if data.mySoldierId}
            <a href="/soldiers/{data.mySoldierId}" class="text-steel hover:text-ranger-tan transition-colors">My Profile</a>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-steel/70">{roleLabel(data.userRole)}</span>
        <form method="POST" action="/auth/logout">
          <button type="submit" class="text-steel hover:text-alert transition-colors">Logout</button>
        </form>
      </div>
    </div>
  </nav>

  <!-- Page Content -->
  <main>
    {@render children()}
  </main>
</div>
