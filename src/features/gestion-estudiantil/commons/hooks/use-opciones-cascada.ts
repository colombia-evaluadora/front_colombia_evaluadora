import {
  useAniosGeQuery,
  useGruposPeriodoGeQuery,
  useJornadasGeQuery,
  usePeriodosGeQuery,
  useSedesGeQuery,
} from "@/features/gestion-estudiantil/commons/api/use-opciones-ge"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"

/**
 * Opciones de Sede → Jornada → Grado/Grupo y Período del año en curso, desde
 * la cascada de GE: ya vienen acotadas al alcance de quien pregunta, como
 * el listado del Observador (fn_usuario_sedes_lectura).
 */
export function useOpcionesCascada(sede: string, jornada: string, establecimiento = "") {
  const sedeId = sede ? Number(sede) : null
  const jornadaId = jornada ? Number(jornada) : null

  const sedes = useSedesGeQuery()
  const anios = useAniosGeQuery(sedeId)
  const anio = anios.data?.find((a) => a.esActual)?.anio ?? anios.data?.[0]?.anio ?? null
  const jornadas = useJornadasGeQuery(sedeId, anio)
  const grupos = useGruposPeriodoGeQuery({ sedeId, anio, jornadaId })
  const periodos = usePeriodosGeQuery({ sedeId, anio, jornadaId })

  // Con establecimiento elegido, solo las sedes de ese establecimiento.
  const establecimientoElegido = establecimiento ? Number(establecimiento) : null
  const sedesVisibles = (sedes.data ?? []).filter(
    (s) => establecimientoElegido == null || s.establecimientoId === establecimientoElegido,
  )
  const sedeOpciones: Opcion[] = sedesVisibles.map((s) => ({ value: String(s.id), label: s.nombre }))
  // Una jornada puede llegar repetida si la sede tiene dos períodos académicos en el año.
  const jornadaOpciones: Opcion[] = [
    ...new Map((jornadas.data ?? []).map((j) => [j.id, { value: String(j.id), label: j.nombre }])).values(),
  ]
  const grupoOpciones: Opcion[] = (grupos.data ?? []).map((g) => ({
    value: String(g.grupoId),
    label: `${g.gradoNombre} · ${g.grupoEtiqueta}`,
  }))
  // Grados únicos de los grupos del período (el filtro por grado de un listado es por PK_TGRADO, no por grupo).
  const gradoOpciones: Opcion[] = [
    ...new Map((grupos.data ?? []).map((g) => [g.gradoId, { value: String(g.gradoId), label: g.gradoNombre }])).values(),
  ]
  // VALOR del catálogo GRADOS de cada grado (TGRADO.CODIGO), por PK_TGRADO: así se cruza con listas por código.
  const gradoCodigos = new Map((grupos.data ?? []).map((g) => [String(g.gradoId), g.gradoCodigo ?? ""]))
  const periodoOpciones: Opcion[] = (periodos.data ?? []).map((p) => ({ value: String(p.id), label: p.nombre }))

  // Un rector de varios colegios: el catálogo de códigos es el del colegio de la sede elegida.
  const establecimientos = new Map((sedes.data ?? []).map((s) => [s.establecimientoId, s.establecimientoNombre]))
  const establecimientoId =
    sedes.data?.find((s) => s.id === sedeId)?.establecimientoId ??
    establecimientoElegido ??
    (establecimientos.size === 1 ? [...establecimientos.keys()][0] : null)

  // Solo hay filtro de Establecimiento si las sedes del usuario son de más de uno.
  const establecimientoOpciones: Opcion[] =
    establecimientos.size > 1 ? [...establecimientos].map(([id, nombre]) => ({ value: String(id), label: nombre })) : []

  return {
    sedeOpciones,
    establecimientoOpciones,
    jornadaOpciones,
    grupoOpciones,
    gradoOpciones,
    gradoCodigos,
    periodoOpciones,
    periodos: periodos.data ?? [],
    establecimientoId,
    cargandoGrupos: grupos.isFetching,
  }
}
