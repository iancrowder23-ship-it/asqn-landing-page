<script lang="ts">
  let { soldier }: {
    soldier: {
      id: string
      display_name: string
      callsign: string | null
      mos: string | null
      unit_id: string | null
      rank_name: string | null
      rank_abbreviation: string | null
      rank_insignia_url: string | null
      unit_name: string | null
      unit_abbreviation: string | null
    }
  } = $props()
</script>

<a
  href="/soldiers/{soldier.id}"
  class="block bg-night-surface border border-night-border rounded p-4 hover:border-od-green transition-colors group"
>
  <!-- Rank insignia / abbreviation -->
  <div class="flex items-start gap-3 mb-3">
    <div class="shrink-0 w-12 h-12 flex items-center justify-center">
      {#if soldier.rank_insignia_url}
        <img
          src={soldier.rank_insignia_url}
          alt={soldier.rank_abbreviation ?? soldier.rank_name ?? 'Rank'}
          class="w-12 h-12 object-contain"
        />
      {:else}
        <div class="w-12 h-12 bg-night-border rounded flex items-center justify-center text-ranger-tan font-tactical font-bold text-sm">
          {soldier.rank_abbreviation ?? '—'}
        </div>
      {/if}
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-tactical font-bold text-ranger-tan group-hover:text-ranger-tan truncate">
        {soldier.display_name}
      </div>
      {#if soldier.callsign}
        <div class="text-od-green-light text-sm">"{soldier.callsign}"</div>
      {/if}
    </div>
  </div>

  <!-- Details -->
  <div class="space-y-1 text-xs text-steel/70">
    {#if soldier.rank_name}
      <div class="flex items-center gap-1">
        <span class="text-steel/50">Rank:</span>
        <span class="text-steel">{soldier.rank_name}</span>
      </div>
    {/if}
    {#if soldier.unit_abbreviation ?? soldier.unit_name}
      <div class="flex items-center gap-1">
        <span class="text-steel/50">Unit:</span>
        <span class="text-steel">{soldier.unit_abbreviation ?? soldier.unit_name}</span>
      </div>
    {/if}
    {#if soldier.mos}
      <div class="flex items-center gap-1">
        <span class="text-steel/50">MOS:</span>
        <span class="text-steel font-mono">{soldier.mos}</span>
      </div>
    {/if}
  </div>
</a>
