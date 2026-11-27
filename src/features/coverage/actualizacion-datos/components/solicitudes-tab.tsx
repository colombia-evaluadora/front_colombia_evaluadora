"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable, DataTableColumnHeader, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle, TableScreenToolbar } from "@/components/layout/table-screen"
import { useNotify } from "@/components/notice/notice-context"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CheckIcon, DotsThreeVerticalIcon, EyeIcon, FileDownloadOutlinedIcon, PaperclipIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"
import { downloadReport } from "@/lib/report-client"
import { coberturaActualizacionDatosRoute } from "@/router"

import { filtrosSolicitudes, MENU_ACTUALIZACION, useSolicitudesQuery } from "@/features/coverage/actualizacion-datos/api/actualizacion"
import type { EstadoSolicitud, SolicitudCorreccion } from "@/features/coverage/actualizacion-datos/api/types"
import {
  DialogAprobarSolicitud,
  DialogDetalleSolicitud,
  DialogRechazarSolicitud,
} from "@/features/coverage/actualizacion-datos/components/dialogs-solicitud"
import { Buscador } from "@/features/coverage/matricula-complementaria/components/buscador"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const ESTADO: Record<EstadoSolicitud, { label: string; color: "warning" | "success" | "destructive" }> = {
  PENDIENTE: { label: "Pendiente", color: "warning" },
  APROBADA: { label: "Aprobada", color: "success" },
  RECHAZADA: { label: "Rechazada", color: "destructive" },
}

/** «Rosa R.»: primer nombre e inicial del primer apellido; el completo va en el texto emergente. */
function corto(nombre: string) {
  const p = nombre.trim().split(/\s+/)
  if (p.length < 2) return nombre
  // Con 2 o 3 palabras el primer apellido es la segunda; con 4, la tercera.
  const apellido = p.length >= 4 ? p[2] : p[1]
  return `${p[0]} ${apellido[0]}.`
}

/** dd/mm/aa: formato corto de la columna Fecha. */
const fechaCorta = (iso: string) => {
  const [a, m, d] = iso.split("-")
  return `${d}/${m}/${a.slice(2)}`
}

type Dialogo = "aprobar" | "rechazar" | "detalle"

