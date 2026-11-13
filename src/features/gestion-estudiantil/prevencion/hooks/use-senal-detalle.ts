import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useValorarSenal } from "@/features/gestion-estudiantil/prevencion/api/mutations/salud-mental"
import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useDialogosSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/use-dialogos-salud-mental"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import {
  esSeveridadCritica,
  validarValoracionSM,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-salud-mental"

/** Formulario de valoración (G.8.SAL.4-5), advertencia crítica, modales de atención/cierre y navegación del detalle. */
export function useSenalDetalle(senal: SenalSMDetalle) {
  const { notify } = useNotify()
  const { volver } = useNavegacionPrevencion()
  const s = useEstadoDialogo()
  const dialogos = useDialogosSaludMental()
  const severidades = useCatalogo("SEVERIDAD_SENAL")

  const [severidad, setSeveridad] = useState(
    () => severidades.find((o) => o.codigo === senal.severidad_valor)?.value ?? "",
  )
  const [notas, setNotas] = useState("")
  const [advertir, setAdvertir] = useState(false)

  const severidadOpciones = useMemo(() => severidades.map((o) => ({ value: o.value, label: o.label })), [severidades])
  const errores = validarValoracionSM({ severidad, notas })
  const error = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const mut = useValorarSenal({
    mutationConfig: {
      onSuccess: () => {
        notify("Valoración guardada.", { variant: "success" })
        setAdvertir(false)
        setNotas("")
        s.setIntento(false)
      },
      onError: (e: Error) => {
        setAdvertir(false)
        s.setError(e)
      },
    },
  })

  const enviar = () =>
    mut.mutate({ id: senal.id, FK_SEVERIDAD: Number(severidad), NOTAS: notas })

  /** Guardar: Crítico o Vital piden confirmar antes de enviar (G.8.SAL.5). */
  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    if (esSeveridadCritica(codigoDe(severidades, severidad))) setAdvertir(true)
    else enviar()
  }

  return {
    volver,
    severidad,
    setSeveridad,
    notas,
    setNotas,
    severidadOpciones,
    error,
    errorBackend: s.error,
    pending: mut.isPending,
    guardar,
    advertir,
    confirmarCritica: enviar,
    cancelarCritica: () => setAdvertir(false),
    abrirAtencion: () => dialogos.abrir({ dialogo: "atencion", senal }),
    abrirCierre: () => dialogos.abrir({ dialogo: "cerrar", senal }),
    dialogos: dialogos.dialogos,
  }
}
