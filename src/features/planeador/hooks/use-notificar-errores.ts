import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

/**
 * Muestra en el aviso de la pantalla el primer error de un grupo de
 * consultas. Las páginas del Planeador montan un `NoticeProvider`, que
 * suprime el toast global de axios: sin esto un rechazo del backend al mirar
 * el planeador de otro docente (42501, docente fuera del alcance del
 * usuario) pasaría en silencio en las consultas que no pintan su propio
 * error (pestañas, cards de resumen, calendario).
 */
export function useNotificarErrores(errors: readonly (unknown | null | undefined)[]) {
  const { notify } = useNotify()
  const error = errors.find((e) => e != null) ?? null
  React.useEffect(() => {
    if (error) notify(getErrorMessage(error), { variant: "error" })
  }, [error, notify])
}
