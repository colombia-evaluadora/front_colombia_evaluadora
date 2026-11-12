import type { QueryClient } from "@tanstack/react-query"

const all = ["matricula"] as const
const listaAll = [...all, "lista"] as const
// Cuelga de la lista: responder o anular la refresca con invalidarMatriculas.
const solicitudesPendientes = () => [...listaAll, "solicitudes-pendientes"] as const
const detalleAll = [...all, "detail"] as const

// Los catálogos cuelgan de `all` pero no de lista/detalle: mutar una matrícula no los toca.
export const matriculaKeys = {
  all,
  lista: <P>(params: P) => [...listaAll, params] as const,
  solicitudesPendientes,
  detalle: (id: number | string | undefined) => [...detalleAll, id] as const,
  campuses: () => [...all, "campuses"] as const,
  gradosPorPeriodo: (periodoId: number | null | undefined) => [...all, "grados-por-periodo", periodoId] as const,
  gruposPorGrado: (gradoId: number | null | undefined, shift: string | null | undefined) =>
    [...all, "grupos-por-grado", gradoId, shift] as const,
  fieldConfigAll: [...all, "field-config"] as const,
  fieldConfig: (establecimientoId: number | null = null) => [...all, "field-config", establecimientoId] as const,
  periodoResolver: (sedeId: number | null, jornadaId: number | null) =>
    [...all, "periodo-resolver", sedeId, jornadaId] as const,
  /** Cuelga del detalle: invalidar la matrícula también las refresca. */
  asignaturas: (id: number | string | undefined) => [...detalleAll, id, "asignaturas"] as const,
  notasHomologadas: (id: number | string | undefined) => [...detalleAll, id, "notas-homologadas"] as const,
  origenNota: (id: number | string | undefined, notaId: number | null) =>
    [...detalleAll, id, "notas-homologadas", "origen", notaId] as const,
  snapshotPendiente: (id: number | string | undefined) => [...detalleAll, id, "snapshot-pendiente"] as const,
  estudianteExistente: (documento: string) => [...all, "estudiante-existente", documento] as const,
  previaReactivar: (id: number | string | undefined) => [...detalleAll, id, "reactivar-previa"] as const,
  solicitudRetiro: (id: number | string | undefined) => [...detalleAll, id, "solicitud-retiro"] as const,
  buscarEstudiantesAll: [...all, "buscar-estudiantes"] as const,
  buscarEstudiantes: (q: string) => [...all, "buscar-estudiantes", q] as const,
  asignaturasPlan: (grupoId: number | null) => [...all, "asignaturas-plan", grupoId] as const,
  periodosAbiertos: (sedeId: number | null, jornadaId: number | null) =>
    [...all, "periodos-abiertos", sedeId, jornadaId] as const,
} as const

export function invalidarMatriculas(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: listaAll })
  queryClient.invalidateQueries({ queryKey: detalleAll })
}
