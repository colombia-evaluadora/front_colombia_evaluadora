"use no memo"

import { useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ClipboardTextIcon,
  DotsThreeVerticalIcon,
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
import { paths } from "@/config/paths"

import { useConvocatoriasQuery } from "@/features/coverage/matricula-complementaria/api/convocatorias"
import type { Convocatoria } from "@/features/coverage/matricula-complementaria/api/types"
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
import { useEstablecimiento } from "@/features/coverage/matricula-complementaria/hooks/use-establecimiento"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

/** Código del menú (TMENU) de la vista Matrícula complementaria. */
export const MENU_COMPLEMENTARIA = "MATRICULA_COMPLEMENTARIA"

const totalDe = (c: Convocatoria, campo: "cupo" | "seleccionados") => c.cupos.reduce((s, x) => s + x[campo], 0)
const cerroPostulacion = (c: Convocatoria) => ["EN_SELECCION", "PUBLICADA", "CERRADA"].includes(c.estado)

/** Qué acciones del menú ⁞ ofrece cada convocatoria (Sección 2.16.2, Acciones). */
export function accionesDe(c: Convocatoria) {
  return {
    editar: c.estado !== "CERRADA",
    // Manual en selección, y en Publicada para la lista de espera.
    seleccionar: c.modo === "MANUAL" && (c.estado === "EN_SELECCION" || c.estado === "PUBLICADA"),
    resultado: c.modo === "AUTOMATICA" && c.ejecutadaEl != null,
    sorteo: cerroPostulacion(c) && c.desempate === "SORTEO",
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
    cell: ({ row }) => row.original.origenes.map((o) => o.nombre).join(", "),
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
    cell: ({ row }) => MODO_LABEL[row.original.modo],
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
    size: 48,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesConvocatoria convocatoria={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

function AccionesConvocatoria({ convocatoria: c }: { convocatoria: Convocatoria }) {
  const navigate = useNavigate()
  const permiso = useMenuPermission(MENU_COMPLEMENTARIA)
  const { territorial } = useEstablecimiento()
  // Territoriales: solo lectura.
  const puedeEditar = permiso.puedeEditar && !territorial
  const puedeEliminar = permiso.puedeEliminar && !territorial
  const [abierto, setAbierto] = useState<"resultado" | "sorteo" | "eliminar" | null>(null)
  const a = accionesDe(c)
  const cerrar = (open: boolean) => !open && setAbierto(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Acciones de la convocatoria ${c.anio}`}
            />
          }
        >
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onClick={() => navigate({ to: paths.app.coberturaConvocatoriaDetalle.getHref(c.id) })}>
            <EyeIcon /> Ver detalle
          </DropdownMenuItem>
          {a.editar && puedeEditar ? (
            <DropdownMenuItem onClick={() => navigate({ to: paths.app.coberturaConvocatoriaEditar.getHref(c.id) })}>
              <PencilIcon /> Editar
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              navigate({
                to: paths.app.coberturaComplementaria.getHref(),
                search: { tab: "postulaciones", convocatoria: c.id },
              })
            }
          >
            <UsersIcon /> Ver postulaciones
          </DropdownMenuItem>
          {a.seleccionar && puedeEditar ? (
            <DropdownMenuItem
              onClick={() => navigate({ to: paths.app.coberturaConvocatoriaSeleccionar.getHref(c.id) })}
            >
              <ListChecksIcon /> Seleccionar
            </DropdownMenuItem>
          ) : null}
          {a.resultado && puedeEditar ? (
            <DropdownMenuItem onClick={() => setAbierto("resultado")}>
              <ClipboardTextIcon /> Ver resultado
            </DropdownMenuItem>
          ) : null}
          {a.sorteo ? (
            <DropdownMenuItem onClick={() => setAbierto("sorteo")}>
              <ListNumbersIcon /> Generar lista del sorteo
            </DropdownMenuItem>
          ) : null}
          {a.eliminar && puedeEliminar ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setAbierto("eliminar")}>
                <TrashIcon /> Eliminar
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto === "resultado" ? <DialogResultadoSeleccion convocatoria={c} onOpenChange={cerrar} /> : null}
      {abierto === "sorteo" ? <DialogListaSorteo convocatoria={c} onOpenChange={cerrar} /> : null}
      {abierto === "eliminar" ? <DialogEliminarConvocatoria convocatoria={c} onOpenChange={cerrar} /> : null}
    </>
  )
}

/** Pestaña Convocatorias (Sección 2.16.2). */
export function ConvocatoriasTab({ encabezado }: { encabezado: ReactNode }) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { establecimientoId } = useEstablecimiento()
  const { data, isPending, isError, error, refetch } = useConvocatoriasQuery({
    pageIndex,
    pageSize,
    sorting,
    establecimiento: establecimientoId,
  })
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
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="Aún no hay convocatorias. Use Nueva convocatoria para abrir la del año."
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
