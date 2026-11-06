import { z } from "zod"

import type { AtencionDetalle } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"

/** Las secciones de ATE.1, en su orden; `trabajo` es la única obligatoria. */
export const SECCIONES = [
  { name: "comportamiento", label: "Comportamiento del estudiante en casa" },
  { name: "relacion", label: "Relación con padres, hermanos u otros familiares" },
  { name: "estrategias", label: "Estrategias disciplinarias de los padres" },
  { name: "trabajo", label: "Trabajo realizado", requerida: true },
  { name: "pruebas", label: "Pruebas aplicadas" },
  { name: "compromisos", label: "Compromisos del estudiante o de los padres" },
  { name: "rec_familia", label: "Recomendaciones al estudiante o a los padres" },
  { name: "rec_docente", label: "Recomendaciones al Responsable de enseñanza" },
] as const

const req = (nombre: string) => z.string().trim().min(1, `${nombre} es obligatorio.`)

export const esquemaAtencion = z.object({
  fecha: req("La fecha"),
  modalidad: req("La modalidad"),
  origen: req("El origen"),
  motivo: req("El motivo"),
  comportamiento: z.string(),
  relacion: z.string(),
  estrategias: z.string(),
  trabajo: req("El trabajo realizado"),
  pruebas: z.string(),
  compromisos: z.string(),
  rec_familia: z.string(),
  rec_docente: z.string(),
  proxima: z.string(),
})
export type ValoresAtencion = z.infer<typeof esquemaAtencion>

export const valoresDesde = (d?: AtencionDetalle, motivo?: number): ValoresAtencion => ({
  fecha: d?.fecha?.slice(0, 10) ?? "",
  modalidad: d?.modalidad.id.toString() ?? "",
  origen: d?.origen.id.toString() ?? "",
  motivo: d?.motivo.id.toString() ?? motivo?.toString() ?? "",
  comportamiento: d?.comportamiento_casa ?? "",
  relacion: d?.relacion_familiares ?? "",
  estrategias: d?.estrategias_disciplinarias ?? "",
  trabajo: d?.trabajo_realizado ?? "",
  pruebas: d?.pruebas_aplicadas ?? "",
  compromisos: d?.compromisos ?? "",
  rec_familia: d?.recomendaciones_familia ?? "",
  rec_docente: d?.recomendaciones_docente ?? "",
  proxima: d?.proxima_cita?.slice(0, 10) ?? "",
})

const nulo = (v: string) => v.trim() || null

export const atencionAlBackend = (v: ValoresAtencion, remision: number | null) => ({
  FECHA: v.fecha,
  FK_MODALIDAD: Number(v.modalidad),
  FK_ORIGEN: Number(v.origen),
  FK_REMISION: remision,
  FK_MOTIVO: Number(v.motivo),
  COMPORTAMIENTO_CASA: nulo(v.comportamiento),
  RELACION_FAMILIARES: nulo(v.relacion),
  ESTRATEGIAS_DISCIPLINARIAS: nulo(v.estrategias),
  TRABAJO_REALIZADO: v.trabajo.trim(),
  PRUEBAS_APLICADAS: nulo(v.pruebas),
  COMPROMISOS: nulo(v.compromisos),
  RECOMENDACIONES_FAMILIA: nulo(v.rec_familia),
  RECOMENDACIONES_DOCENTE: nulo(v.rec_docente),
  PROXIMA_CITA: nulo(v.proxima),
})
