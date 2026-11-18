"use no memo"

import { useState, type ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowsLeftRightIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  
  PersonRemoveIcon,
  ProhibitIcon,
  PersonAddIcon,
  XIcon,
} from "@/components/ui/icons"
import { Buscador } from "@/features/coverage/matricula-complementaria/components/buscador"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { paths } from "@/config/paths"
import { coberturaComplementariaRoute } from "@/router"

import { accionesPostulacion, usePostulacionesQuery } from "@/features/coverage/matricula-complementaria/api/postulaciones"
import type { Postulacion } from "@/features/coverage/matricula-complementaria/api/types"
import { ESTADO_OPCION, Marca } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import {
  DialogAgregarMatriculaAdscripcion,
  DialogAnularPostulacion,
  DialogCambiarCupo,
  DialogLiberarCupo,
} from "@/features/coverage/matricula-complementaria/components/dialogs-postulacion"

const GRADOS = ["Décimo", "Undécimo"]

const columns: ColumnDef<Postulacion>[] = [
  {
    id: "numero",
    accessorKey: "numero",
    meta: { label: "Número" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Número" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.numero}</span>,
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "estudiante",
    accessorFn: (r) => r.id,
    meta: { label: "Estudiante" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
    cell: ({ row }) => (
      <div className="grid">
        <span className="font-medium">{row.original.estudiante}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{row.original.documento}</span>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "principal",
    accessorFn: (r) => r.id,
    meta: { label: "Matrícula principal" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Matrícula principal" />,
    cell: ({ row }) => row.original.principal,
    enableSorting: false,
  },
  {
    id: "opcion",
    accessorFn: (r) => r.id,
    meta: { label: "Opción de especialidad" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Opción de especialidad" />,
    cell: ({ row }) => {
      const p = row.original
      return (
        <span className="inline-flex flex-wrap items-center gap-2">
          {p.receptor} · {p.jornada} · {p.especialidad}
          <Marca {...ESTADO_OPCION[p.estadoOpcion]} />
          {p.posicion ? <span className="text-xs text-muted-foreground">Posición {p.posicion}</span> : null}
        </span>
      )
    },
    enableSorting: false,
  },
  {
    id: "estado",
    accessorFn: (r) => r.id,
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <Marca {...ESTADO_OPCION[row.original.estado]} />,
    enableSorting: false,
  },
  {
    id: "actions",
    size: 48,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesPostulacion postulacion={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

type Dialogo = "matricula" | "liberar" | "cupo" | "anular" | null

function AccionesPostulacion({ postulacion: p }: { postulacion: Postulacion }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const a = accionesPostulacion(p)
  const cerrar = (open: boolean) => !open && setAbierto(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de la postulación ${p.numero}`} />
          }
        >
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuItem onClick={() => navigate({ to: paths.app.coberturaPostulacionDetalle.getHref(p.id) })}>
            <EyeIcon /> Ver detalle
          </DropdownMenuItem>
          {a.cambiarCupo ? (
            <DropdownMenuItem
              // Con la forma Abierta va a la página (como la postulación); por el origen, al modal.
              onClick={() =>
                p.forma === "ABIERTA"
                  ? navigate({ to: paths.app.coberturaPostulacionCambiarCupo.getHref(p.id) })
                  : setAbierto("cupo")
              }
            >
              <ArrowsLeftRightIcon /> Cambiar cupo
            </DropdownMenuItem>
          ) : null}
          {a.agregarMatricula ? (
            <DropdownMenuItem onClick={() => setAbierto("matricula")}>
              <PersonAddIcon /> Agregar matrícula complementaria
            </DropdownMenuItem>
          ) : null}
          {a.liberar ? (
            <DropdownMenuItem onClick={() => setAbierto("liberar")}>
              <PersonRemoveIcon /> Liberar cupo
            </DropdownMenuItem>
          ) : null}
          {a.anular ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setAbierto("anular")}>
                <ProhibitIcon /> Anular postulación
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto === "matricula" ? <DialogAgregarMatriculaAdscripcion postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "liberar" ? <DialogLiberarCupo postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "cupo" ? <DialogCambiarCupo postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "anular" ? <DialogAnularPostulacion postulacion={p} onOpenChange={cerrar} /> : null}
    </>
  )
}

/** Pestaña Postulaciones (Sección 2.16.2): las del origen y las que recibe el establecimiento. */
export function PostulacionesTab({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = usePostulacionesQuery({
    search: search.q,
    convocatoria: search.convocatoria,
    grado: search.grado,
    pageIndex,
    pageSize,
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
    columnVisibilityStorageKey: "table-postulaciones-complementaria",
  })

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  const anio = data?.rows.find((r) => r.convocatoriaId === search.convocatoria)?.convocatoriaAnio
  const chips = [
    search.convocatoria != null && {
      key: "convocatoria",
      label: anio ? `Convocatoria ${anio}` : "Convocatoria",
      clear: () => setSearch({ convocatoria: undefined }),
    },
    search.grado && { key: "grado", label: search.grado, clear: () => setSearch({ grado: undefined }) },
  ].filter((c): c is { key: string; label: string; clear: () => Promise<void> } => Boolean(c))

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <Buscador
            id="postulaciones-buscar"
            placeholder="Buscar por número de postulación, nombre o documento"
            texto={search.q ?? ""}
            onTexto={(q) => setSearch({ q: q || undefined })}
            filtros={[{ key: "grado", label: "Grado", items: [{ value: "", label: "Todos" }, ...GRADOS.map((g) => ({ value: g, label: g }))], value: search.grado ?? "" }]}
            onAplicar={(v) => setSearch({ grado: v.grado || undefined })}
            onLimpiar={() => setSearch({ convocatoria: undefined, grado: undefined, q: undefined })}
          />
          {chips.length ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="soft" color="info" className="text-xs font-medium tracking-normal">
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Quitar filtro ${chip.label}`}
                    className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={chip.clear}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="link"
                color="primary"
                size="sm"
                onClick={() => {
                  setSearch({ convocatoria: undefined, grado: undefined, q: undefined })
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        {data ? (
          <p className="mb-3 text-sm font-medium tabular-nums">
            {data.totalCount === 1 ? "1 postulación" : `${data.totalCount} postulaciones`}
          </p>
        ) : null}
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage={
            chips.length || search.q
              ? "No hay postulaciones que coincidan con la búsqueda y los filtros."
              : "Aún no hay postulaciones. Use Nueva postulación para postular a un estudiante."
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
