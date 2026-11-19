"use no memo"

import { useMemo, useState } from "react"

import { useDataTable } from "@/hooks/use-data-table"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import {
  useHistorialAcademicoOpcionesQuery,
  useHistorialAcademicoQuery,
  type HistorialAcademicoParams,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-historial-academico-query"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import {
  buildColumnsEvaluativo,
  buildColumnsFormativo,
} from "@/features/gestion-estudiantil/prevencion/components/historial-academico/columns-resultados"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import {
  etiquetaMatricula,
  filasObservaciones,
  PERIODO_FINAL,
} from "@/features/gestion-estudiantil/prevencion/utils/historial-academico"

/** El Área va oculta de entrada; «Columnas visibles» la ofrece. */
const COLUMNAS_OCULTAS = { area: false }
const SIN_PAGINAR = {
  pageIndex: 0,
  pageSize: 1000,
  goToPage: () => undefined,
  setPageSize: () => undefined,
  sorting: [],
  setSorting: () => undefined,
}

interface Elegido {
  anio: string | null
  matricula: string | null
  asignatura: string
  periodos: string[] | null
}

/**
 * Historial académico de un estudiante (G.8.HIS.1-3): opciones en cascada Año → Matrícula → Asignatura y Períodos,
 * consulta de solo lectura y tablas de resultados (Evaluativo) u observaciones (Formativo). Lo que la persona no
 * eligió se deriva de las opciones (último año, su primera matrícula, todos los períodos).
 */
export function useHistorialAcademico(matricula: number) {
  const { irHistorial } = useNavegacionPrevencion()
  const opcionesQuery = useHistorialAcademicoOpcionesQuery(matricula)
  const op = opcionesQuery.data

  const [elegido, setElegido] = useState<Elegido>({ anio: null, matricula: null, asignatura: "", periodos: null })
  const [consultada, setConsultada] = useState<HistorialAcademicoParams | null>(null)
  const [consultas, setConsultas] = useState(0)

  const anio = elegido.anio ?? (op?.anios[0] != null ? String(op.anios[0]) : "")
  const matriculasDelAnio = useMemo(() => (op?.matriculas ?? []).filter((m) => String(m.anio) === anio), [op, anio])
  const matriculaActual =
    matriculasDelAnio.find((m) => String(m.fk_tmatricula) === elegido.matricula) ?? matriculasDelAnio[0]

  const opcionesPeriodo: Opcion[] = useMemo(
    () => [
      ...(matriculaActual?.periodos ?? []).map((p) => ({ value: String(p.fk_tperiodo_evaluacion), label: p.nombre })),
      { value: PERIODO_FINAL, label: "Resultado final del Período Académico" },
    ],
    [matriculaActual],
  )
  const periodos = elegido.periodos ?? opcionesPeriodo.map((o) => o.value)

  const opcionesAnio: Opcion[] = (op?.anios ?? []).map((a) => ({ value: String(a), label: String(a) }))
  const opcionesMatricula: Opcion[] = matriculasDelAnio.map((m) => ({
    value: String(m.fk_tmatricula),
    label: etiquetaMatricula(m),
  }))
  const opcionesAsignatura: Opcion[] = (matriculaActual?.asignaturas ?? []).map((a) => ({
    value: String(a.fk_tasignatura),
    label: a.area ? `${a.nombre} (${a.area})` : a.nombre,
  }))

  const puedeConsultar = matriculaActual != null && periodos.length > 0
  const consultar = () => {
    if (!matriculaActual || periodos.length === 0) return
    setConsultas((n) => n + 1)
    setConsultada({
      matricula,
      matriculaHistorica: matriculaActual.fk_tmatricula,
      // El orden de la lista, no el de las casillas.
      periodos: opcionesPeriodo
        .filter((o) => periodos.includes(o.value))
        .map((o) => o.value)
        .join(","),
      asignatura: elegido.asignatura ? Number(elegido.asignatura) : null,
      consulta: consultas + 1,
    })
  }

  const resultadoQuery = useHistorialAcademicoQuery(consultada)
  const resultado = resultadoQuery.data

  // Un resultado anterior no sobrevive a un cambio de filtros: lo mostrado siempre corresponde a lo elegido.
  const cambiar = (parcial: Partial<Elegido>) => {
    setElegido((e) => ({ ...e, ...parcial }))
    setConsultada(null)
  }

  const asignaturas = useMemo(() => resultado?.resultados?.asignaturas ?? [], [resultado])
  const periodosResultado = useMemo(() => {
    const vistos = new Map<number, string>()
    for (const a of asignaturas)
      for (const p of a.periodos) if (!vistos.has(p.fk_tperiodo_evaluacion)) vistos.set(p.fk_tperiodo_evaluacion, p.periodo)
    return [...vistos].map(([id, nombre]) => ({ id, nombre }))
  }, [asignaturas])
  const conFinal = asignaturas.some((a) => a.final != null)
  const columnasEvaluativo = useMemo(() => buildColumnsEvaluativo(periodosResultado, conFinal), [periodosResultado, conFinal])
  const columnasFormativo = useMemo(() => buildColumnsFormativo(), [])
  const filasObs = useMemo(
    () => filasObservaciones(resultado?.observaciones?.periodos ?? [], resultado?.observaciones?.final),
    [resultado],
  )

  const { table: tablaEvaluativo } = useDataTable({
    columns: columnasEvaluativo,
    data: asignaturas,
    pageCount: 1,
    getRowId: (a) => String(a.fk_tasignatura),
    ...SIN_PAGINAR,
    columnVisibilityStorageKey: "prevencion-historial-academico-evaluativo-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })
  const { table: tablaFormativo } = useDataTable({
    columns: columnasFormativo,
    data: filasObs,
    pageCount: 1,
    getRowId: (f) => f.id,
    ...SIN_PAGINAR,
    columnVisibilityStorageKey: "prevencion-historial-academico-formativo-column-visibility",
  })

  const { establecimientoId } = useAmbitoPrevencion("")
  const acceso = useAccesoPrevencionQuery(establecimientoId)

  return {
    opcionesQuery,
    op,
    anio,
    matriculaId: matriculaActual ? String(matriculaActual.fk_tmatricula) : "",
    asignatura: elegido.asignatura,
    periodos,
    opcionesAnio,
    opcionesMatricula,
    opcionesAsignatura,
    opcionesPeriodo,
    elegirAnio: (a: string) => cambiar({ anio: a, matricula: null, asignatura: "", periodos: null }),
    elegirMatricula: (m: string) => cambiar({ matricula: m, asignatura: "", periodos: null }),
    elegirAsignatura: (a: string) => cambiar({ asignatura: a }),
    elegirPeriodos: (p: string[]) => cambiar({ periodos: p }),
    puedeConsultar,
    consultar,
    consultada,
    resultadoQuery,
    resultado,
    tablaEvaluativo,
    tablaFormativo,
    /** Anticipa el 403 de la base: sin el permiso la pantalla avisa en vez de mostrar filtros que no funcionarán. */
    sinAcceso: acceso.data != null && acceso.data.puede_historial_academico === false,
    volverAlExpediente: () => irHistorial(matricula),
  }
}
