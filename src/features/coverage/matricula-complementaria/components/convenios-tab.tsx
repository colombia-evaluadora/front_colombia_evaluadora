"use no memo"

import { useState, type ReactNode } from "react"
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
  ArrowCounterClockwiseIcon,
  CheckIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  
  ProhibitIcon,
  XIcon,
} from "@/components/ui/icons"
import { Buscador } from "@/features/coverage/matricula-complementaria/components/buscador"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaComplementariaRoute } from "@/router"

import { accionesConvenio, useConveniosQuery } from "@/features/coverage/matricula-complementaria/api/convenios"
import type { Convenio } from "@/features/coverage/matricula-complementaria/api/types"
import { ESTADO_CONVENIO, Marca } from "@/features/coverage/matricula-complementaria/api/ui-mappings"
import {
  DialogAceptarConvenio,
  DialogDetalleConvenio,
  DialogFinalizarConvenio,
  DialogRechazarConvenio,
  DialogRenovarConvenio,
} from "@/features/coverage/matricula-complementaria/components/dialogs-convenio"
import { MENU_COMPLEMENTARIA } from "@/features/coverage/matricula-complementaria/components/convocatorias-tab"
import { useEstablecimiento } from "@/features/coverage/matricula-complementaria/hooks/use-establecimiento"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const ANIOS = [2028, 2027, 2026, 2025]
const num = "block text-center tabular-nums"

const columns: ColumnDef<Convenio>[] = [
  {
    id: "contraparte",
    accessorFn: (r) => r.id,
    meta: { label: "Establecimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
    cell: ({ row }) => (
      <div className="grid justify-items-start gap-1">
        <span className="font-medium">{row.original.contraparte}</span>
        <Badge variant="soft" color="info" className="rounded-full text-xs font-medium tracking-normal">
          {row.original.soyReceptor ? "Envía a sus estudiantes" : "Recibe a mis estudiantes"}
        </Badge>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "anio",
    accessorFn: (r) => r.id,
    meta: { label: "Año" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Año" />,
    cell: ({ row }) => <span className="tabular-nums">{row.original.anio}</span>,
    enableSorting: false,
  },
  {
    id: "grados",
    accessorFn: (r) => r.id,
    meta: { label: "Grados" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Grados" />,
    cell: ({ row }) => row.original.grados.join(", "),
    enableSorting: false,
  },
  {
    id: "especialidades",
    accessorFn: (r) => r.id,
    meta: { label: "Especialidades" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Especialidades" />,
    cell: ({ row }) => row.original.especialidades.join(", "),
    enableSorting: false,
  },
  {
    id: "cupo",
    accessorFn: (r) => r.id,
    meta: { label: "Cupo máximo de adscritos" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cupo máximo de adscritos" className="justify-center" />,
    cell: ({ row }) => (
      <span className={num} aria-label={row.original.cupoMaximo == null ? "Sin límite" : undefined}>
        {row.original.cupoMaximo ?? "—"}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "adscritos",
    accessorFn: (r) => r.id,
    meta: { label: "Adscritos matriculados" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Adscritos matriculados" className="justify-center" />,
    cell: ({ row }) => <span className={num}>{row.original.adscritos}</span>,
    enableSorting: false,
  },
  {
    id: "estado",
    accessorFn: (r) => r.id,
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => <Marca {...ESTADO_CONVENIO[row.original.estado]} />,
    enableSorting: false,
  },
  {
    id: "actions",
    size: 48,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesConvenio convenio={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

type Dialogo = "detalle" | "aceptar" | "rechazar" | "renovar" | "finalizar" | null

function AccionesConvenio({ convenio: c }: { convenio: Convenio }) {
  const permiso = useMenuPermission(MENU_COMPLEMENTARIA)
  const { territorial } = useEstablecimiento()
  // Territoriales: solo lectura.
  const puedeEditar = permiso.puedeEditar && !territorial
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const a = accionesConvenio(c)
  const cerrar = (open: boolean) => !open && setAbierto(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones del convenio con ${c.contraparte}`} />}
        >
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={() => setAbierto("detalle")}>
            <EyeIcon /> Ver detalle
          </DropdownMenuItem>
          {puedeEditar && a.responder ? (
            <>
              <DropdownMenuItem onClick={() => setAbierto("aceptar")}>
                <CheckIcon /> Aceptar
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setAbierto("rechazar")}>
                <XIcon /> Rechazar
              </DropdownMenuItem>
            </>
          ) : null}
          {puedeEditar && a.renovar ? (
            <DropdownMenuItem onClick={() => setAbierto("renovar")}>
              <ArrowCounterClockwiseIcon /> Renovar convenio
            </DropdownMenuItem>
          ) : null}
          {puedeEditar && a.finalizar ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setAbierto("finalizar")}>
                <ProhibitIcon /> Finalizar
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto === "detalle" ? <DialogDetalleConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "aceptar" ? <DialogAceptarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "rechazar" ? <DialogRechazarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "renovar" ? <DialogRenovarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "finalizar" ? <DialogFinalizarConvenio convenio={c} onOpenChange={cerrar} /> : null}
    </>
  )
}

/** Pestaña Convenios de adscripción (Sección 2.16.1): los que recibe y los que envía. */
export function ConveniosTab({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { establecimientoId } = useEstablecimiento()
  const { data, isPending, isError, error, refetch } = useConveniosQuery({
    search: search.q,
    anio: search.anio,
    establecimiento: establecimientoId,
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
    columnVisibilityStorageKey: "table-convenios-complementaria",
  })

  const setSearch = (patch: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <Buscador
            id="convenios-buscar"
            placeholder="Buscar por establecimiento"
            texto={search.q ?? ""}
            onTexto={(q) => setSearch({ q: q || undefined })}
            filtros={[{ key: "anio", label: "Año", items: [{ value: "", label: "Todos" }, ...ANIOS.map((a) => ({ value: String(a), label: String(a) }))], value: search.anio ? String(search.anio) : "" }]}
            onAplicar={(v) => setSearch({ anio: v.anio ? Number(v.anio) : undefined })}
            onLimpiar={() => setSearch({ anio: undefined, q: undefined })}
          />
          {search.anio ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              <Badge variant="soft" color="info" className="text-xs font-medium tracking-normal">
                {search.anio}
                <button
                  type="button"
                  aria-label={`Quitar filtro ${search.anio}`}
                  className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => setSearch({ anio: undefined })}
                >
                  <XIcon className="size-3.5" />
                </button>
              </Badge>
              <Button
                type="button"
                variant="link"
                color="primary"
                size="sm"
                onClick={() => {
                  setSearch({ anio: undefined, q: undefined })
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          ) : null}
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
            search.anio || search.q
              ? "No hay convenios que coincidan con la búsqueda y los filtros."
              : "Aún no hay convenios. Use Nuevo convenio para proponer uno a otro establecimiento."
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
