/**
 * Almacenamiento persistente para el offline de meses
 * (`openspec/changes/add-offline-meses-pwa`, D-1).
 *
 * Sin `navigator.storage.persist()` concedido el navegador puede borrar
 * IndexedDB bajo presión de espacio, y Safari/iOS lo borra tras 7 días sin
 * abrir el sitio si la PWA NO está instalada en la pantalla de inicio. Para un
 * docente que pasa meses sin red eso es perder todo lo capturado: por eso la
 * UI avisa fuerte cuando no está persistido y guía la instalación.
 */
export interface StorageStatus {
  /** `null` = el navegador no expone la API. */
  persisted: boolean | null
  usage: number | null
  quota: number | null
  /** La app corre instalada (pantalla de inicio / ventana propia). */
  installed: boolean
  /** iOS/iPadOS Safari: la instalación es manual (Compartir, "Agregar a inicio"). */
  ios: boolean
}

/** Aviso de cuota desde este porcentaje de uso. */
export const QUOTA_WARN_RATIO = 0.8

export function isInstalledPwa(): boolean {
  if (typeof window === "undefined") return false
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone || window.matchMedia?.("(display-mode: standalone)").matches === true
}

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

/** Pide persistencia (idempotente). Nunca tira. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

export async function getStorageStatus(): Promise<StorageStatus> {
  let persisted: boolean | null = null
  let usage: number | null = null
  let quota: number | null = null
  try {
    if (navigator.storage?.persisted) persisted = await navigator.storage.persisted()
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate()
      usage = estimate.usage ?? null
      quota = estimate.quota ?? null
    }
  } catch {
    // API no disponible (modo privado, iframes): se informa como desconocido.
  }
  return { persisted, usage, quota, installed: isInstalledPwa(), ios: isIos() }
}

export type StorageRisk = "ok" | "no-persistido" | "cuota" | "ios-sin-instalar"

/** Riesgos en orden de gravedad. Función pura. */
export function storageRisks(status: StorageStatus): StorageRisk[] {
  const risks: StorageRisk[] = []
  if (status.ios && !status.installed) risks.push("ios-sin-instalar")
  if (status.persisted === false) risks.push("no-persistido")
  if (status.usage != null && status.quota && status.usage / status.quota >= QUOTA_WARN_RATIO) risks.push("cuota")
  return risks.length ? risks : ["ok"]
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

// ---- Instalación de la PWA (Chromium: `beforeinstallprompt`) ---------------

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const installListeners = new Set<() => void>()

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    installListeners.forEach((l) => l())
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    installListeners.forEach((l) => l())
  })
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null
}

export function subscribeInstall(listener: () => void): () => void {
  installListeners.add(listener)
  return () => {
    installListeners.delete(listener)
  }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false
  const prompt = deferredPrompt
  deferredPrompt = null
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  installListeners.forEach((l) => l())
  return outcome === "accepted"
}
