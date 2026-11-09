import { z } from "zod"

import type { PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

export const CAMPOS_VACIOS = {
  fecha: "",
  gustos: "",
  expectativas_estudiante: "",
  fuente_estudiante: "",
  expectativas_familia: "",
  fuente_familia: "",
  fortalezas: "",
  barreras: "",
  apoyos: "",
  productos: "",
  valoracion: "",
}
export type CamposDatos = typeof CAMPOS_VACIOS

const obligatorio = (nombre: string) => z.string().trim().min(1, `${nombre} es obligatorio.`)
const minimo10 = (nombre: string) => z.string().trim().min(10, `${nombre} debe tener al menos 10 caracteres.`)

export const esquemaDatos = z.object({
  fecha: obligatorio("La fecha de elaboración"),
  gustos: z.string(),
  expectativas_estudiante: z.string(),
  fuente_estudiante: z.string(),
  expectativas_familia: z.string(),
  fuente_familia: z.string(),
  fortalezas: minimo10("Fortalezas y habilidades"),
  barreras: minimo10("Barreras para aprender y participar"),
  apoyos: z.string(),
  productos: z.string(),
  valoracion: minimo10("La valoración pedagógica"),
})

const nulo = (v: string) => v.trim() || null

export const datosAlBackend = (v: CamposDatos) => ({
  FECHA_ELABORACION: v.fecha,
  GUSTOS: nulo(v.gustos),
  EXPECTATIVAS_ESTUDIANTE: nulo(v.expectativas_estudiante),
  FUENTE_ESTUDIANTE: nulo(v.fuente_estudiante),
  EXPECTATIVAS_FAMILIA: nulo(v.expectativas_familia),
  FUENTE_FAMILIA: nulo(v.fuente_familia),
  FORTALEZAS: nulo(v.fortalezas),
  BARRERAS: nulo(v.barreras),
  APOYOS: nulo(v.apoyos),
  PRODUCTOS: nulo(v.productos),
  VALORACION: nulo(v.valoracion),
})

export const datosDesdePiar = (p: PiarDetalle): CamposDatos => ({
  fecha: p.fecha_elaboracion?.slice(0, 10) ?? "",
  gustos: p.voz?.gustos_intereses ?? "",
  expectativas_estudiante: p.voz?.expectativas_estudiante ?? "",
  fuente_estudiante: p.voz?.fuente_expectativas_estudiante ?? "",
  expectativas_familia: p.voz?.expectativas_familia ?? "",
  fuente_familia: p.voz?.fuente_expectativas_familia ?? "",
  fortalezas: p.caracterizacion?.fortalezas ?? "",
  barreras: p.caracterizacion?.barreras ?? "",
  apoyos: p.caracterizacion?.apoyos_utiles ?? "",
  productos: p.caracterizacion?.productos_apoyo ?? "",
  valoracion: p.valoracion_pedagogica ?? "",
})
