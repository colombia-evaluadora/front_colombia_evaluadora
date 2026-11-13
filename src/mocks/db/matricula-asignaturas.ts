// Bloque 15 (asignaturas matriculadas) por matrícula. Mismas filas que
// fn_matricula_asignaturas_listar: la media técnica viene repetida en cada fila.

interface AsignaturaRow {
  fk_tasignatura: number
  asignatura: string
  matricula_obligatoria: "S" | "N"
  matriculada: "S" | "N"
  cursa_externa: "S" | "N"
  tiene_registros: boolean
  media_tecnica_externa: "S" | "N"
  institucion_externa: string | null
}

const PLAN: { id: number; nombre: string; obligatoria: boolean }[] = [
  { id: 9001, nombre: "Matemáticas", obligatoria: true },
  { id: 9002, nombre: "Dibujo técnico", obligatoria: false },
  { id: 9003, nombre: "Electricidad básica", obligatoria: false },
  { id: 9004, nombre: "Educación física", obligatoria: true },
]

interface Estado {
  media: boolean
  institucion: string | null
  filas: Map<number, { matriculada: boolean; externa: boolean; registros: boolean }>
}

const porMatricula = new Map<string, Estado>()

function estadoDe(matriculaId: string): Estado {
  let estado = porMatricula.get(matriculaId)
  if (!estado) {
    estado = {
      media: false,
      institucion: null,
      // Electricidad básica ya tiene notas: no se desmatricula ni cambia "externa".
      filas: new Map(PLAN.map((a) => [a.id, { matriculada: true, externa: false, registros: a.id === 9003 }])),
    }
    porMatricula.set(matriculaId, estado)
  }
  return estado
}

export function asignaturasDeMatricula(matriculaId: string): AsignaturaRow[] {
  const estado = estadoDe(matriculaId)
  return PLAN.map((a) => {
    const fila = estado.filas.get(a.id) ?? { matriculada: false, externa: false, registros: false }
    return {
      fk_tasignatura: a.id,
      asignatura: a.nombre,
      matricula_obligatoria: a.obligatoria ? "S" : "N",
      matriculada: fila.matriculada ? "S" : "N",
      cursa_externa: fila.externa ? "S" : "N",
      tiene_registros: fila.registros,
      media_tecnica_externa: estado.media ? "S" : "N",
      institucion_externa: estado.institucion,
    }
  })
}

export function asignaturasPlan(): AsignaturaRow[] {
  return PLAN.map((a) => ({
    fk_tasignatura: a.id,
    asignatura: a.nombre,
    matricula_obligatoria: a.obligatoria ? "S" : "N",
    matriculada: a.obligatoria ? "S" : "N",
    cursa_externa: "N",
    tiene_registros: false,
    media_tecnica_externa: "N",
    institucion_externa: null,
  }))
}

export interface GuardarAsignaturasBody {
  MEDIA_TECNICA_EXTERNA: "S" | "N"
  INSTITUCION_EXTERNA: string | null
  ASIGNATURAS: { id: number; matriculada: boolean; externa: "S" | "N" }[]
}

/** Devuelve el mensaje de error, o null si guardó. */
export function guardarAsignaturas(matriculaId: string, body: GuardarAsignaturasBody): string | null {
  const estado = estadoDe(matriculaId)
  const media = body.MEDIA_TECNICA_EXTERNA === "S"
  if (media && !body.INSTITUCION_EXTERNA?.trim()) return "Indique la institución externa de la media técnica."
  for (const cambio of body.ASIGNATURAS) {
    const plan = PLAN.find((a) => a.id === cambio.id)
    const fila = estado.filas.get(cambio.id)
    if (!fila) continue
    if (!plan || !fila) return "La asignatura no está en el plan de estudio del grado."
    if (!cambio.matriculada && plan.obligatoria) return `${plan.nombre} es obligatoria y no se puede desmatricular.`
    if (fila.registros && (!cambio.matriculada || (cambio.externa === "S") !== fila.externa))
      return `${plan.nombre} ya tiene notas del estudiante.`
  }
  estado.media = media
  estado.institucion = media ? (body.INSTITUCION_EXTERNA ?? "").trim() : null
  for (const cambio of body.ASIGNATURAS) {
    const fila = estado.filas.get(cambio.id)
    if (!fila) continue
    fila.matriculada = cambio.matriculada
    fila.externa = cambio.externa === "S"
  }
  // Sin media técnica nada se cursa afuera.
  if (!media) for (const fila of estado.filas.values()) fila.externa = false
  return null
}
