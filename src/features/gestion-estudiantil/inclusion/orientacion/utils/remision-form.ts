import { z } from "zod"

/** Secciones de G.1.REP.2 con su pregunta guía (5.2): opcionales; las vacías no salen en el documento. */
export const SECCIONES_REMISION = [
  { name: "fisico", backend: "DESARROLLO_FISICO", label: "Desarrollo físico y psicomotor", guia: "Estado físico (visión, audición, nutrición, peso, talla, cansancio frecuente, sueño) y dificultades de motricidad fina o gruesa o de coordinación." },
  { name: "socioafectivo", backend: "DESARROLLO_SOCIOAFECTIVO", label: "Desarrollo socioafectivo", guia: "Si es sociable, creativo, líder, dinámico, pasivo o agresivo, y cómo maneja sus sentimientos y emociones." },
  { name: "relaciones", backend: "RELACIONES", label: "Relaciones interpersonales", guia: "Cómo se relaciona con sus docentes y sus compañeros." },
  { name: "familiar", backend: "ASPECTO_FAMILIAR", label: "Aspecto familiar", guia: "Lo que conozca de su familia y de sus relaciones familiares." },
  { name: "ideas", backend: "EXPRESION_IDEAS", label: "Expresión de ideas", guia: "Fluidez verbal, pronunciación, vocabulario y articulación al hablar y al escribir; si omite letras o sonidos." },
  { name: "volitivo", backend: "ASPECTO_VOLITIVO", label: "Aspecto volitivo", guia: "Autonomía, voluntad, independencia y toma de decisiones; cómo resuelve sus conflictos." },
  { name: "cognoscitivo", backend: "DESARROLLO_COGNOSCITIVO", label: "Desarrollo cognoscitivo", guia: "Observación, percepción, memoria, integración de conceptos, asociación, comprensión y análisis." },
  { name: "notables", backend: "CARACTERISTICAS", label: "Características notables", guia: "Estabilidad emocional, impulsividad, rebeldía y respeto por las normas." },
  { name: "seguimiento", backend: "SEGUIMIENTO", label: "Seguimiento", guia: "Las estrategias que ha usado con el estudiante." },
  { name: "observaciones", backend: "OBSERVACIONES", label: "Observaciones", guia: "" },
] as const

export const REMISION_VACIA = {
  motivo: "", descripcion: "", fisico: "", socioafectivo: "", relaciones: "", familiar: "", ideas: "", volitivo: "", cognoscitivo: "", notables: "", seguimiento: "", observaciones: "",
}
export type ValoresRemision = typeof REMISION_VACIA

export const esquemaRemision = z.object({
  motivo: z.string().min(1, "El motivo es obligatorio."),
  descripcion: z.string().trim().min(10, "La descripción breve debe tener al menos 10 caracteres."),
  fisico: z.string(), socioafectivo: z.string(), relaciones: z.string(), familiar: z.string(), ideas: z.string(),
  volitivo: z.string(), cognoscitivo: z.string(), notables: z.string(), seguimiento: z.string(), observaciones: z.string(),
})

export function remisionAlBackend(v: ValoresRemision, matricula: number) {
  const secciones = Object.fromEntries(SECCIONES_REMISION.map((s) => [s.backend, v[s.name].trim() || null]))
  return { FK_MATRICULA: matricula, FK_MOTIVO: Number(v.motivo), DESCRIPCION: v.descripcion.trim(), ...secciones }
}
