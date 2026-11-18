import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import { matriculaDb } from "@/mocks/db/matricula"

// Matrícula complementaria del estudiante propio (Sección 2.16, C.1.COM.1).
// Variedad fija por pk:
// - Principal con complementaria: pk % 3 === 0 (IE Central · Mañana · Sistemas).
// - Fila complementaria: pk % 13 === 0 sin ser múltiplo de 3; por adscripción si además es par.
// - Ninguna sede ofrece su especialidad en otra jornada: pk % 4 === 2.
// Las que se agregan en la sesión quedan en `creadas` y en `matriculaDb`.

const JORNADAS = ["Mañana", "Tarde", "Noche"]
const ESPECIALIDADES = ["Sistemas", "Electricidad", "Contabilidad"]

const creadas = new Map<number, { sede: string; jornada: string; especialidad: string }>()
const filasComplementarias = new Set<number>()

export const especialidadDe = (pk: number) => ESPECIALIDADES[pk % ESPECIALIDADES.length]

export function tipoDe(pk: number): "PRINCIPAL" | "COMPLEMENTARIA" {
  return filasComplementarias.has(pk) || (pk % 13 === 0 && pk % 3 !== 0) ? "COMPLEMENTARIA" : "PRINCIPAL"
}

export const origenAdscripcionDe = (pk: number) =>
  tipoDe(pk) === "COMPLEMENTARIA" && !filasComplementarias.has(pk) && pk % 2 === 0 ? "IE San José" : null

/** La complementaria de una principal, o null. */
export function complementariaDe(pk: number) {
  if (tipoDe(pk) === "COMPLEMENTARIA") return null
  return creadas.get(pk) ?? (pk % 3 === 0 ? { sede: "IE Central", jornada: "Mañana", especialidad: "Sistemas" } : null)
}

export const puedeAgregarComplementaria = (m: Matricula) =>
  m.status === "Cursando" && tipoDe(Number(m.id)) === "PRINCIPAL" && !complementariaDe(Number(m.id)) && Number(m.id) % 4 !== 2

const letra = (jornada: string) => jornada.charAt(0).toUpperCase()

function opciones(m: Matricula) {
  const pk = Number(m.id)
  const otras = JORNADAS.filter((j) => j !== m.shift)
  return ["IE Central", "Sede Norte"].map((sede, s) => ({
    id: s + 1,
    nombre: sede,
    periodos: otras.map((jornada, j) => ({
      id: (s + 1) * 10 + j + 1,
      label: `2027 · ${jornada} · Anual · Ciclo 1`,
      jornada,
      comprometidos: (pk + j) % 5,
      grupos: [1, 2, 3]
        .map((n) => {
          const libres = (pk + n * 7 + j + s) % 9
          return {
            id: (s + 1) * 1000 + (j + 1) * 100 + n,
            codigo: `${m.grade}°${letra(jornada)}${n}`,
            cupo: 35,
            libres,
          }
        })
        // Solo grupos con cupo, cuyo horario incluye la especialidad (Reglas 2 y 80).
        .filter((g) => g.libres > 0),
    })),
  }))
}

export function previaComplementaria(pk: number) {
  const m = matriculaDb.find((r) => Number(r.id) === pk)
  if (!m) return { error: "No se encontró la matrícula.", status: 404 as const }
  if (!puedeAgregarComplementaria(m))
    return {
      error: complementariaDe(pk)
        ? `${m.firstName} ${m.lastName} ya tiene matrícula complementaria.`
        : "Ninguna sede ofrece su grado y especialidad en otra jornada.",
      status: 409 as const,
    }
  return {
    data: {
      establecimiento: m.institution,
      especialidad: especialidadDe(pk),
      sedes: opciones(m),
    },
  }
}

export function agregarComplementaria(pk: number, sedeId: number, periodoId: number, grupoId: number) {
  const previa = previaComplementaria(pk)
  if ("error" in previa) return previa
  const sede = previa.data.sedes.find((s) => s.id === sedeId)
  const periodo = sede?.periodos.find((p) => p.id === periodoId)
  const grupo = periodo?.grupos.find((g) => g.id === grupoId)
  if (!sede || !periodo || !grupo) return { error: "El grupo elegido ya no tiene cupo. Elija otro.", status: 409 as const }

  const principal = matriculaDb.find((r) => Number(r.id) === pk) as Matricula
  const nuevoId = Math.max(...matriculaDb.map((r) => Number(r.id))) + 1
  matriculaDb.unshift({
    ...principal,
    id: String(nuevoId),
    campus: sede.nombre,
    shift: periodo.jornada,
    group: grupo.codigo,
    enrollmentDate: new Date().toISOString(),
    hasGrades: false,
  })
  filasComplementarias.add(nuevoId)
  creadas.set(pk, { sede: sede.nombre, jornada: periodo.jornada, especialidad: previa.data.especialidad })
  return { data: { pk_matricula: nuevoId } }
}
