import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import type { ResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"

/**
 * Resultado común de los modales de etapa: al éxito muestra el mensaje del backend y cierra;
 * al error lo guarda para el banner del modal.
 */
export function useResultadoEtapa(onClose: () => void, mensajePorDefecto: string | ((r: ResultadoEtapa) => string)) {
  const { notify } = useNotify()
  const [error, setError] = useState<unknown>(null)
  const mutationConfig = useMemo(
    () => ({
      onSuccess: (r: ResultadoEtapa) => {
        notify(r.mensaje || (typeof mensajePorDefecto === "function" ? mensajePorDefecto(r) : mensajePorDefecto), { variant: "success" })
        onClose()
      },
      onError: (e: Error) => setError(e),
    }),
    [notify, onClose, mensajePorDefecto],
  )
  return { error, mutationConfig }
}
