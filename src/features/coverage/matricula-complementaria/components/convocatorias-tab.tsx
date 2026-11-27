"use no memo"

import { useState, type ReactNode } from "react"
import { AccionesFila, BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenActions, TableScreenBody, TableScreenHeader, TableScreenToolbar } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import {
  ClipboardTextIcon,
  EyeIcon,
  ListChecksIcon,
  ListNumbersIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { toPageCount } from "@/lib/pagination"
import { paths } from "@/config/paths"

import { useConvocatoriasQuery } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { Convocatoria, EstadoConvocatoria, ModoSeleccion } from "@/features/coverage/matricula-complementaria/api/types"
import { Buscador } from "@/features/coverage/matricula-complementaria/components/buscador"
import { coberturaComplementariaRoute } from "@/router"
import {
  ESTADO_CONVOCATORIA,
  Marca,
  MODO_LABEL,
  fecha,
  rango,
} from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import {
  DialogEliminarConvocatoria,
  DialogListaSorteo,
  DialogResultadoSeleccion,
} from "@/features/coverage/matricula-complementaria/components/dialogs-convocatoria"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/** Código del menú (TMENU) de la vista Matrícula complementaria. */
export const MENU_COMPLEMENTARIA = "MATRICULA_COMPLEMENTARIA"

const totalDe = (c: Convocatoria, campo: "cupo" | "seleccionados") => c.cupos.reduce((s, x) => s + x[campo], 0)
const cerroPostulacion = (c: Convocatoria) => ["EN_SELECCION", "PUBLICADA", "CERRADA"].includes(c.estado)

/** Qué acciones del menú ⁞ ofrece cada convocatoria (Sección 2.16.2, Acciones). */
export function accionesDe(c: Convocatoria) {
  return {
    editar: c.estado !== "CERRADA",
    // Manual con la forma Abierta, o la lista de espera de la forma por el origen.
    seleccionar:
      (c.estado === "EN_SELECCION" || c.estado === "PUBLICADA") &&
      ((c.forma === "ABIERTA" && c.modo === "MANUAL") || (c.forma === "ORIGEN" && c.listaEspera)),
    resultado: cerroPostulacion(c) && c.forma === "ABIERTA" && c.modo === "AUTOMATICA",
    sorteo: cerroPostulacion(c) && c.forma === "ABIERTA" && c.desempate === "SORTEO",
    eliminar: !c.tienePostulaciones,
  }
}

const columns: ColumnDef<Convocatoria>[] = [
  {
    id: "anio",
    accessorKey: "anio",
    meta: { label: "Año" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.anio}</span>,
    enableHiding: false,
  },
  {
    id: "origenes",
    accessorFn: (r) => r.id,
    meta: { label: "Establecimientos de origen" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimientos de origen" />,
    // Puede partirse: con varias instituciones de origen la tabla se salía por la derecha.
    cell: ({ row }) => <span className="whitespace-normal">{row.original.origenes.map((o) => o.nombre).join(", ")}</span>,
    enableSorting: false,
  },
  {
    id: "postulacion",
    accessorFn: (r) => r.id,
    meta: { label: "Postulación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Postulación" />,
    cell: ({ row }) => (
      <span className="tabular-nums">{rango(row.original.inicioPostulacion, row.original.cierrePostulacion)}</span>
    ),
    enableSorting: false,
  },
  {
    id: "publicacion",
    accessorFn: (r) => r.id,
    meta: { label: "Publicación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Publicación" />,
    cell: ({ row }) => <span className="tabular-nums">{fecha(row.original.publicacion)}</span>,
    enableSorting: false,
  },
  {
    id: "limite",
    accessorFn: (r) => r.id,
    meta: { label: "Límite para matricular" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Límite para matricular" />,
    cell: ({ row }) => <span className="tabular-nums">{fecha(row.original.limiteMatricula)}</span>,
    enableSorting: false,
  },
  {
    id: "modo",
    accessorFn: (r) => r.id,
    meta: { label: "Modo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Modo" />,
    // La forma por el origen no tiene modo de selección: selecciona el origen al postular.
    cell: ({ row }) => (
      <span className="whitespace-normal">{row.original.forma === "ORIGEN" ? "Por el origen" : MODO_LABEL[row.original.modo]}</span>
    ),
    enableSorting: false,
  },
  {
    id: "seleccionados",
    accessorFn: (r) => r.id,
    meta: { label: "Seleccionados / cupo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Seleccionados / cupo" className="justify-center" />,
    cell: ({ row }) => (
      <span className="block text-center tabular-nums">
        {totalDe(row.original, "seleccionados")} / {totalDe(row.original, "cupo")}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "estado",
    accessorFn: (r) => r.id,
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <Marca {...ESTADO_CONVOCATORIA[row.original.estado]} />,
    enableSorting: false,
  },
  {
    id: "actions",
    // Hasta 7 íconos de 36 px (más el ⁞ si pasan de 6).
    size: 7 * 36 + 16,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesConvocatoria convocatoria={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

function AccionesConvocatoria({ convocatoria: c }: { convocatoria: Convocatoria }) {
  const navigate = useNavigate()
  const { puedeEditar, puedeEliminar } = useMenuPermission(MENU_COMPLEMENTARIA)
  const [abierto, setAbierto] = useState<"resultado" | "sorteo" | "eliminar" | null>(null)
  const a = accionesDe(c)
  const cerrar = (open: boolean) => !open && setAbierto(null)

  return (
    <>
      {/* Íconos con tooltip, «Ver detalle» primero; más de 6 van a «Más acciones» (CLAUDE.md §13). */}
      <AccionesFila limite={6}>
          <BotonAccion modo="icon" label="Ver detalle" Icon={EyeIcon} onClick={() => navigate({ to: paths.app.coberturaConvocatoriaDetalle.getHref(c.id) })} />
          {a.editar && puedeEditar ? (
            <BotonAccion modo="icon" label="Editar" Icon={PencilIcon} onClick={() => navigate({ to: paths.app.coberturaConvocatoriaEditar.getHref(c.id) })} />
          ) : null}
          <BotonAccion modo="icon" label="Ver postulaciones" Icon={UsersIcon} onClick={() =>
              navigate({
                to: paths.app.coberturaComplementaria.getHref(),
                search: { tab: "postulaciones", convocatoria: c.id },
              })
            } />
          {a.seleccionar && puedeEditar ? (
            <BotonAccion modo="icon" label="Seleccionar" Icon={ListChecksIcon} onClick={() => navigate({ to: paths.app.coberturaConvocatoriaSeleccionar.getHref(c.id) })} />
          ) : null}
          {a.resultado && puedeEditar ? (
            <BotonAccion modo="icon" label="Ver resultado" Icon={ClipboardTextIcon} onClick={() => setAbierto("resultado")} />
          ) : null}
          {a.sorteo ? (
            <BotonAccion modo="icon" label="Generar lista del sorteo" Icon={ListNumbersIcon} onClick={() => setAbierto("sorteo")} />
          ) : null}
          {a.eliminar && puedeEliminar ? (
            <>
              <BotonAccion modo="icon" label="Eliminar" Icon={TrashIcon} destructivo onClick={() => setAbierto("eliminar")} />
            </>
          ) : null}
        </AccionesFila>
      {abierto === "resultado" ? <DialogResultadoSeleccion convocatoria={c} onOpenChange={cerrar} /> : null}
      {abierto === "sorteo" ? <DialogListaSorteo convocatoria={c} onOpenChange={cerrar} /> : null}
      {abierto === "eliminar" ? <DialogEliminarConvocatoria convocatoria={c} onOpenChange={cerrar} /> : null}
    </>
  )
}

const ANIOS = [2028, 2027, 2026, 2025]

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Filtro y paginación en el front (ver `filtrando`): texto contra el año y los establecimientos de origen. */
function filtrar(
  rows: Convocatoria[],
  f: { q?: string; anio?: number; estadoConvocatoria?: EstadoConvocatoria; modoSeleccion?: ModoSeleccion },
  pageIndex: number,
  pageSize: number,
) {
  const texto = sinTildes(f.q?.trim() ?? "")
  const filas = rows.filter(
    (r) =>
      (!f.anio || r.anio === f.anio) &&
      (!f.estadoConvocatoria || r.estado === f.estadoConvocatoria) &&
      (!f.modoSeleccion || r.modo === f.modoSeleccion) &&
      (!texto || sinTildes([r.anio, r.establecimiento, ...r.origenes.map((o) => o.nombre)].join(" ")).includes(texto)),
  )
  return {
    rows: filas.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    pageCount: toPageCount(filas.length, pageSize),
    totalCount: filas.length,
  }
}

/** Pestaña Convocatorias (Sección 2.16.2). */
export function ConvocatoriasTab({ encabezado, accion }: { encabezado: ReactNode; accion?: ReactNode }) {
  const search = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  // La consulta del back no filtra (hay una convocatoria por año, son pocas): con algún filtro se traen
  // todas y se filtran y paginan aquí; sin filtros, la paginación sigue siendo la del back.
  const filtrando = Boolean(search.q || search.anio || search.estadoConvocatoria || search.modoSeleccion)
  const query = useConvocatoriasQuery(filtrando ? { pageIndex: 0, pageSize: 1000, sorting } : { pageIndex, pageSize, sorting })
  const { isPending, isError, error, refetch } = query
  const data = filtrando && query.data ? filtrar(query.data.rows, search, pageIndex, pageSize) : query.data
  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })
  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-convocatorias-complementaria",
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          {/* Buscador con filtros escritos dentro (`estado:(En selección)`), como el Observador (CLAUDE.md §13). */}
          <Buscador
            id="convocatorias-buscar"
            placeholder="Buscar por año o establecimiento de origen"
            texto={search.q ?? ""}
            filtros={[
              { key: "anio", label: "Año", items: [{ value: "", label: "Todos" }, ...ANIOS.map((a) => ({ value: String(a), label: String(a) }))], value: search.anio ? String(search.anio) : "" },
              {
                key: "estado",
                label: "Estado",
                items: [{ value: "", label: "Todos" }, ...Object.entries(ESTADO_CONVOCATORIA).map(([value, { label }]) => ({ value, label }))],
                value: search.estadoConvocatoria ?? "",
              },
              {
                key: "modo",
                label: "Modo",
                items: [{ value: "", label: "Todos" }, ...Object.entries(MODO_LABEL).map(([value, label]) => ({ value, label }))],
                value: search.modoSeleccion ?? "",
              },
            ]}
            onBuscar={(v, q) =>
              setSearch({
                q: q || undefined,
                anio: v.anio ? Number(v.anio) : undefined,
                estadoConvocatoria: (v.estado || undefined) as EstadoConvocatoria | undefined,
                modoSeleccion: (v.modo || undefined) as ModoSeleccion | undefined,
              })
            }
            onLimpiar={() => setSearch({ q: undefined, anio: undefined, estadoConvocatoria: undefined, modoSeleccion: undefined })}
          />
          {/* Crear va en la línea del buscador, a la derecha (CLAUDE.md §13). */}
          {accion ? <TableScreenActions>{accion}</TableScreenActions> : null}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            filtrando
              ? "Ninguna convocatoria coincide con la búsqueda."
              : "Aún no hay convocatorias. Use Nueva convocatoria para abrir la del año."
          }
        />
        {data ? (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </TableScreenBody>
    </TableScreen>
  )
}
