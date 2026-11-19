import { matriculaDb } from "@/mocks/db/matricula"

// Reactivar (Sección 4.4, Regla 15). Variedad fija por pk:
// - Promovida/Reubicada: la matrícula nueva del cambio de grado tiene registros propios si pk es par.
// - Aprobada/Reprobada: ya tiene matrícula en el período siguiente si pk % 4 === 0 (bloquea).
// - Aprobada con «Promovido con áreas pendientes» si pk % 6 === 0 (bloquea).
// - Período cerrado si pk % 9 === 0 (bloquea).

const CAMBIO_GRADO = ["Promovido", "Promovido Anticipadamente", "Reubicado"]

export function previaReactivar(pk: number) {
  const m = matriculaDb.find((x) => Number(x.id) === pk)
  if (!m) return null
  const cambioGrado = CAMBIO_GRADO.includes(m.status)
  return {
    estado: m.status,
    periodo_abierto: pk % 9 !== 0,
    promovido_areas_pendientes: m.status === "Aprobado" && pk % 6 === 0,
    tiene_matricula_siguiente: !cambioGrado && pk % 4 === 0,
    matricula_siguiente:
      !cambioGrado && pk % 4 === 0 ? { periodo: "2027", grado: m.grade + 1, grupo: `${m.grade + 1}°A`, estado: "Cursando" } : null,
    tiene_complementaria: pk % 3 === 0,
    matricula_nueva: cambioGrado
      ? {
          grado: m.grade + 1,
          grupo: `${m.grade + 1}°A`,
          registros_propios: pk % 2 === 0,
          registros: pk % 2 === 0 ? { actividades: 6, clases: 18 } : null,
        }
      : null,
  }
}

/** Devuelve el error, o null si reactivó. */
export function reactivar(pk: number, motivo: string, decision: string | null): string | null {
  const previa = previaReactivar(pk)
  if (!previa) return "La matrícula no existe."
  if (!previa.periodo_abierto) return "Solo se reactiva con el Período Académico Abierto."
  if (previa.promovido_areas_pendientes)
    return "La matrícula tiene la marca Promovido con áreas pendientes: primero anule la promoción."
  if (previa.tiene_matricula_siguiente)
    return "No se puede reactivar la matrícula porque el estudiante ya tiene matrícula en el período siguiente."
  if (motivo.trim().length < 10 || motivo.trim().length > 500) return "El motivo debe tener entre 10 y 500 caracteres."
  if (previa.matricula_nueva?.registros_propios && decision !== "HOMOLOGAR" && decision !== "DESCARTAR")
    return "Elija qué hacer con los registros de la matrícula nueva."
  const m = matriculaDb.find((x) => Number(x.id) === pk)
  if (m) m.status = "Cursando"
  return null
}
