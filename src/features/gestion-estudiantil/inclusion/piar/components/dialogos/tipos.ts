import type { ActividadFamiliar, Ajuste, Cobertura, Participante, PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"
import type { CampoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"

export type Dialogo =
  | { tipo: "cobertura"; fila: Cobertura }
  | { tipo: "ajuste"; ajuste?: Ajuste }
  | { tipo: "quitarAjuste"; ajuste: Ajuste }
  | { tipo: "asignar"; ajuste: Ajuste; indice: number }
  | { tipo: "seguimiento"; ajuste: Ajuste }
  | { tipo: "evidencia"; ajuste?: Ajuste }
  | { tipo: "actividad"; actividad?: ActividadFamiliar }
  | { tipo: "resultado"; actividad: ActividadFamiliar }
  | { tipo: "participante"; fila?: Participante }
  | { tipo: "red" }
  | { tipo: "informes" }
  | { tipo: "antecedente" }
  | { tipo: "externo" }
  | { tipo: "acta" }
  | { tipo: "bloqueos" }
  | { tipo: "cerrar" }
  | { tipo: "anular" }
  | { tipo: "concluir" }
  | { tipo: "nuevaVersion" }
  | { tipo: "actualizar" }
  | { tipo: "copia" }
  | { tipo: "emitir" }

export interface DialogoProps {
  piar: PiarDetalle
  dialogo: Dialogo
  onClose: () => void
}

export const nulo = (v: string | undefined) => v || null
export const texto = (name: string, label: string, max: number, extra: Partial<CampoPiar> = {}): CampoPiar => ({ name, label, kind: "area", max, ...extra })
