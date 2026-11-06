import { lazy, Suspense } from "react"

import type { Dialogo, DialogoProps } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"

// Un chunk por grupo: la ficha abre sin pedir catálogos ni código de modales que quizá nadie use.
const GRUPOS = {
  ajustes: lazy(() => import("@/features/gestion-estudiantil/inclusion/piar/components/dialogos/dialogos-ajustes").then((m) => ({ default: m.DialogosAjustes }))),
  expediente: lazy(() => import("@/features/gestion-estudiantil/inclusion/piar/components/dialogos/dialogos-expediente").then((m) => ({ default: m.DialogosExpediente }))),
  acta: lazy(() => import("@/features/gestion-estudiantil/inclusion/piar/components/dialogos/dialogos-acta").then((m) => ({ default: m.DialogosActa }))),
  ciclo: lazy(() => import("@/features/gestion-estudiantil/inclusion/piar/components/dialogos/dialogos-ciclo").then((m) => ({ default: m.DialogosCiclo }))),
}
const GRUPO_DE: Record<Dialogo["tipo"], keyof typeof GRUPOS> = { cobertura: "ajustes", ajuste: "ajustes", quitarAjuste: "ajustes", asignar: "ajustes", seguimiento: "ajustes", evidencia: "ajustes", actividad: "expediente", resultado: "expediente", red: "expediente", informes: "expediente", antecedente: "expediente", externo: "expediente", participante: "acta", acta: "acta", bloqueos: "acta", copia: "acta", actualizar: "acta", cerrar: "ciclo", anular: "ciclo", concluir: "ciclo", nuevaVersion: "ciclo", emitir: "ciclo" }

/** Monta solo el grupo del modal abierto (AJU, CIC y ENT). */
export function DialogosPiar({ piar, dialogo, onClose }: Omit<DialogoProps, "dialogo"> & { dialogo: Dialogo | null }) {
  if (!dialogo) return null
  const Grupo = GRUPOS[GRUPO_DE[dialogo.tipo]]
  return (
    <Suspense fallback={null}>
      <Grupo piar={piar} dialogo={dialogo} onClose={onClose} />
    </Suspense>
  )
}
