"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenToolbar } from "@/components/layout/table-screen"
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
import { CalendarIcon, CheckIcon, DotsThreeVerticalIcon, PencilIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaPromocionRoute } from "@/router"

import { formatoFecha, formatoNota } from "@/features/coverage/promocion-nivelacion/api/formato"
import {
  useDetallePromocionQuery,
  useOpcionesPromocionQuery,
  usePendientesQuery,
} from "@/features/coverage/promocion-nivelacion/api/promocion"
import type { AreaPendiente, DetallePromocion, Promovido, Seguimiento } from "@/features/coverage/promocion-nivelacion/api/types"
import {
  DialogAmpliarPlazo,
  DialogAnulacionBloqueada,
  DialogAnularPromocion,
  DialogCorregirNivelacion,
  DialogRegistrarNivelacion,
} from "@/features/coverage/promocion-nivelacion/components/dialogs-promocion"
import { BotonExpandir, FiltrosFila } from "@/features/coverage/promocion-nivelacion/components/filtros"
import { LIMPIAR_POR_ESTABLECIMIENTO, useFiltroEstablecimiento } from "@/features/coverage/promocion-nivelacion/hooks/use-filtro-establecimiento"
import { usePermisosPromocion } from "../hooks/use-permisos-promocion"

const SEGUIMIENTO: Record<Seguimiento, { label: string; color: "warning" | "destructive" | "success" }> = {
  CON_PENDIENTES: { label: "Con áreas pendientes", color: "warning" },
  VENCIDO: { label: "Vencido", color: "destructive" },
  NIVELADO: { label: "Nivelado", color: "success" },
}

const marca = "text-xs font-medium tracking-normal"

/** «Nivelada el 15/03/2028 con 7,0 · J. Rincón» o «Intento del 02/03/2028 con 5,4». */
function ultimoRegistro(a: AreaPendiente) {
  const u = a.intentos.at(-1)
  if (!u) return "Sin intentos"
  return a.estado === "NIVELADA"
    ? `Nivelada el ${formatoFecha(u.fecha)} con ${formatoNota(u.nota)} · ${u.responsable}`
    : `Intento del ${formatoFecha(u.fecha)} con ${formatoNota(u.nota)}`
}

type DialogoArea = { tipo: "registrar" | "corregir"; area: AreaPendiente } | null

