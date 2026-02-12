<script lang="ts">
  import { superForm } from 'sveltekit-superforms'

  let { data } = $props()
  const { form, errors, constraints, message, enhance, delayed } = superForm(data.form)
</script>

<svelte:head>
  <title>Enlist — ASQN 1st SFOD</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-ranger-tan mb-2 font-tactical">Enlist</h1>
  <p class="text-steel mb-8">Submit your application to join ASQN 1st SFOD</p>

  {#if $message && $message.includes('submitted successfully')}
    <div class="dark:bg-night-surface dark:border-night-border border rounded-lg p-8 text-center">
      <h2 class="text-2xl font-bold text-od-green-light mb-4">Application Received</h2>
      <p class="text-steel leading-relaxed mb-4">{$message}</p>
      <p class="text-steel leading-relaxed mb-6">We will review your application and contact you via Discord.</p>
      <a href="/" class="text-od-green-light hover:text-ranger-tan transition-colors font-bold">Return to Home</a>
    </div>
  {:else}
    {#if $message}
      <div class="mb-6 p-3 rounded border border-alert/30 bg-alert/10">
        <p class="text-alert text-sm">{$message}</p>
      </div>
    {/if}

    <form method="POST" use:enhance class="space-y-6">
      <!-- Display Name -->
      <div class="flex flex-col">
        <label for="display_name" class="text-steel text-sm font-medium mb-1 block">Display Name / Gamertag</label>
        <input
          id="display_name"
          type="text"
          bind:value={$form.display_name}
          {...$constraints.display_name}
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        />
        {#if $errors.display_name}<span class="text-alert text-sm mt-1">{$errors.display_name}</span>{/if}
      </div>

      <!-- Discord Username -->
      <div class="flex flex-col">
        <label for="discord_username" class="text-steel text-sm font-medium mb-1 block">Discord Username</label>
        <input
          id="discord_username"
          type="text"
          bind:value={$form.discord_username}
          {...$constraints.discord_username}
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        />
        {#if $errors.discord_username}<span class="text-alert text-sm mt-1">{$errors.discord_username}</span>{/if}
      </div>

      <!-- Age -->
      <div class="flex flex-col">
        <label for="age" class="text-steel text-sm font-medium mb-1 block">Age</label>
        <input
          id="age"
          type="number"
          bind:value={$form.age}
          {...$constraints.age}
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        />
        {#if $errors.age}<span class="text-alert text-sm mt-1">{$errors.age}</span>{/if}
      </div>

      <!-- Timezone -->
      <div class="flex flex-col">
        <label for="timezone" class="text-steel text-sm font-medium mb-1 block">Timezone</label>
        <select
          id="timezone"
          bind:value={$form.timezone}
          {...$constraints.timezone}
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        >
          <option value="">Select timezone...</option>
          <option value="EST">Eastern (EST)</option>
          <option value="CST">Central (CST)</option>
          <option value="MST">Mountain (MST)</option>
          <option value="PST">Pacific (PST)</option>
          <option value="AKST">Alaska (AKST)</option>
          <option value="HST">Hawaii (HST)</option>
          <option value="GMT">Greenwich Mean Time (GMT)</option>
          <option value="CET">Central European (CET)</option>
          <option value="EET">Eastern European (EET)</option>
          <option value="AEST">Australian Eastern (AEST)</option>
          <option value="Other">Other</option>
        </select>
        {#if $errors.timezone}<span class="text-alert text-sm mt-1">{$errors.timezone}</span>{/if}
      </div>

      <!-- Arma Experience -->
      <div class="flex flex-col">
        <label for="arma_experience" class="text-steel text-sm font-medium mb-1 block">Arma 3 Experience</label>
        <textarea
          id="arma_experience"
          rows="4"
          bind:value={$form.arma_experience}
          {...$constraints.arma_experience}
          placeholder="Describe your Arma 3 experience, mods used, hours played..."
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        ></textarea>
        {#if $errors.arma_experience}<span class="text-alert text-sm mt-1">{$errors.arma_experience}</span>{/if}
      </div>

      <!-- Why Join -->
      <div class="flex flex-col">
        <label for="why_join" class="text-steel text-sm font-medium mb-1 block">Why do you want to join?</label>
        <textarea
          id="why_join"
          rows="4"
          bind:value={$form.why_join}
          {...$constraints.why_join}
          placeholder="Tell us about yourself and why ASQN 1st SFOD..."
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        ></textarea>
        {#if $errors.why_join}<span class="text-alert text-sm mt-1">{$errors.why_join}</span>{/if}
      </div>

      <!-- Referred By -->
      <div class="flex flex-col">
        <label for="referred_by" class="text-steel text-sm font-medium mb-1 block">Referred By (optional)</label>
        <input
          id="referred_by"
          type="text"
          bind:value={$form.referred_by}
          {...$constraints.referred_by}
          class="dark:bg-night-surface dark:border-night-border dark:text-ranger-tan border rounded px-3 py-2 w-full focus:outline-none focus:border-od-green"
        />
        {#if $errors.referred_by}<span class="text-alert text-sm mt-1">{$errors.referred_by}</span>{/if}
      </div>

      <!-- Submit -->
      <button
        type="submit"
        disabled={$delayed}
        class="bg-od-green hover:bg-od-green-light text-night font-bold py-3 px-6 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if $delayed}Submitting...{:else}Submit Application{/if}
      </button>
    </form>
  {/if}
</div>