function Acciones({ s, onAbrir }: { s: SolicitudCorreccion; onAbrir: (d: Dialogo) => void }) {
  const { puedeEditar } = useMenuPermission(MENU_ACTUALIZACION)
  const { notify } = useNotify()
  const pendiente = s.estado === "PENDIENTE"

  async function verSoporte() {
    if (s.soporteId == null) return
    try {
      const { url } = await fetchArchivoViewUrl(s.soporteId)
      window.open(url, "_blank", "noopener")
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Acciones de la solicitud de ${s.solicitante}`} />}
      >
        <DotsThreeVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {pendiente ? (
          <>
            <DropdownMenuItem disabled={s.soporteId == null} onClick={() => void verSoporte()}>
              <PaperclipIcon /> Ver soporte
            </DropdownMenuItem>
            {puedeEditar ? (
              <>
                <DropdownMenuItem onClick={() => onAbrir("aprobar")}>
                  <CheckIcon /> Aprobar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAbrir("rechazar")}>
                  <XIcon /> Rechazar
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <DropdownMenuItem onClick={() => onAbrir("detalle")}>
            <EyeIcon /> Ver detalle
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const texto = (id: keyof SolicitudCorreccion, title: string, completo?: (s: SolicitudCorreccion) => string): ColumnDef<SolicitudCorreccion> => ({
  id,
  accessorFn: (s) => s[id],
  meta: { label: title },
  header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
  cell: ({ row }) => {
    // Valor actual vacío (p. ej. sin segundo nombre) llega null.
    const v = row.original[id] == null || row.original[id] === "" ? "—" : String(row.original[id])
    return completo ? <span title={completo(row.original)}>{corto(v)}</span> : v
  },
  enableSorting: false,
})

function columnas(onAbrir: (s: SolicitudCorreccion, d: Dialogo) => void): ColumnDef<SolicitudCorreccion>[] {
  return [
    texto("solicitante", "Solicitante", (s) => s.solicitante),
    texto("estudiante", "Estudiante", (s) => s.estudiante),
    { ...texto("dato", "Dato"), enableHiding: false },
    { ...texto("valorActual", "Valor actual"), enableHiding: false },
    { ...texto("valorSolicitado", "Valor solicitado"), enableHiding: false },
    {
      id: "fecha",
      accessorFn: (s) => s.fecha,
      meta: { label: "Fecha" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span className="tabular-nums">{fechaCorta(row.original.fecha)}</span>,
      enableSorting: false,
    },
    {
      id: "estado",
      accessorFn: (s) => s.estado,
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const e = ESTADO[row.original.estado]
        return (
          <Badge variant="soft" color={e.color} className="text-xs font-medium tracking-normal">
            {e.label}
          </Badge>
        )
      },
      enableSorting: false,
    },
    {
      id: "actions",
      size: 48,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => <Acciones s={row.original} onAbrir={(d) => onAbrir(row.original, d)} />,
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

const ESTADOS_FILTRO = [
  { value: "TODOS", label: "Todos" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "APROBADA", label: "Aprobada" },
  { value: "RECHAZADA", label: "Rechazada" },
]

function ExportarExcel() {
  const search = coberturaActualizacionDatosRoute.useSearch()
  const { notify } = useNotify()
  const [pendiente, setPendiente] = useState(false)
  async function exportar() {
    setPendiente(true)
    const r = await downloadReport("actualizacion-datos-solicitudes", { format: "excel", filters: filtrosSolicitudes(search) })
    setPendiente(false)
    if (r.status === "error") notify(r.message, { variant: "error" })
  }
  return (
    <Button type="button" variant="outline" color="neutral" size="sm" disabled={pendiente} onClick={() => void exportar()}>
      {pendiente ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
      Exportar Excel
    </Button>
  )
}

/**
 * Pestaña Solicitudes de corrección (C.6.SOL.1–3; Sección 2.19, Reglas 43 y 69):
 * datos de identidad pedidos desde Mi cuenta. Abre filtrada en Pendiente.
 */
export function SolicitudesTab({ pestanas }: { pestanas: ReactNode }) {
  const search = coberturaActualizacionDatosRoute.useSearch()
  const navigate = coberturaActualizacionDatosRoute.useNavigate()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { data, isPending, isError, error, refetch } = useSolicitudesQuery(search, { pageIndex, pageSize })
  const [abierto, setAbierto] = useState<{ s: SolicitudCorreccion; d: Dialogo } | null>(null)
  const { table } = useDataTable({
    columns: columnas((s, d) => setAbierto({ s, d })),
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (s) => String(s.solicitudId),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    columnVisibilityStorageKey: "table-actualizacion-solicitudes",
  })

  const setSearch = (patch: Partial<typeof search>) => navigate({ search: (prev) => ({ ...prev, ...patch, page: 0 }), replace: true })
  const estado = search.estado ?? "PENDIENTE"
  const conFiltro = estado !== "TODOS"
  const cerrar = () => setAbierto(null)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle action={<ExportarExcel />}>Actualización de datos</TableScreenTitle>
        {pestanas}
        <TableScreenToolbar>
          <Buscador
            id="solicitudes-buscar"
            placeholder="Buscar por solicitante o estudiante"
            texto={search.q ?? ""}
            onTexto={(q) => setSearch({ q: q || undefined })}
            filtros={[{ key: "estado", label: "Estado", items: ESTADOS_FILTRO, value: estado }]}
            onAplicar={(v) => setSearch({ estado: v.estado === "PENDIENTE" || !v.estado ? undefined : (v.estado as typeof search.estado) })}
            onLimpiar={() => setSearch({ estado: "TODOS", q: undefined })}
          />
          {conFiltro || search.q ? (
            <div className="flex w-full flex-wrap items-center gap-2">
              {conFiltro ? (
                <Badge variant="soft" color="info" className="text-xs font-medium tracking-normal">
                  Estado: {ESTADO[estado].label}
                  <button
                    type="button"
                    aria-label="Quitar filtro de estado"
                    className="rounded-xs hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    onClick={() => setSearch({ estado: "TODOS" })}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </Badge>
              ) : null}
              <Button type="button" variant="link" color="primary" size="sm" onClick={() => setSearch({ estado: "TODOS", q: undefined })}>
                <XIcon data-icon="inline-start" />
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
            conFiltro || search.q ? "No hay solicitudes de corrección que coincidan con la búsqueda y los filtros." : "Aún no hay solicitudes de corrección."
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
      {abierto?.d === "aprobar" ? <DialogAprobarSolicitud solicitud={abierto.s} onClose={cerrar} /> : null}
      {abierto?.d === "rechazar" ? <DialogRechazarSolicitud solicitud={abierto.s} onClose={cerrar} /> : null}
      {abierto?.d === "detalle" ? <DialogDetalleSolicitud solicitud={abierto.s} onClose={cerrar} /> : null}
    </TableScreen>
  )
}
