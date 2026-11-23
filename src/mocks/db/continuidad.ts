// Continuidad automática (Sección 2.16.2), en snake_case como la mandaría el
// back (tarea 15 de pendientes-back.md). Convocatoria 2027 de IE Central.

type Estado = "PREVISTA" | "PENDIENTE_GRUPO" | "CREADA" | "SIN_CONTINUIDAD"

interface Row {
  id: number
  estudiante: string
  documento: string
  origen: string
  especialidad: string
  grado_actual: string
  grado_siguiente: string
  sede_jornada: string
  convocatoria_id: number
  convocatoria_anio: number
  estado: Estado
  motivo: string | null
  grupo: string | null
}

type Base = Pick<Row, "id" | "estudiante" | "documento" | "origen" | "especialidad" | "estado"> & Partial<Row>

const fila = (r: Base): Row => ({
  grado_actual: "Décimo",
  grado_siguiente: "Undécimo",
  sede_jornada: "IE Central · Tarde",
  convocatoria_id: 2,
  convocatoria_anio: 2027,
  motivo: null,
  grupo: null,
  ...r,
})

const filas: Row[] = [
  fila({ id: 1, estudiante: "Valeria Duarte León", documento: "TI 1101234567", origen: "IE Sur", especialidad: "Sistemas", estado: "CREADA", grupo: "11°T1" }),
  fila({ id: 2, estudiante: "Camilo Andrés Rueda Pinto", documento: "TI 1098123456", origen: "IE Norte", especialidad: "Sistemas", estado: "PENDIENTE_GRUPO" }),
  fila({ id: 3, estudiante: "Mateo Camacho Díaz", documento: "TI 1101240011", origen: "IE Norte", especialidad: "Contabilidad", estado: "PREVISTA" }),
  fila({ id: 4, estudiante: "Laura Sofía Niño Ardila", documento: "TI 1101231122", origen: "IE Sur", especialidad: "Contabilidad", estado: "SIN_CONTINUIDAD", motivo: "PRINCIPAL_REPROBADA" }),
  fila({ id: 5, estudiante: "Juan José Pinzón León", documento: "TI 1101250033", origen: "IE Norte", especialidad: "Sistemas", estado: "PENDIENTE_GRUPO" }),
]

export function listarContinuidad(f: {
  search: string | null
  convocatoria: number | null
  estado: string | null
  especialidad: string | null
  pageIndex: number
  pageSize: number
}) {
  const q = f.search?.toLowerCase().trim() ?? ""
  const r = filas
    .filter((x) => !q || `${x.estudiante} ${x.documento}`.toLowerCase().includes(q))
    .filter((x) => f.convocatoria == null || x.convocatoria_id === f.convocatoria)
    .filter((x) => !f.estado || x.estado === f.estado)
    .filter((x) => !f.especialidad || x.especialidad === f.especialidad)
  return r.slice(f.pageIndex * f.pageSize, (f.pageIndex + 1) * f.pageSize).map((x) => ({ ...x, total_count: r.length }))
}

const GRUPOS = [
  { id: 1101, codigo: "11°T1", cupo: 35, libres: 13 },
  { id: 1102, codigo: "11°T2", cupo: 35, libres: 2 },
]

export const gruposContinuidad = (id: number) => (filas.some((x) => x.id === id) ? GRUPOS.filter((g) => g.libres > 0) : [])

export function asignarGrupo(id: number, grupoId: number): { error: string; status: number } | { data: { pk_matricula: number } } {
  const x = filas.find((r) => r.id === id)
  const g = GRUPOS.find((r) => r.id === grupoId)
  if (!x || x.estado !== "PENDIENTE_GRUPO") return { error: "Solo se asigna grupo a un estudiante Pendiente de grupo.", status: 409 }
  if (!g || g.libres <= 0) return { error: "El grupo elegido ya no tiene cupo. Elija otro.", status: 409 }
  g.libres--
  x.estado = "CREADA"
  x.grupo = g.codigo
  return { data: { pk_matricula: 9500 + id } }
}
