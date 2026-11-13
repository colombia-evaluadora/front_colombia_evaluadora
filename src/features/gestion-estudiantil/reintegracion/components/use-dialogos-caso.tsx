import { useCallback, useState } from "react"

import type { AccionCaso } from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"
import { DialogoAprobarReingreso } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-aprobar-reingreso"
import { DialogoActa } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-acta"
import { DialogoAsignar } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-asignar"
import { DialogoCerrar } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-cerrar"
import { DialogoConCaso } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-con-caso"
import { DialogoEstado } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-estado"
import { DialogoIntervencion } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-intervencion"
import { DialogoModificar } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-modificar"
import { DialogoRemision } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-remision"
import { DialogoSimpade } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-simpade"
import { DialogoValidar } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/dialogo-validar"
import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"

/** Acciones que abren un modal; «ver» y «convivencia» navegan a su pantalla. */
type AccionModal = Exclude<AccionCaso, "ver" | "convivencia">

const TITULO: Record<AccionModal, string> = {
  modificar: "Modificar",
  asignar: "Asignar",
  intervencion: "Registrar intervención",
  estado: "Cambiar estado",
  validar: "Validar caso",
  aprobar: "Aprobar reingreso",
  acta: "Generar acta de retiro",
  simpade: "Marcar como ingresado al SIMPADE",
  remitir: "Remitir",
  cerrar: "Cerrar el caso",
}

/**
 * Un solo modal de operación abierto a la vez; lo comparten la bandeja y el detalle. `abrir(accion, casoId)`
 * monta el diálogo de la acción con el caso cargado; Ver caso y Abrir caso de convivencia navegan.
 */
export function useDialogosCaso() {
  const [abierto, setAbierto] = useState<{ accion: AccionModal; casoId: number } | null>(null)
  const { irCaso, irAbrirConvivencia } = useNavegacionReintegracion()
  const cerrar = useCallback(() => setAbierto(null), [])

  const abrir = useCallback(
    (accion: AccionCaso, casoId: number) => {
      if (accion === "ver") irCaso(casoId)
      else if (accion === "convivencia") irAbrirConvivencia(casoId)
      else setAbierto({ accion, casoId })
    },
    [irCaso, irAbrirConvivencia],
  )

  const d = abierto
  return {
    abrir,
    dialogos: d && (
      <DialogoConCaso casoId={d.casoId} titulo={TITULO[d.accion]} onClose={cerrar}>
        {(caso) => {
          switch (d.accion) {
            case "modificar":
              return <DialogoModificar caso={caso} onClose={cerrar} />
            case "asignar":
              return <DialogoAsignar caso={caso} onClose={cerrar} />
            case "intervencion":
              return <DialogoIntervencion caso={caso} onClose={cerrar} />
            case "estado":
              return <DialogoEstado caso={caso} onClose={cerrar} />
            case "validar":
              return <DialogoValidar caso={caso} onClose={cerrar} />
            case "aprobar":
              return <DialogoAprobarReingreso caso={caso} onClose={cerrar} />
            case "acta":
              return <DialogoActa caso={caso} onClose={cerrar} />
            case "simpade":
              return <DialogoSimpade caso={caso} onClose={cerrar} />
            case "remitir":
              return <DialogoRemision caso={caso} onClose={cerrar} />
            case "cerrar":
              return <DialogoCerrar caso={caso} onClose={cerrar} onIrCaso={irCaso} />
          }
        }}
      </DialogoConCaso>
    ),
  }
}
