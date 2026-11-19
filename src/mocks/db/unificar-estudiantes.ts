import { matriculaDb } from "@/mocks/db/matricula"

// Registros de estudiante para Unificar (Regla 72). El estudiante de cada
// matrícula usa el mismo pk que ella (como `toRawMatriculaDetail`). Cada 7.ª
// matrícula tiene un duplicado con NES; en la de cada 14.ª el duplicado también
// está Cursando en el mismo período, para ver el bloqueo.

interface EstudianteRow {
  pk_testudiante: number
  tipo_documento: string
  identificacion: string
  nombre: string
  cursando_periodo_id: number | null
  cursando_periodo: string | null
  cursando_establecimiento: string | null
  cursando_grupo: string | null
  matriculas: number
  reservas: number
  establecimientos: string[]
}

const unificados = new Map<number, string>()
const DUPLICADO_OFFSET = 50000

function filaDeMatricula(m: (typeof matriculaDb)[number]): EstudianteRow {
  const cursando = m.status === "Cursando"
  return {
    pk_testudiante: Number(m.id),
    tipo_documento: "TI",
    identificacion: m.documentNumber,
    nombre: `${m.firstName} ${m.lastName}`,
    cursando_periodo_id: cursando ? 1 : null,
    cursando_periodo: cursando ? "2026" : null,
    cursando_establecimiento: cursando ? m.institution : null,
    cursando_grupo: cursando ? m.group : null,
    matriculas: 1,
    reservas: 0,
    establecimientos: [m.institution],
  }
}

function estudiantes(): EstudianteRow[] {
  const filas: EstudianteRow[] = []
  for (const m of matriculaDb) {
    const pk = Number(m.id)
    filas.push(filaDeMatricula(m))
    if (pk % 7 === 0) {
      const bloqueado = pk % 14 === 0 && m.status === "Cursando"
      // Unos en el mismo colegio (sin aviso a otro) y otros en IE Norte.
      const otroColegio = pk % 3 === 0
      const colegio = bloqueado ? m.institution : otroColegio ? "IE Norte" : m.institution
      filas.push({
        pk_testudiante: pk + DUPLICADO_OFFSET,
        tipo_documento: "NES",
        identificacion: `${m.documentNumber.slice(0, 6)}NES`,
        nombre: `${m.firstName} ${m.lastName}`,
        cursando_periodo_id: bloqueado ? 1 : null,
        cursando_periodo: bloqueado ? "2026" : null,
        cursando_establecimiento: bloqueado ? colegio : null,
        cursando_grupo: bloqueado ? m.group : null,
        matriculas: 1,
        reservas: otroColegio ? 0 : 1,
        establecimientos: [colegio],
      })
    }
  }
  return filas.filter((f) => !unificados.has(f.pk_testudiante))
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

export function buscarEstudiantes(q: string): EstudianteRow[] {
  const texto = normalizar(q.trim())
  if (texto.length < 3) return []
  return estudiantes()
    .filter((e) => e.identificacion.includes(texto) || normalizar(e.nombre).includes(texto))
    .slice(0, 8)
}

/** Devuelve el error, o los registros movidos. */
export function unificar(conservaId: number, duplicadoId: number, motivo: string): { error: string } | { registrosMovidos: number } {
  const todos = estudiantes()
  const conserva = todos.find((e) => e.pk_testudiante === conservaId)
  const duplicado = todos.find((e) => e.pk_testudiante === duplicadoId)
  if (!conserva || !duplicado) return { error: "El estudiante no existe o ya fue unificado." }
  if (conservaId === duplicadoId) return { error: "El estudiante duplicado debe ser distinto del que se conserva." }
  if (motivo.trim().length < 10) return { error: "El motivo debe tener entre 10 y 500 caracteres." }
  if (
    conserva.cursando_periodo_id != null &&
    conserva.cursando_periodo_id === duplicado.cursando_periodo_id
  ) {
    return {
      error:
        "Los dos registros tienen matrícula Cursando en el mismo período. Retire o anule una de las dos antes de unificar.",
    }
  }
  unificados.set(duplicadoId, conserva.identificacion)
  return { registrosMovidos: duplicado.matriculas + duplicado.reservas }
}
