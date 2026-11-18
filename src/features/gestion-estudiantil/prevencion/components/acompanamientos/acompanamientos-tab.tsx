"use no memo"

import { useCallback, useState, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import {
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, FileXlsIcon } from "@/components/ui/icons"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getErrorMessage } from "@/lib/api-client"

import {
  ACOMPANAMIENTOS_FILTROS_VACIOS,
  REPORTES_CONSUMO_FILTROS_VACIOS,
  type AcompanamientoRow,
  type ReporteConsumoRow,
  type TipoAcompanamiento,
} from "@/features/gestion-estudiantil/prevencion/api/types"
import type {
  AccionAcomp,
  AccionReporteConsumo,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acciones-acompanamiento"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { useDialogosAcompanamiento } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/use-dialogos-acompanamiento"
import { resumenDesdeFila } from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"
import { SearchAcompanamientos } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/search-acompanamientos"
import {
  useAcompanamientosLista,
  useReportesConsumoLista,
} from "@/features/gestion-estudiantil/prevencion/hooks/use-acompanamientos-lista"

type Vista = "acompanamientos" | "reportes"

interface Props {
  tabs: ReactNode
  tipo: TipoAcompanamiento
  /** Solo orientación ve Reportes recibidos (bandera `ver_reportes_consumo` del acceso). */
  verReportes?: boolean
  /** «Nuevo acompañamiento»: bandera `puede_crear_acomp` del acceso (orientación). */
  puedeCrear?: boolean
  /** «Exportar para el SIUCE»: bandera `puede_exportar_siuce_acomp` (Supervisor de sede y Administrador). */
  puedeExportar?: boolean
}

/** Pestañas Embarazo y maternidad/paternidad (§9.9) y Consumo de sustancias (§9.10). */
export function AcompanamientosTab({ tabs, tipo, verReportes = false, puedeCrear = false, puedeExportar = false }: Props) {
  const { irAcompNuevo } = useNavegacionPrevencion()
  const [vista, setVista] = useState<Vista>("acompanamientos")
  const actual: Vista = tipo === "CONSUMO" && verReportes ? vista : "acompanamientos"

  const selector =
    tipo === "CONSUMO" && verReportes ? (
      <ToggleGroup
        value={[actual]}
        onValueChange={(v) => v[0] && setVista(v[0] as Vista)}
        multiple={false}
        spacing={0}
        variant="outline"
        aria-label="Vista de consumo de sustancias"
      >
        <ToggleGroupItem value="acompanamientos" size="sm">
          Acompañamientos
        </ToggleGroupItem>
        <ToggleGroupItem value="reportes" size="sm">
          Reportes recibidos
        </ToggleGroupItem>
      </ToggleGroup>
    ) : null

  // El SIUCE exporta las filas filtradas del listado: solo lo ofrece la vista de acompañamientos.
  const encabezado = (onExportar?: () => void) => (
    <>
      <TableScreenTitle
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" type="button" disabled={!puedeExportar || !onExportar} onClick={onExportar}>
              <FileXlsIcon data-icon="inline-start" />
              Exportar para el SIUCE
            </Button>
            <Button size="sm" type="button" disabled={!puedeCrear} onClick={() => irAcompNuevo(tipo)}>
              <ControlPointIcon data-icon="inline-start" />
              Nuevo acompañamiento
            </Button>
          </div>
        }
      >
        Prevención y retención
      </TableScreenTitle>
      <TableScreenTabs>{tabs}</TableScreenTabs>
    </>
  )

  return actual === "reportes" ? (
    <VistaReportes encabezado={encabezado} selector={selector} />
  ) : (
    <VistaAcompanamientos key={tipo} tipo={tipo} encabezado={encabezado} selector={selector} />
  )
}

interface VistaProps {
  encabezado: (onExportar?: () => void) => ReactNode
  selector: ReactNode
}

