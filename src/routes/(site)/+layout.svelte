<script lang="ts">
  let { children } = $props()
  let mobileOpen = $state(false)

  const navLinks = [
    { href: '/about', label: 'About' },
    { href: '/leadership', label: 'Leadership' },
    { href: '/orbat', label: 'ORBAT' },
    { href: '/rank-chart', label: 'Rank Chart' },
    { href: '/events', label: 'Events' },
    { href: '/contact', label: 'Contact' },
  ]
</script>

<div class="min-h-screen flex flex-col dark:bg-night dark:text-steel">
  <nav class="dark:bg-night-surface dark:border-night-border border-b px-4 py-3">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="/" class="font-tactical text-ranger-tan text-xl tracking-wider">ASQN 1st SFOD</a>

      <!-- Desktop nav -->
      <div class="hidden md:flex items-center gap-6">
        {#each navLinks as link}
          <a href={link.href} class="text-steel hover:text-ranger-tan transition-colors text-sm uppercase tracking-wide">{link.label}</a>
        {/each}
        <a href="/enlist" class="bg-od-green hover:bg-od-green-light text-night font-bold px-4 py-2 rounded text-sm uppercase tracking-wide transition-colors">Enlist</a>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="md:hidden text-ranger-tan"
        onclick={() => mobileOpen = !mobileOpen}
        aria-label="Toggle navigation"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {#if mobileOpen}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          {/if}
        </svg>
      </button>
    </div>

    <!-- Mobile nav -->
    {#if mobileOpen}
      <div class="md:hidden mt-3 flex flex-col gap-2 border-t dark:border-night-border pt-3">
        {#each navLinks as link}
          <a href={link.href} class="text-steel hover:text-ranger-tan transition-colors text-sm uppercase tracking-wide py-1" onclick={() => mobileOpen = false}>{link.label}</a>
        {/each}
        <a href="/enlist" class="bg-od-green hover:bg-od-green-light text-night font-bold px-4 py-2 rounded text-sm uppercase tracking-wide transition-colors text-center mt-2" onclick={() => mobileOpen = false}>Enlist</a>
      </div>
    {/if}
  </nav>

  <main class="flex-1">
    {@render children()}
  </main>

  <footer class="dark:bg-night-surface dark:border-night-border border-t px-4 py-6">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-steel">
      <p>&copy; {new Date().getFullYear()} ASQN 1st SFOD — De Oppresso Liber</p>
      <div class="flex items-center gap-4">
        <!-- Replace PLACEHOLDER with actual Discord invite URL -->
        <a href="https://discord.gg/PLACEHOLDER" class="text-od-green-light hover:text-ranger-tan transition-colors" target="_blank" rel="noopener noreferrer">Discord</a>
        <a href="/contact" class="text-od-green-light hover:text-ranger-tan transition-colors">Contact</a>
      </div>
    </div>
  </footer>
</div>
