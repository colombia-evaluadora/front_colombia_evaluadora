"use no memo"

import { useState, type ReactNode } from "react"
import { DialogPostulacion } from "@/features/coverage/matricula-complementaria/components/dialog-postulacion"
import { AccionesFila, BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"
import { useNavigate } from "@tanstack/react-router"
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
  ArrowsLeftRightIcon,
  EyeIcon,
  
  PersonRemoveIcon,
  ProhibitIcon,
  PersonAddIcon,
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
    // Hasta 7 íconos de 36 px (más el ⁞ si pasan de 6).
    size: 7 * 36 + 16,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <AccionesPostulacion postulacion={row.original} />,
    enableHiding: false,
    enableSorting: false,
  },
]

type Dialogo = "matricula" | "liberar" | "cupo" | "cupoAbierta" | "anular" | null

function AccionesPostulacion({ postulacion: p }: { postulacion: Postulacion }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const a = accionesPostulacion(p)
  const cerrar = (open: boolean) => !open && setAbierto(null)

  return (
    <>
      {/* Íconos con tooltip, «Ver detalle» primero; más de 6 van a «Más acciones» (CLAUDE.md §13). */}
      <AccionesFila limite={6}>
          <BotonAccion modo="icon" label="Ver detalle" Icon={EyeIcon} onClick={() => navigate({ to: paths.app.coberturaPostulacionDetalle.getHref(p.id) })} />
          {/* Cambiar cupo: con la forma Abierta, el modal de la postulación; por el origen, el suyo. */}
          {a.cambiarCupo ? (
            <BotonAccion modo="icon" label="Cambiar cupo" Icon={ArrowsLeftRightIcon} onClick={() => setAbierto(p.forma === "ABIERTA" ? "cupoAbierta" : "cupo")} />
          ) : null}
          {a.agregarMatricula ? (
            <BotonAccion modo="icon" label="Agregar matrícula complementaria" Icon={PersonAddIcon} onClick={() => setAbierto("matricula")} />
          ) : null}
          {a.liberar ? (
            <BotonAccion modo="icon" label="Liberar cupo" Icon={PersonRemoveIcon} onClick={() => setAbierto("liberar")} />
          ) : null}
          {a.anular ? (
            <>
              <BotonAccion modo="icon" label="Anular postulación" Icon={ProhibitIcon} destructivo onClick={() => setAbierto("anular")} />
            </>
          ) : null}
        </AccionesFila>
      {abierto === "matricula" ? <DialogAgregarMatriculaAdscripcion postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "liberar" ? <DialogLiberarCupo postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "cupo" ? <DialogCambiarCupo postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "cupoAbierta" ? <DialogPostulacion postulacion={p} onOpenChange={cerrar} /> : null}
      {abierto === "anular" ? <DialogAnularPostulacion postulacion={p} onOpenChange={cerrar} /> : null}
    </>
  )
}

/** Pestaña Postulaciones (Sección 2.16.2): las del origen y las que recibe el establecimiento. */
export function PostulacionesTab({ encabezado, accion }: { encabezado: ReactNode; accion?: ReactNode }) {
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

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <Buscador
            // Se rearma cuando llega el año de la convocatoria: el texto muestra «convocatoria:(2027)», no el id.
            key={anio ?? "sin-anio"}
            id="postulaciones-buscar"
            placeholder="Buscar por número de postulación, nombre o documento"
            texto={search.q ?? ""}
            filtros={[
              {
                // Llega de «Ver postulaciones» de una convocatoria: solo se escribe en el buscador.
                key: "convocatoria",
                label: "Convocatoria",
                soloTexto: true,
                items: [
                  { value: "", label: "Todas" },
                  ...(search.convocatoria != null ? [{ value: String(search.convocatoria), label: String(anio ?? search.convocatoria) }] : []),
                ],
                value: search.convocatoria != null ? String(search.convocatoria) : "",
              },
              { key: "grado", label: "Grado", items: [{ value: "", label: "Todos" }, ...GRADOS.map((g) => ({ value: g, label: g }))], value: search.grado ?? "" },
            ]}
            onBuscar={(v, q) =>
              setSearch({ q: q || undefined, grado: v.grado || undefined, convocatoria: v.convocatoria ? Number(v.convocatoria) : undefined })
            }
            onLimpiar={() => setSearch({ convocatoria: undefined, grado: undefined, q: undefined })}
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
            search.convocatoria != null || search.grado || search.q
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