function VistaAcompanamientos({ tipo, encabezado, selector }: VistaProps & { tipo: TipoAcompanamiento }) {
  const { irAcomp, irAcompEditar } = useNavegacionPrevencion()
  const d = useDialogosAcompanamiento()
  const { abrir } = d
  const onAccion = useCallback(
    (fila: AcompanamientoRow, accion: AccionAcomp) => {
      if (accion === "ver") irAcomp(fila.id)
      else if (accion === "modificar") irAcompEditar(fila.id)
      else abrir({ dialogo: accion, acomp: resumenDesdeFila(fila) })
    },
    [irAcomp, irAcompEditar, abrir],
  )
  const l = useAcompanamientosLista(tipo, onAccion)
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  const exportar = filters
    ? () => {
        const { TIPO: _tipo, ...sinTipo } = filters
        const nombre = (lista: { value: string; label: string }[] | undefined, v: string | undefined) =>
          v ? lista?.find((o) => o.value === v)?.label : undefined
        const filtrosTexto = [
          nombre(f.opciones.sedes, f.filtros.sede),
          nombre(f.opciones.jornadas, f.filtros.jornada),
          nombre(f.opciones.responsables, f.filtros.responsable),
          nombre(f.opciones.estados, f.filtros.estado),
          f.search.trim() ? `«${f.search.trim()}»` : undefined,
        ].filter((x): x is string => Boolean(x))
        abrir({ dialogo: "siuce", tipo, filters: sinTipo, total, filtrosTexto })
      }
    : undefined

  return (
    <>
      <TableScreenHeader>
        {encabezado(exportar)}
        <TableScreenToolbar>
          <div className="flex w-full flex-col gap-3">
            {selector}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchAcompanamientos
                id={`prevencion-acomp-${tipo.toLowerCase()}`}
                vacios={ACOMPANAMIENTOS_FILTROS_VACIOS}
                search={f.search}
                onSearchChange={f.onSearchChange}
                filters={f.filtros}
                applyFilters={f.applyFilters}
                onClearAll={f.onClearAll}
                onDraftChange={f.onDraftChange}
                opciones={f.opciones}
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total} {total === 1 ? "acompañamiento" : "acompañamientos"}
              </p>
            </div>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            f.sinEstablecimiento
              ? "No tiene sedes asignadas: elija una sede para ver los acompañamientos."
              : f.hayFiltros
                ? "No hay acompañamientos para los filtros aplicados."
                : "Aún no hay acompañamientos."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={l.goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={l.setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
      {d.dialogos}
    </>
  )
}

function VistaReportes({ encabezado, selector }: VistaProps) {
  const d = useDialogosAcompanamiento()
  const { abrir } = d
  const onAccion = useCallback(
    (fila: ReporteConsumoRow, accion: AccionReporteConsumo) =>
      abrir({ dialogo: accion === "ver" ? "ver-reporte" : "vincular", reporte: fila }),
    [abrir],
  )
  const l = useReportesConsumoLista(true, onAccion)
  const { f, query, table, filters, pageIndex, pageSize } = l
  const { data, isPending, isError, error, refetch } = query
  const total = data?.totalCount ?? 0

  return (
    <>
      <TableScreenHeader>
        {encabezado()}
        <TableScreenToolbar>
          <div className="flex w-full flex-col gap-3">
            {selector}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SearchAcompanamientos
                id="prevencion-reportes-consumo"
                vacios={REPORTES_CONSUMO_FILTROS_VACIOS}
                search={f.search}
                onSearchChange={f.onSearchChange}
                filters={f.filtros}
                applyFilters={f.applyFilters}
                onClearAll={f.onClearAll}
                onDraftChange={f.onDraftChange}
                opciones={f.opciones}
              />
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total} {total === 1 ? "reporte" : "reportes"}
              </p>
            </div>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending && filters != null}
          isError={isError}
          onRetry={refetch}
          emptyMessage={f.hayFiltros ? "No hay reportes para los filtros aplicados." : "No hay reportes recibidos."}
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          onPageChange={l.goToPage}
          totalCount={total}
          pageSize={pageSize}
          onPageSizeChange={l.setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
      {d.dialogos}
    </>
  )
}
