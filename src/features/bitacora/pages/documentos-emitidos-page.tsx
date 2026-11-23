"use no memo"

import { useState } from "react"
import { format } from "date-fns"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { DatePicker } from "@/components/date-picker"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { env } from "@/config/env"
import { getErrorMessage, isNotFoundError } from "@/lib/api-client"
import { useUser } from "@/lib/auth"
import { formatDateValue, parseDateValue } from "@/lib/date-value"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"

import { useDocumentosEmitidosQuery } from "@/features/bitacora/api/query/use-documentos-emitidos-query"
import {
  ESTADOS_DOCUMENTO,
  TIPOS_DOCUMENTO,
  type DocumentoEmitido,
  type DocumentosFiltros,
} from "@/features/bitacora/api/types/documentos"
import { createDocumentosColumns } from "@/features/bitacora/components/columns-documentos"
import { DetalleDocumento } from "@/features/bitacora/components/detalle-documento"
import { Combo } from "@/features/bitacora/components/search-bitacora"

const VACIOS: DocumentosFiltros = { q: "", tipo: "", estado: "", desde: "", hasta: "" }
const TIPO_OPTIONS = TIPOS_DOCUMENTO.map((t) => ({ value: t, label: t }))
const ESTADO_OPTIONS = Object.entries(ESTADOS_DOCUMENTO).map(([value, label]) => ({ value, label }))
const RANGO_INVALIDO = "La fecha Hasta no puede ser anterior a la fecha Desde."

const fechaCorta = (v: string) => {
  const d = parseDateValue(v)
  return d ? format(d, "dd/MM/yyyy") : ""
}

/**
 * Bitácora · Documentos emitidos (B.8.LIS.1): cada documento con código QR (informes, constancias,
 * certificados, menciones), su estado y cuántas veces se consultó en la página de verificación. La paginación
 * es local: la vista no tiene filtros en la URL. El `NoticeProvider` lo pone el layout de Registro de actividad.
 */
export function DocumentosEmitidosPage() {
  return (
    <TablePaginationProvider>
      <DocumentosContent />
    </TablePaginationProvider>
  )
}

