// Placeholder que `vite-plugin-pwa` (`injectManifest`) reemplaza por la lista
// de archivos a precachear.
declare interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: Array<import("workbox-precaching").PrecacheEntry | string>
}