function AccionesArea({ area, onAbrir }: { area: AreaPendiente; onAbrir: (d: DialogoArea) => void }) {
  const { puedeNivelar: puedeEditar } = usePermisosPromocion()
  const registrar = area.estado === "PENDIENTE"
  const corregir = area.intentos.length > 0
  if (!puedeEditar || (!registrar && !corregir)) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${area.area}`} />}>
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {registrar ? (
          <DropdownMenuItem onClick={() => onAbrir({ tipo: "registrar", area })}>
            <CheckIcon /> Registrar nivelación
          </DropdownMenuItem>
        ) : null}
        {corregir ? (
          <DropdownMenuItem onClick={() => onAbrir({ tipo: "corregir", area })}>
            <PencilIcon /> Corregir nivelación
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TablaAreas({ p, d }: { p: Promovido; d: DetallePromocion }) {
  const [abierto, setAbierto] = useState<DialogoArea>(null)
  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="px-3 py-1.5 font-medium">Área pendiente</th>
            <th className="px-3 py-1.5 font-medium">Estado</th>
            <th className="px-3 py-1.5 font-medium">Último registro</th>
            <th className="px-3 py-1.5 text-center font-medium">Intentos</th>
            <th className="w-12 px-3 py-1.5">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {d.areas.map((a) => (
            <tr key={a.id} className="border-t border-border">
              <td className="px-3 py-1.5">{a.area}</td>
              <td className="px-3 py-1.5">
                <Badge variant="soft" color={a.estado === "NIVELADA" ? "success" : "warning"} className={marca}>
                  {a.estado === "NIVELADA" ? "Nivelada" : "Pendiente"}
                </Badge>
              </td>
              <td className="px-3 py-1.5">{ultimoRegistro(a)}</td>
              <td className="px-3 py-1.5 text-center tabular-nums">{a.intentos.length}</td>
              <td className="px-3 py-1">
                <AccionesArea area={a} onAbrir={setAbierto} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {abierto?.tipo === "registrar" ? <DialogRegistrarNivelacion promovido={p} detalle={d} area={abierto.area} onClose={() => setAbierto(null)} /> : null}
      {abierto?.tipo === "corregir" ? <DialogCorregirNivelacion promovido={p} detalle={d} area={abierto.area} onClose={() => setAbierto(null)} /> : null}
    </>
  )
}

/** Al abrir un estudiante: cada área pendiente con su estado y su último intento. */
function Detalle({ p }: { p: Promovido }) {
  const { data, isPending, error } = useDetallePromocionQuery(p.promocionId)
  if (isPending)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SpinnerIcon className="animate-spin" aria-hidden />
        Cargando…
      </div>
    )
  if (!data) return <p className="text-sm text-red">{getErrorMessage(error)}</p>
  return <TablaAreas p={p} d={data} />
}

/** Ampliar plazo necesita el fin del período: pide el detalle al abrir. */
function AmpliarPlazo({ p, onClose }: { p: Promovido; onClose: () => void }) {
  const { data } = useDetallePromocionQuery(p.promocionId)
  return data ? <DialogAmpliarPlazo promovido={p} detalle={data} onClose={onClose} /> : null
}

type Dialogo = "plazo" | "anular" | "bloqueada" | null

function AccionesPromovido({ p }: { p: Promovido }) {
  const { puedeGestionar, puedeAnular: puedeEliminar } = usePermisosPromocion()
  const [abierto, setAbierto] = useState<Dialogo>(null)
  const cerrar = () => setAbierto(null)
  const plazo = puedeGestionar && p.seguimiento !== "NIVELADO"
  if (!plazo && !puedeEliminar) return null
  // Sin áreas niveladas y sin matrícula en el período siguiente se puede anular.
  const anulable = p.niveladas === 0 && !p.grupoActual
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de ${p.estudiante}`} />}>
          <DotsThreeVerticalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {plazo ? (
            <DropdownMenuItem onClick={() => setAbierto("plazo")}>
              <CalendarIcon /> Ampliar plazo
            </DropdownMenuItem>
          ) : null}
          {plazo && puedeEliminar ? <DropdownMenuSeparator /> : null}
          {puedeEliminar ? (
            <DropdownMenuItem variant="destructive" onClick={() => setAbierto(anulable ? "anular" : "bloqueada")}>
              <ProhibitIcon /> Anular promoción
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {abierto === "plazo" ? <AmpliarPlazo p={p} onClose={cerrar} /> : null}
      {abierto === "anular" ? <DialogAnularPromocion promovido={p} onClose={cerrar} /> : null}
      {abierto === "bloqueada" ? <DialogAnulacionBloqueada promovido={p} onClose={cerrar} /> : null}
    </>
  )
}