function DocumentosContent() {
  const { data: user } = useUser()
  const esSuperAdmin = Boolean(user?.isSuperAdmin)
  const { data: establecimientos = [] } = useEstablishmentsOptionsQuery(esSuperAdmin)
  const [establecimientoElegido, setEstablecimiento] = useState("")
  const establecimiento = establecimientoElegido || (esSuperAdmin ? String(establecimientos[0]?.id ?? "") : "")

  const [filters, setFilters] = useState<DocumentosFiltros>(VACIOS)
  const [busqueda, setBusqueda] = useState("")
  const [draft, setDraft] = useState<DocumentosFiltros>(VACIOS)
  const [abierto, setAbierto] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const paginacion = useTablePagination()

  const aplicar = (f: DocumentosFiltros) => {
    setFilters(f)
    paginacion.goToPage(0)
  }
  const rangoInvalido = Boolean(draft.desde && draft.hasta && draft.hasta < draft.desde)
  const activos = [filters.tipo, filters.estado, filters.desde, filters.hasta].filter(Boolean).length

  const { data, isPending, isError, error, refetch } = useDocumentosEmitidosQuery(
    { filters, establecimiento, pageIndex: paginacion.pageIndex, pageSize: paginacion.pageSize },
    !esSuperAdmin || Boolean(establecimiento),
  )
  const columns = createDocumentosColumns({
    expandido,
    onToggle: (d) => setExpandido((c) => (c === d.codigo ? null : d.codigo)),
  })
  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 0,
    getRowId: (row) => row.codigo,
    ...paginacion,
    columnVisibilityStorageKey: "bitacora-documentos-column-visibility",
  })

  const nombreEstablecimiento = establecimientos.find((e) => String(e.id) === establecimiento)?.name
  const rango =
    filters.desde || filters.hasta
      ? `generados ${filters.desde ? `desde el ${fechaCorta(filters.desde)}` : ""}${filters.hasta ? ` hasta el ${fechaCorta(filters.hasta)}` : ""}`
      : "todas las fechas"
  const alcance = [nombreEstablecimiento, rango].filter(Boolean).join(", ")

  // Vista previa: el servicio no existe aún en el backend; solo con mocks se ven datos (de ejemplo).
  if (!env.ENABLE_API_MOCKING || (isError && isNotFoundError(error))) {
    return (
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Bitácora · Documentos emitidos</TableScreenTitle>
        </TableScreenHeader>
        <TableScreenBody>
          <Alert variant="info">
            <InfoIcon aria-hidden />
            <AlertDescription>
              Vista previa: Documentos emitidos todavía no está disponible porque falta el servicio en el
              backend (<code>/bitacora/documentos/query</code>).
            </AlertDescription>
          </Alert>
        </TableScreenBody>
      </TableScreen>
    )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description={alcance}>Bitácora · Documentos emitidos</TableScreenTitle>
        <TableScreenToolbar>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <SearchQueryBar
              id="documentos-search"
              placeholder="Buscar por código o estudiante"
              value={busqueda}
              onValueChange={(v) => {
                setBusqueda(v)
                aplicar({ ...filters, q: v })
              }}
              onClearAll={() => {
                setBusqueda("")
                setDraft(VACIOS)
                aplicar(VACIOS)
                setAbierto(false)
              }}
              onClearFilters={() => {
                const next = { ...VACIOS, q: busqueda }
                setDraft(next)
                aplicar(next)
              }}
              activeFilterCount={activos + (busqueda ? 1 : 0)}
              badgeCount={activos}
              open={abierto}
              onOpenChange={(o) => {
                if (o) setDraft(filters)
                setAbierto(o)
              }}
              onApply={() => {
                if (rangoInvalido) return
                aplicar({ ...draft, q: busqueda })
                setAbierto(false)
              }}
              applyDisabled={rangoInvalido}
              size="sm"
            >
              <div className="flex flex-col gap-3 px-4">
                {esSuperAdmin && (
                  <Combo
                    id="documentos-establecimiento"
                    label="Establecimiento *"
                    options={establecimientos.map((e) => ({ value: String(e.id), label: e.name }))}
                    value={establecimiento}
                    onChange={setEstablecimiento}
                    obligatorio
                  />
                )}
                <Combo
                  id="documentos-tipo"
                  label="Tipo de documento"
                  options={TIPO_OPTIONS}
                  value={draft.tipo}
                  onChange={(tipo) => setDraft({ ...draft, tipo })}
                />
                <Combo
                  id="documentos-estado"
                  label="Estado"
                  options={ESTADO_OPTIONS}
                  value={draft.estado}
                  onChange={(estado) => setDraft({ ...draft, estado })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field orientation="vertical" variant="outlined" className="gap-2">
                    <FieldLabel htmlFor="documentos-desde">Generados desde</FieldLabel>
                    <DatePicker
                      id="documentos-desde"
                      size="sm"
                      value={parseDateValue(draft.desde)}
                      maxDate={new Date()}
                      onChange={(d) => setDraft({ ...draft, desde: d ? formatDateValue(d) : "" })}
                    />
                  </Field>
                  <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={rangoInvalido || undefined}>
                    <FieldLabel htmlFor="documentos-hasta">Hasta</FieldLabel>
                    <DatePicker
                      id="documentos-hasta"
                      size="sm"
                      value={parseDateValue(draft.hasta)}
                      minDate={parseDateValue(draft.desde)}
                      maxDate={new Date()}
                      aria-invalid={rangoInvalido}
                      onChange={(d) => setDraft({ ...draft, hasta: d ? formatDateValue(d) : "" })}
                    />
                  </Field>
                </div>
                {rangoInvalido && <FieldError>{RANGO_INVALIDO}</FieldError>}
              </div>
            </SearchQueryBar>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          renderSubRow={(row) =>
            expandido === row.original.codigo ? (
              <DetalleDocumento
                documento={row.original as DocumentoEmitido}
                onVerCodigo={(codigo) => {
                  // Muestra el documento citado (p. ej. el que reemplaza a este) ya desplegado.
                  setBusqueda(codigo)
                  aplicar({ ...filters, q: codigo })
                  setExpandido(codigo)
                }}
              />
            ) : null
          }
          emptyMessage="No hay documentos emitidos que coincidan con la búsqueda y los filtros aplicados."
        />
        <Pagination
          viewOptions={<DataTableViewOptions table={table} />}
          pageIndex={paginacion.pageIndex}
          pageCount={data?.pageCount ?? 0}
          canPrev={paginacion.pageIndex > 0}
          canNext={paginacion.pageIndex < (data?.pageCount ?? 0) - 1}
          onPageChange={paginacion.goToPage}
          totalCount={data?.totalCount ?? 0}
          pageSize={paginacion.pageSize}
          onPageSizeChange={paginacion.setPageSize}
        />
      </TableScreenBody>
    </TableScreen>
  )
}
