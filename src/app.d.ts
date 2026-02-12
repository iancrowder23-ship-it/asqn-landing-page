// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  namespace App {
    // Locals populated in hooks.server.ts (plan 01-02)
    interface Locals {}
    interface PageData {}
    interface PageState {}
    interface Platform {}
  }
}
export {}
