"use no memo"

import { useCallback, useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import {
  toSaludMentalFilters,
  useSaludMentalQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-salud-mental-query"
import type { SenalSMRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { buildColumnsSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/columns-salud-mental"
import { useDialogosSaludMental } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/use-dialogos-salud-mental"
import type { AccionSenalSM } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/acciones-senal"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { useSaludMentalFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-salud-mental-filtros"

/** Sede y Grado/Grupo van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { sede: false, grado_grupo: false }

/** Consulta, tabla y acciones de la pestaña «Salud mental» (§9.6). */
export function useSaludMentalLista() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const f = useSaludMentalFiltros(goToPage)
  // «Nuevo reporte» solo lo ofrece quien puede reportar (el backend lo vuelve a validar).
  const puedeReportar = useAccesoPrevencionQuery(f.establecimientoId).data?.puede_reportar_salud_mental === true
  const ambito = useAmbitoPrevencion("")
  const { irSenalSaludMental, irReporteSaludMental } = useNavegacionPrevencion()
  const dialogos = useDialogosSaludMental()

  const filters = useMemo(
    () => (f.establecimientoId == null ? null : toSaludMentalFilters(f.establecimientoId, f.search, f.filtros)),
    [f.establecimientoId, f.search, f.filtros],
  )
  const query = useSaludMentalQuery({ filters, pageIndex, pageSize })

  const sedePorId = useMemo(
    () => new Map(ambito.sedeOpciones.map((s) => [Number(s.value), s.label] as const)),
    [ambito.sedeOpciones],
  )

  const { abrir } = dialogos
  const onAccion = useCallback(
    (fila: SenalSMRow, accion: AccionSenalSM) => {
      if (accion === "ver" || accion === "valorar") irSenalSaludMental(fila.id)
      else abrir({ dialogo: accion === "atencion" ? "atencion" : "cerrar", senal: fila })
    },
    [irSenalSaludMental, abrir],
  )
  const columns = useMemo(() => buildColumnsSaludMental({ sedePorId, onAccion }), [sedePorId, onAccion])

  const { table } = useDataTable({
    columns,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-salud-mental-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  return {
    f,
    query,
    table,
    filters,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    irReporteSaludMental,
    puedeReportar,
    dialogos: dialogos.dialogos,
  }
}