function columnas(expandidoId: number | null, onToggle: (id: number) => void): ColumnDef<Promovido>[] {
  return [
    {
      id: "expand",
      header: () => <span className="sr-only">Ver detalle</span>,
      cell: ({ row }) => (
        <BotonExpandir
          abierto={expandidoId === row.original.promocionId}
          nombre={row.original.estudiante}
          onClick={() => onToggle(row.original.promocionId)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      id: "estudiante",
      accessorFn: (r) => r.estudiante,
      meta: { label: "Estudiante" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiante" />,
      cell: ({ row }) => (
        <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => onToggle(row.original.promocionId)}>
          {row.original.estudiante}
        </button>
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "promovidoDe",
      accessorFn: (r) => r.promovidoDe,
      meta: { label: "Promovido de" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Promovido de" />,
      cell: ({ row }) => row.original.promovidoDe,
      enableSorting: false,
    },
    {
      id: "grupoActual",
      accessorFn: (r) => r.grupoActual,
      meta: { label: "Grupo actual" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grupo actual" />,
      cell: ({ row }) => row.original.grupoActual ?? <span className="text-muted-foreground">Sin matrícula</span>,
      enableSorting: false,
    },
    {
      id: "niveladas",
      accessorFn: (r) => r.niveladas,
      meta: { label: "Niveladas" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Niveladas" />,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.niveladas} de {row.original.total}
        </span>
      ),
      enableSorting: false,
    },
    {
      id: "plazo",
      accessorFn: (r) => r.plazo,
      meta: { label: "Plazo" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Plazo" />,
      cell: ({ row }) => <span className="tabular-nums">{formatoFecha(row.original.plazo)}</span>,
      enableSorting: false,
    },
    {
      id: "seguimiento",
      accessorFn: (r) => r.seguimiento,
      meta: { label: "Seguimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Seguimiento" />,
      cell: ({ row }) => (
        <Badge variant="soft" color={SEGUIMIENTO[row.original.seguimiento].color} className={marca}>
          {SEGUIMIENTO[row.original.seguimiento].label}
        </Badge>
      ),
      enableSorting: false,
    },
    {
      id: "actions",
      size: 48,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <AccionesPromovido p={row.original} />,
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

/** Pestaña Áreas pendientes (C.5.PEN.1–8; Sección 4.7): los promovidos con áreas pendientes de todos los años. */
export function AreasPendientesTab({ encabezado }: { encabezado: ReactNode }) {
  const search = coberturaPromocionRoute.useSearch()
  const navigate = coberturaPromocionRoute.useNavigate()
  const { data: op } = useOpcionesPromocionQuery(search.ee ? Number(search.ee) : null)
  const filtroEe = useFiltroEstablecimiento(search.ee)
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = usePendientesQuery(search, { pageIndex, pageSize })
  const [expandidoId, setExpandidoId] = useState<number | null>(null)
  const { table } = useDataTable({
    columns: columnas(expandidoId, (id) => setExpandidoId((actual) => (actual === id ? null : id))),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (r) => String(r.promocionId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-promocion-pendientes",
  })

  const setFiltro = (key: string, value: string) =>
    navigate({
      search: (prev) => ({
        ...prev,
        [key]: key === "anio" ? (value ? Number(value) : undefined) : value || undefined,
        ...(key === "ee" ? LIMPIAR_POR_ESTABLECIMIENTO : {}),
        page: 0,
      }),
      replace: true,
    })
  const filtros = [
    ...filtroEe,
    {
      key: "anio",
      label: "Año de la promoción",
      options: (op?.anios ?? []).map((a) => ({ value: String(a), label: String(a) })),
      value: search.anio ? String(search.anio) : "",
    },
    { key: "sede", label: "Sede", options: op?.sedes ?? [], value: search.sede ?? "", todos: "Todas" },
    { key: "jornada", label: "Jornada", options: op?.jornadas ?? [], value: search.jornada ?? "", todos: "Todas" },
    { key: "grado", label: "Grado", options: op?.grados ?? [], value: search.grado ?? "", todos: "Todos" },
    {
      key: "seguimiento",
      label: "Seguimiento",
      options: Object.entries(SEGUIMIENTO).map(([value, s]) => ({ value, label: s.label })),
      value: search.seguimiento ?? "",
    },
  ]

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado}
        <TableScreenToolbar>
          <FiltrosFila id="pendientes" filtros={filtros} onChange={setFiltro} />
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          errorMessage={error ? getErrorMessage(error) : undefined}
          emptyMessage="No hay estudiantes promovidos con áreas pendientes para estos filtros."
          renderSubRow={(row) => (expandidoId === row.original.promocionId ? <Detalle p={row.original} /> : null)}
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
