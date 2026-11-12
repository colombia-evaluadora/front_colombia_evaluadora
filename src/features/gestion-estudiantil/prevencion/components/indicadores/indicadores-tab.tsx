"use no memo"

import { useCallback, useMemo, type ReactNode } from "react"

import { TableScreenBody, TableScreenHeader, TableScreenTabs, TableScreenTitle, TableScreenToolbar } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { Seccion } from "@/features/gestion-estudiantil/commons/components/dato"
import { useExportarIndicadores } from "@/features/gestion-estudiantil/prevencion/api/mutations/exportar-indicadores"
import {
  useIndicadoresGestionQuery,
  useIndicadoresQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import type { IndicadorGestionRow, IndicadorRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import {
  COLUMNAS_ESTRATEGIAS,
  COLUMNAS_GESTION,
  buildColumnsIndicadores,
} from "@/features/gestion-estudiantil/prevencion/components/indicadores/columns-indicadores"
import { ResumenIndicadores } from "@/features/gestion-estudiantil/prevencion/components/indicadores/resumen-indicadores"
import { SearchIndicadores } from "@/features/gestion-estudiantil/prevencion/components/indicadores/search-indicadores"
import { TablaSimple } from "@/features/gestion-estudiantil/prevencion/components/indicadores/tabla-simple"
import { useIndicadoresFiltros } from "@/features/gestion-estudiantil/prevencion/hooks/use-indicadores-filtros"
import { etiquetaAgrupacion } from "@/features/gestion-estudiantil/prevencion/utils/indicadores"

const idFila = (r: IndicadorRow) => `${r.tipo}-${r.clave ?? "resumen"}`
const idGestion = (r: IndicadorGestionRow) => `${r.nivel}-${r.fk_tsede ?? r.fk_testablecimiento}`

/** Pestaña «Indicadores» (§9.4): filtros, cifras del resumen, agrupamiento, efectividad de estrategias e IE-01. */
export function IndicadoresTab({ tabs }: { tabs: ReactNode }) {
  const { notify } = useNotify()
  const f = useIndicadoresFiltros()
  const { data, isPending, isError, error, refetch } = useIndicadoresQuery(f.queryFilters)
  // IE-01: solo Rector y Coordinador; con 403 el bloque no se muestra.
  const gestion = useIndicadoresGestionQuery({ establecimiento: f.establecimientoId })
  const exportar = useExportarIndicadores({
    mutationConfig: {
      onSuccess: (r) => notify(r.message, { variant: r.status === "error" ? "error" : "success" }),
      onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
    },
  })
  const onExportar = useCallback(() => {
    if (f.queryFilters) exportar.mutate(f.queryFilters)
  }, [f.queryFilters, exportar])

  const resumen = data?.find((r) => r.tipo === "RESUMEN")
  const grupos = useMemo(() => data?.filter((r) => r.tipo === "GRUPO") ?? [], [data])
  const estrategias = useMemo(() => data?.filter((r) => r.tipo === "ESTRATEGIA") ?? [], [data])
  const agrupacion = etiquetaAgrupacion(f.filtros.agrupar)
  const columnas = useMemo(() => buildColumnsIndicadores(agrupacion), [agrupacion])

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={f.queryFilters == null || exportar.isPending}
              onClick={onExportar}
            >
              <IconoCarga cargando={exportar.isPending}>
                <FileDownloadOutlinedIcon data-icon="inline-start" />
              </IconoCarga>
              Exportar
            </Button>
          }
        >
          Prevención y retención
        </TableScreenTitle>
        <TableScreenTabs>{tabs}</TableScreenTabs>
        <TableScreenToolbar>
          <SearchIndicadores
            search=""
            onSearchChange={NADA}
            filters={f.filtros}
            applyFilters={f.applyFilters}
            onClearAll={f.onClearAll}
            onDraftChange={f.onDraftChange}
            opciones={f.opciones}
          />
          {resumen?.periodo_academico_nombre && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {resumen.periodo_academico_nombre}
              {resumen.periodo_nombre ? ` · ${resumen.periodo_nombre}` : ""}
            </p>
          )}
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-6 pb-6">
          {resumen && <ResumenIndicadores resumen={resumen} />}
          <TablaSimple
            columns={columnas}
            data={grupos}
            getRowId={idFila}
            growColumnId="retiros"
            isPending={isPending && f.queryFilters != null}
            isError={isError}
            onRetry={refetch}
            errorMessage={error ? getErrorMessage(error) : undefined}
            emptyMessage={
              f.sinEstablecimiento
                ? "No tiene sedes asignadas: no hay indicadores para mostrar."
                : "No hay indicadores para los filtros aplicados."
            }
          />
          {estrategias.length > 0 && (
            <Seccion titulo="Efectividad de las estrategias">
              <TablaSimple columns={COLUMNAS_ESTRATEGIAS} data={estrategias} getRowId={idFila} />
            </Seccion>
          )}
          {gestion.isSuccess && gestion.data.length > 0 && (
            <Seccion titulo="Indicadores de gestión de alertas">
              <TablaSimple columns={COLUMNAS_GESTION} data={gestion.data} getRowId={idGestion} />
            </Seccion>
          )}
        </div>
      </TableScreenBody>
    </>
  )
}

const NADA = () => undefined
