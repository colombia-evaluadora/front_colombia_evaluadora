"use no memo"

import { useState, type ReactNode } from "react"
import { AccionesFila, BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenToolbar,
  TableScreenActions,
} from "@/components/layout/table-screen"
import { Pagination } from "@/components/pagination"
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
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
      // El sentido del convenio como texto secundario (como el documento bajo el nombre del estudiante): puede
      // partirse si falta ancho. La etiqueta, que no se parte, se montaba sobre «Año» o sacaba la tabla del borde.
      <div className="flex flex-col whitespace-normal">
        <span className="font-medium">{row.original.contraparte}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.soyReceptor ? "Envía a sus estudiantes" : "Recibe a mis estudiantes"}
        </span>
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
    // Hasta 5 íconos de 36 px (más el ⁞ si pasan de 6).
    size: 5 * 36 + 16,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesConvenio convenio={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

type Dialogo = "detalle" | "aceptar" | "rechazar" | "renovar" | "finalizar" | null

function AccionesConvenio({ convenio: c }: { convenio: Convenio }) {
  const { puedeEditar } = useMenuPermission(MENU_COMPLEMENTARIA)
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const a = accionesConvenio(c)
  const cerrar = (open: boolean) => !open && setAbierto(null)
  return (
    <>
      {/* Íconos con tooltip, «Ver detalle» primero; más de 6 van a «Más acciones» (CLAUDE.md §13). */}
      <AccionesFila limite={6}>
          <BotonAccion modo="icon" label="Ver detalle" Icon={EyeIcon} onClick={() => setAbierto("detalle")} />
          {puedeEditar && a.responder ? (
            <>
              <BotonAccion modo="icon" label="Aceptar" Icon={CheckIcon} onClick={() => setAbierto("aceptar")} />
              <BotonAccion modo="icon" label="Rechazar" Icon={XIcon} onClick={() => setAbierto("rechazar")} />
            </>
          ) : null}
          {puedeEditar && a.renovar ? (
            <BotonAccion modo="icon" label="Renovar convenio" Icon={ArrowCounterClockwiseIcon} onClick={() => setAbierto("renovar")} />
          ) : null}
          {puedeEditar && a.finalizar ? (
            <>
              <BotonAccion modo="icon" label="Finalizar" Icon={ProhibitIcon} onClick={() => setAbierto("finalizar")} />
            </>
          ) : null}
        </AccionesFila>
      {abierto === "detalle" ? <DialogDetalleConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "aceptar" ? <DialogAceptarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "rechazar" ? <DialogRechazarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "renovar" ? <DialogRenovarConvenio convenio={c} onOpenChange={cerrar} /> : null}
      {abierto === "finalizar" ? <DialogFinalizarConvenio convenio={c} onOpenChange={cerrar} /> : null}
    </>
  )
}

/** Pestaña Convenios de adscripción (Sección 2.16.1): los que recibe y los que envía. */
export function ConveniosTab({ encabezado, accion }: { encabezado: ReactNode; accion?: ReactNode }) {
  const search = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useConveniosQuery({ search: search.q, anio: search.anio, pageIndex, pageSize })
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
            filtros={[{ key: "anio", label: "Año", items: [{ value: "", label: "Todos" }, ...ANIOS.map((a) => ({ value: String(a), label: String(a) }))], value: search.anio ? String(search.anio) : "" }]}
            onBuscar={(v, q) => setSearch({ q: q || undefined, anio: v.anio ? Number(v.anio) : undefined })}
            onLimpiar={() => setSearch({ anio: undefined, q: undefined })}
          />
          {/* Crear va en la línea del buscador, a la derecha (CLAUDE.md §13), no en el título. */}
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
