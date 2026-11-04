import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import type { SesionDetalle } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { descargarActa } from "@/features/gestion-estudiantil/convivencia/api/descargar-reportes"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"

/** Acta en PDF y navegación del detalle de una sesión (G.2.COM.SES.4). */
export function useSesionDetalle(sesion: SesionDetalle, periodo: number | undefined) {
  const { notify } = useNotify()
  const nav = useComiteNavegacion()
  const [descargando, setDescargando] = useState(false)

  async function descargar() {
    setDescargando(true)
    try {
      await descargarActa(sesion.id)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setDescargando(false)
    }
  }

  return {
    descargando,
    descargar,
    volver: () => nav.aPestana(periodo),
  }
}
