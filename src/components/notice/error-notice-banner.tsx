import { useState } from "react"

import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"

/**
 * Error del backend (mutación o carga) como banner rojo, igual que el resto de
 * la app, en lugar de un `<p className="text-red">` suelto. Pensado para
 * diálogos y paneles sin un `NoticeProvider` propio (en páginas con provider,
 * preferí `notify(getErrorMessage(error), { variant: "error" })`).
 *
 * Cerrar el banner lo oculta solo para ESE error: si la acción vuelve a fallar
 * (otro objeto de error), se muestra de nuevo; así no hace falta `reset()` de
 * la mutación. Los errores de validación de campo siguen en `FieldError`.
 */
export function ErrorNoticeBanner({
  error,
  fallback,
  action,
  className,
}: {
  /** `null`/`undefined`/`false` = sin error. */
  error: unknown
  /** Mensaje cuando el error no es un `Error` (p. ej. `true` para "falló sin detalle"). */
  fallback?: string
  /** Botón junto al mensaje (p. ej. "Reintentar"). */
  action?: Notice["action"]
  className?: string
}) {
  const [descartado, setDescartado] = useState<unknown>(null)
  const visible = error != null && error !== false && error !== descartado
  const message = error instanceof Error || !fallback ? getErrorMessage(error) : fallback
  return (
    <NoticeBanner
      notice={visible ? { id: 0, message, action } : null}
      onClose={() => setDescartado(error)}
      variant="error"
      className={className}
    />
  )
}
