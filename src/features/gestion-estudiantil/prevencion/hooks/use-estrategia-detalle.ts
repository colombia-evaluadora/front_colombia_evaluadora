"use no memo"

import { useCallback, useMemo } from "react"

import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useEstrategiaQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import type { BeneficiarioEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { buildColumnsBeneficiarios } from "@/features/gestion-estudiantil/prevencion/components/estrategias/detalle/columns-beneficiarios"
import { useDialogosEstrategias } from "@/features/gestion-estudiantil/prevencion/components/estrategias/dialogos/use-dialogos-estrategias"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { toPageCount } from "@/lib/pagination"

/** Documento, Resultado y Motivo de la salida van ocultas de entrada; «Columnas visibles» las ofrece. */
const COLUMNAS_OCULTAS = { documento: false, resultado: false, motivo: false }

/** Consulta de la estrategia, tabla paginada de beneficiarios y diálogos de la página de detalle (G.8.EST.7). */
export function useEstrategiaDetalle(estrategiaId: number) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { irHistorial, irEstrategiaEditar, volver } = useNavegacionPrevencion()
  const dialogos = useDialogosEstrategias()
  const query = useEstrategiaQuery(estrategiaId, { pageIndex, pageSize })
  const estrategia = query.data

  const { abrir } = dialogos
  const onRetirar = useCallback(
    (b: BeneficiarioEstrategia) => {
      if (estrategia) abrir({ dialogo: "retirar", estrategia: { id: estrategia.id, nombre: estrategia.nombre }, beneficiario: b })
    },
    [estrategia, abrir],
  )
  const onVerHistorial = useCallback(
    (b: BeneficiarioEstrategia) => irHistorial(b.fk_tmatricula, b.grado_grupo),
    [irHistorial],
  )
  const columns = useMemo(
    () => buildColumnsBeneficiarios({ puedeVerHistorial: estrategia?.ve_sensible === true, onVerHistorial, onRetirar }),
    [estrategia?.ve_sensible, onVerHistorial, onRetirar],
  )

  const total = estrategia?.beneficiarios_total ?? 0
  const { table } = useDataTable({
    columns,
    data: estrategia?.beneficiarios ?? [],
    pageCount: toPageCount(total, pageSize),
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "prevencion-estrategia-beneficiarios-column-visibility",
    initialColumnVisibility: COLUMNAS_OCULTAS,
  })

  const abrirAgregar = () => estrategia && abrir({ dialogo: "beneficiarios", estrategia })
  const abrirCopiar = () => estrategia && abrir({ dialogo: "copiar", estrategia })
  const abrirFinalizar = () => estrategia && abrir({ dialogo: "finalizar", estrategia })

  return {
    query,
    estrategia,
    table,
    total,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    volver,
    modificar: () => irEstrategiaEditar(estrategiaId),
    abrirAgregar,
    abrirCopiar,
    abrirFinalizar,
    dialogos: dialogos.dialogos,
  }
}
