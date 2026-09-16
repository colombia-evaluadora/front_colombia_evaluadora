import { useEffect } from "react"
import type { ErrorComponentProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

// Vite versiona cada chunk con un hash (`tab-rating-scales-LY7U7DNM.js`); un
// deploy nuevo borra los archivos del build anterior. Una pestaña que ya
// tenía la app abierta ANTES de ese deploy sigue con el `index.html` viejo
// en memoria y, al navegar a una ruta con carga perezosa, pide un chunk que
// ya no existe -- Vite lo reporta como este mensaje puntual (no un 404 crudo).
// No es un bug de la app: recargar la pestaña trae el `index.html` nuevo
// (fetch real al servidor, no el módulo ya cargado) y el error desaparece.
const CHUNK_LOAD_ERROR_PATTERN = /failed to fetch dynamically imported module|error loading dynamically imported module/i

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return CHUNK_LOAD_ERROR_PATTERN.test(message)
}

// Un solo auto-reload por ventana de tiempo: si el error se repite DENTRO de
// los 15s de haber recargado, ya no es "quedó una pestaña vieja abierta" --
// es un problema real del deploy o de red, y ahí sí hay que mostrar el error
// en vez de recargar en loop silencioso. Pasada la ventana (otro deploy,
// horas después, misma pestaña larga), se vuelve a intentar.
const RELOAD_COOLDOWN_KEY = "chunk-load-error-reload-at"
const RELOAD_COOLDOWN_MS = 15_000

function shouldAutoReload(): boolean {
  const last = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) ?? 0)
  return Date.now() - last > RELOAD_COOLDOWN_MS
}

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const chunkError = isChunkLoadError(error)
  const willAutoReload = chunkError && shouldAutoReload()

  useEffect(() => {
    if (!willAutoReload) return
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()))
    window.location.reload()
    // Solo debe correr una vez, cuando este error puntual aparece -- no en
    // cada re-render (`willAutoReload` no cambia dentro de la misma
    // instancia, pero listarlo deja explícita la dependencia real).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [willAutoReload])

  if (willAutoReload) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">Actualizando la aplicación…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-muted-foreground">
        {error?.message || "Ocurrió un error inesperado."}
      </p>
      <Button size="sm" onClick={reset} className="mt-2">
        Reintentar
      </Button>
    </div>
  )
}
