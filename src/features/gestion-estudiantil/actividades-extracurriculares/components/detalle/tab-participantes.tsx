"use no memo"

import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { optionTerm } from "@/components/search/query-syntax"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { PersonRemoveIcon } from "@/components/ui/icons"
import { getErrorMessage } from "@/lib/api-client"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useSearchFiltros } from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import { anchoAccionesFila } from "@/features/gestion-estudiantil/commons/utils/acciones-fila"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { BadgeColor } from "@/features/gestion-estudiantil/commons/utils/badge-color"
import { useParticipantesQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { ParticipanteRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

interface FiltrosParticipantes {
  estado: string
}
const VACIOS: FiltrosParticipantes = { estado: "" }
const SIN_BORRADOR = () => {}

const COLOR_ESTADO: Record<string, BadgeColor> = { INSCRITO: "info", RETIRADO: "muted", FINALIZO: "success" }

const columna = (id: string, titulo: string) => ({
  id,
  enableSorting: false,
  meta: { label: titulo },
  header: () => <div className="text-sm font-medium">{titulo}</div>,
})

/** Columnas de Participantes (G.5.ACT.DET): Estudiante (con documento) · Grado/Grupo · Fecha de inscripción · Estado. */
function columnas(puedeRetirar: boolean, onRetirar: (p: ParticipanteRow) => void): ColumnDef<ParticipanteRow>[] {
  return [
    {
      ...columna("estudiante", "Estudiante"),
      accessorFn: (f) => `${f.estudiante_nombre} ${f.estudiante_documento}`,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.estudiante_nombre}</span>
          <span className="text-xs text-muted-foreground">{row.original.estudiante_documento}</span>
        </div>
      ),
    },
    { ...columna("grado_grupo", "Grado/Grupo"), accessorKey: "grado_grupo" },
    { ...columna("fecha_inscripcion", "Fecha de inscripción"), accessorFn: (f) => formatFecha(f.fecha_inscripcion) },
    {
      ...columna("estado", "Estado"),
      accessorKey: "estado_nombre",
      cell: ({ row }) => (
        <Badge variant="soft" color={COLOR_ESTADO[row.original.estado_valor] ?? "muted"}>
          <span>{row.original.estado_nombre}</span>
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: anchoAccionesFila(1),
      cell: ({ row }) => (
        <AccionesFila
          etiqueta={`Acciones del participante ${row.original.estudiante_nombre}`}
          acciones={[
            // Brecha B3: sin bandera por fila; se usa puede_inscribir de la actividad y que el participante esté Inscrito.
            {
              id: "retirar",
              label: "Retirar",
              icon: <PersonRemoveIcon />,
              disabled: !puedeRetirar || row.original.estado_valor !== "INSCRITO",
              onSelect: () => onRetirar(row.original),
            },
          ]}
        />
      ),
    },
  ]
}

/** Pestaña Participantes (G.5.ACT.DET.1): búsqueda, filtro Estado y tabla paginada. */
export function TabParticipantes({
  actividadId,
  puedeRetirar,
  onRetirar,
}: {
  actividadId: number
  puedeRetirar: boolean
  onRetirar: (p: ParticipanteRow) => void
}) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState<FiltrosParticipantes>(VACIOS)
  const estados = useCatalogo("ESTADO_PARTICIPACION_EXTRA")
  // El backend filtra por el código del estado (VALOR), no por el pk.
  const estadoOpciones = useMemo(() => estados.map((e) => ({ value: e.codigo, label: e.label })), [estados])

  const query = useParticipantesQuery(actividadId, {
    search,
    estado: filtros.estado || undefined,
    pageIndex,
    pageSize,
  })

  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v)
      goToPage(0)
    },
    [goToPage],
  )
  const applyFilters = useCallback(
    (next: FiltrosParticipantes) => {
      setFiltros(next)
      goToPage(0)
    },
    [goToPage],
  )
  const onClearAll = useCallback(() => {
    setSearch("")
    setFiltros(VACIOS)
    goToPage(0)
  }, [goToPage])

  const s = useSearchFiltros<FiltrosParticipantes>({
    search,
    onSearchChange,
    filters: filtros,
    applyFilters,
    onClearAll,
    onDraftChange: SIN_BORRADOR,
    vacios: VACIOS,
    terms: [optionTerm("estado", "estado", estadoOpciones)],
  })

  const cols = useMemo(() => columnas(puedeRetirar, onRetirar), [puedeRetirar, onRetirar])
  const { table } = useDataTable({
    columns: cols,
    data: query.data?.rows ?? [],
    pageCount: query.data?.pageCount ?? 1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "actividad-participantes-column-visibility",
  })
  const total = query.data?.totalCount ?? 0
  const hayFiltros = Boolean(search) || Boolean(filtros.estado)

  return (
    <div className="flex flex-col gap-3">
      <div>
        <BarraBusquedaFiltros id="participantes-search" placeholder="Buscar por estudiante" estado={s}>
          <div className="px-4">
            <ComboOpciones
              id="participantes-estado"
              label="Estado"
              value={s.draft.estado}
              options={estadoOpciones}
              onChange={(estado) => s.setDraft({ ...s.draft, estado })}
            />
          </div>
        </BarraBusquedaFiltros>
      </div>
      <DataTable
        table={table}
        isPending={query.isPending}
        isError={query.isError}
        onRetry={query.refetch}
        emptyMessage={hayFiltros ? "No hay participantes para los filtros aplicados." : "La actividad aún no tiene participantes."}
        errorMessage={query.error ? getErrorMessage(query.error) : undefined}
      />
      <Pagination
        pageIndex={pageIndex}
        pageCount={query.data?.pageCount ?? 1}
        canPrev={pageIndex > 0}
        canNext={pageIndex < (query.data?.pageCount ?? 1) - 1}
        onPageChange={goToPage}
        totalCount={total}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        viewOptions={<DataTableViewOptions table={table} />}
      />
    </div>
  )
}
