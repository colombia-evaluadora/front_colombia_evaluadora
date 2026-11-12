import { useEffect, useState } from "react"

import { LoadingLabel } from "@/components/offline/loading-label"

// Pasado este tiempo el mensaje deja de ser genérico: avisa que la espera es
// larga por la conexión y no porque la pantalla se haya trabado.
const SLOW_AFTER_MS = 5000

/**
 * Pantalla de carga para `defaultPendingComponent` del router: spinner con
 * texto que se vuelve un aviso de conexión lenta si la espera se alarga. Sin
 * red, `LoadingLabel` lo reemplaza por el aviso de datos no guardados.
 */
export function PageLoading() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="status"
      aria-busy="true"
      className="flex min-h-[calc(100svh-5.5rem)] min-w-0 flex-1 flex-col items-center justify-center gap-2 p-8 text-center"
    >
      <div className="flex items-center gap-3 text-base font-medium">
        <LoadingLabel>{slow ? "Tu conexión está lenta, sigue cargando…" : "Cargando…"}</LoadingLabel>
      </div>
      {slow && <p className="text-sm text-muted-foreground">No cierres ni recargues la página, puede tardar un poco más.</p>}
    </div>
  )
}
