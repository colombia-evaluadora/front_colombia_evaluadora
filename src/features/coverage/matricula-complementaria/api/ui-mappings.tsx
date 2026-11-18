import { Badge } from "@/components/ui/badge"

import type {
  CupoConvocatoria,
  Desempate,
  EstadoContinuidad,
  EstadoConvenio,
  EstadoConvocatoria,
  EstadoOpcion,
  FormaPostulacion,
  ModoSeleccion,
  MotivoSinContinuidad,
} from "@/features/coverage/matricula-complementaria/api/types"

type Color = "muted" | "info" | "warning" | "success" | "destructive" | "secondary"

export const ESTADO_CONVOCATORIA: Record<EstadoConvocatoria, { label: string; color: Color }> = {
  PROGRAMADA: { label: "Programada", color: "muted" },
  EN_POSTULACION: { label: "En postulación", color: "info" },
  EN_SELECCION: { label: "En selección", color: "warning" },
  PUBLICADA: { label: "Publicada", color: "success" },
  CERRADA: { label: "Cerrada", color: "muted" },
}

export const ESTADO_OPCION: Record<EstadoOpcion, { label: string; color: Color }> = {
  INSCRITO: { label: "Inscrito", color: "info" },
  REGISTRADO: { label: "Registrado", color: "success" },
  ADSCRITO: { label: "Adscrito", color: "success" },
  EN_LISTA_ESPERA: { label: "En lista de espera", color: "warning" },
  DESCARTADA: { label: "Descartada", color: "destructive" },
  NO_SELECCIONADA: { label: "No seleccionada", color: "muted" },
  ANULADA: { label: "Anulada", color: "muted" },
  RETIRADA: { label: "Retirada", color: "muted" },
}

export const ESTADO_CONVENIO: Record<EstadoConvenio, { label: string; color: Color }> = {
  PROPUESTO: { label: "Propuesto", color: "warning" },
  ACEPTADO: { label: "Aceptado", color: "success" },
  RECHAZADO: { label: "Rechazado", color: "destructive" },
  FINALIZADO: { label: "Finalizado", color: "muted" },
}

export const ESTADO_CONTINUIDAD: Record<EstadoContinuidad, { label: string; color: Color }> = {
  PREVISTA: { label: "Prevista", color: "info" },
  PENDIENTE_GRUPO: { label: "Pendiente de grupo", color: "warning" },
  CREADA: { label: "Creada", color: "success" },
  SIN_CONTINUIDAD: { label: "Sin continuidad", color: "destructive" },
}

export const MOTIVO_SIN_CONTINUIDAD: Record<MotivoSinContinuidad, string> = {
  PRINCIPAL_REPROBADA: "Principal reprobada",
  COMPLEMENTARIA_REPROBADA: "Complementaria reprobada",
  PRINCIPAL_RETIRADA: "Principal retirada",
  SIN_CONVENIO: "Sin convenio del año siguiente",
}

export const FORMA_LABEL: Record<FormaPostulacion, string> = {
  ABIERTA: "Abierta",
  ORIGEN: "Por el establecimiento de origen",
}
export const MODO_LABEL: Record<ModoSeleccion, string> = { MANUAL: "Manual", AUTOMATICA: "Automática" }
export const DESEMPATE_LABEL: Record<Desempate, string> = { SORTEO: "Sorteo", ORDEN: "Orden de inscripción" }

export function Marca({ label, color }: { label: string; color: Color }) {
  return (
    <Badge
      variant={color === "muted" ? "outline" : "soft"}
      color={color}
      className="rounded-full text-xs font-medium tracking-normal"
    >
      {label}
    </Badge>
  )
}

/** «IE Central · Tarde · Décimo · Sistemas». */
export const nombreCupo = (c: Pick<CupoConvocatoria, "sede" | "jornada" | "grado" | "especialidad">) =>
  `${c.sede} · ${c.jornada} · ${c.grado} · ${c.especialidad}`

/** yyyy-MM-dd → dd/MM/yyyy. */
export const fecha = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—")

/** yyyy-MM-ddTHH:mm → dd/MM/yyyy HH:mm. */
export const fechaHora = (iso: string) => `${fecha(iso)} ${iso.slice(11, 16)}`.trim()

/** «01/02 – 15/02/2027». */
export const rango = (desde: string, hasta: string) => `${fecha(desde).slice(0, 5)} – ${fecha(hasta)}`
