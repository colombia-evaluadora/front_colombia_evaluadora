"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { TableScreen, TableScreenBody, TableScreenHeader } from "@/components/layout/table-screen"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowUUpLeftIcon,
  CalendarPlusIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  EyeIcon,
  PaperPlaneTiltIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { Paginas, usePaginado } from "./paginado-territorial"
import { AccionFila, fecha, useBusquedaTerritorial } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInscritosRoute } from "@/router"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import {
  usePublicarCalendario,
} from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import {
  useCalendariosQuery,
  useContextoTerritorialQuery,
  useProyeccionQuery,
  useRedistribucionQuery,
  useSolicitudesRetiroQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type { SeccionTerritorial } from "@/features/coverage/inscripcion-reservas/api/schema"
import type {
  CalendarioCobertura,
  EstadoProyeccion,
  ProyeccionEstablecimiento,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import {
  AmpliarLimiteDialog,
  InscripcionEnLineaDialog,
  CalendarioDialog,
  ESTADO_CALENDARIO_UI,
  nombreCalendario,
} from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-territorial"
import {
  AprobarProyeccionDialog,
  DevolverProyeccionDialog,
  ESTADO_PROYECCION_UI,
  ProyeccionDetalleVista,
} from "@/features/coverage/inscripcion-reservas/components/table/proyeccion-territorial"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import {
  SolicitudesRetiroSeccion,
  SolicitudRetiroVista,
} from "@/features/coverage/inscripcion-reservas/components/table/solicitudes-retiro-territorial"
import { OrientacionesSeccion } from "@/features/coverage/inscripcion-reservas/components/table/orientaciones-territorial"
import { CuposContratadosSeccion } from "@/features/coverage/inscripcion-reservas/components/table/cupos-contratados-territorial"
import { RedistribucionSeccion } from "@/features/coverage/inscripcion-reservas/components/table/redistribucion-territorial"
import {
  OrientarVista,
  SeguimientoDetalleVista,
  SeguimientoSeccion,
} from "@/features/coverage/inscripcion-reservas/components/table/seguimiento-territorial"

const SECCIONES: { value: SeccionTerritorial; label: string }[] = [
  { value: "proyeccion", label: "Proyección" },
  { value: "calendario", label: "Calendario" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "redistribucion", label: "Redistribución" },
  { value: "cupos-contratados", label: "Cupos contratados" },
  { value: "orientaciones", label: "Orientaciones" },
  { value: "solicitudes-retiro", label: "Solicitudes de retiro" },
]

const wrap = "whitespace-normal"

/**
 * Pestaña Entidad territorial (Sección 3.10): solo la reciben el Supervisor territorial y el
 * Administrador territorial. `encabezado` recibe la acción del título (Nuevo calendario).
 */
export function TerritorialTab({ encabezado }: { encabezado: (accion?: ReactNode) => ReactNode }) {
  const { terr = "proyeccion", terrEE, terrOrientar, terrId } = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data: contexto } = useContextoTerritorialQuery()
  const [nuevo, setNuevo] = useState(false)
  // La subpestaña muestra cuántos esperan redistribución.
  const { data: enRedistribucion } = useRedistribucionQuery({ pageIndex: 0, pageSize: 1 })
  const { data: solicitudes } = useSolicitudesRetiroQuery()
  // Las que esperan la decisión territorial (o aún la respuesta del origen).
  const porDecidir = solicitudes?.filter((s) =>
    ["PENDIENTE", "VENCIDA", "OBJETADA"].includes(s.estado),
  ).length

  const accion =
    terr === "calendario" && contexto?.puedeGestionarCalendario ? (
      <Button onClick={() => setNuevo(true)}>
        <PlusIcon data-icon="inline-start" />
        Nuevo calendario
      </Button>
    ) : undefined

  // Orientar es una pantalla propia (3.10): sin encabezado de pestañas.
  // Ver de una solicitud de retiro: pantalla propia con sus acciones arriba (3.10).
  if (terr === "solicitudes-retiro" && terrId) return <SolicitudRetiroVista id={terrId} />
  if (terr === "seguimiento" && terrEE && terrOrientar)
    return <OrientarVista motivo={terrOrientar} establecimientoId={terrEE} />

  return (
    <TableScreen>
      <TableScreenHeader>
        {encabezado(accion)}
        <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing) pt-4">
          <Tabs
            value={terr}
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  terr: value === "proyeccion" ? undefined : (value as SeccionTerritorial),
                  terrEE: undefined,
                  terrOrientar: undefined,
                  terrRed: undefined,
                  terrId: undefined,
                  terrQ: undefined,
                  page: 0,
                }),
              })
            }
          >
            <TabsList className="flex-wrap">
              {SECCIONES.map((s) => (
                <TabsTrigger key={s.value} value={s.value}>
                  {s.value === "redistribucion" && enRedistribucion
                    ? `${s.label} (${enRedistribucion.total})`
                    : s.value === "solicitudes-retiro" && porDecidir
                      ? `${s.label} (${porDecidir})`
                      : s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </TableScreenHeader>
      <TableScreenBody>
        {terr === "proyeccion" ? (
          terrId ? (
            <ProyeccionDetalleVista id={terrId} />
          ) : (
            <ProyeccionSeccion />
          )
        ) : terr === "seguimiento" ? (
          terrEE ? (
            <SeguimientoDetalleVista establecimientoId={terrEE} />
          ) : (
            <SeguimientoSeccion />
          )
        ) : terr === "solicitudes-retiro" ? (
          <SolicitudesRetiroSeccion />
        ) : terr === "orientaciones" ? (
          <OrientacionesSeccion />
        ) : terr === "cupos-contratados" ? (
          <CuposContratadosSeccion />
        ) : terr === "redistribucion" ? (
          <RedistribucionSeccion />
        ) : terr === "calendario" ? (
          <CalendarioSeccion puedeGestionar={contexto?.puedeGestionarCalendario ?? false} />
        ) : (
          <p className="px-(--screen-spacing) py-16 text-center text-sm text-muted-foreground">
            {SECCIONES.find((s) => s.value === terr)?.label}: esta sección llega en una entrega
            siguiente.
          </p>
        )}
      </TableScreenBody>
      <CalendarioDialog abierto={nuevo} calendario={null} onOpenChange={setNuevo} />
    </TableScreen>
  )
}

// --- Proyección -----------------------------------------------------------------

function ProyeccionSeccion() {
  const search = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data = [], isPending, isError, error, refetch } = useProyeccionQuery()
  const { texto, setTexto, q } = useBusquedaTerritorial({ reiniciarPagina: false })
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<EstadoProyeccion | "">("")
  const [borrador, setBorrador] = useState<EstadoProyeccion | "">("")
  const [porAprobar, setPorAprobar] = useState<ProyeccionEstablecimiento | null>(null)
  const [porDevolver, setPorDevolver] = useState<ProyeccionEstablecimiento | null>(null)

  const filas = data.filter(
    (p) => (!q || p.establecimiento.toLowerCase().includes(q)) && (!estado || p.estado === estado),
  )

  const columns: ColumnDef<ProyeccionEstablecimiento>[] = [
    {
      id: "establecimiento",
      accessorFn: () => null,
      header: "Establecimiento",
      meta: { label: "Establecimiento" },
      cell: ({ row }) => <span className={wrap}>{row.original.establecimiento}</span>,
    },
    {
      id: "grados",
      accessorFn: () => null,
      header: "Grados",
      meta: { label: "Grados" },
      cell: ({ row }) => <span className="tabular-nums">{row.original.grados}</span>,
    },
    {
      id: "grupos",
      accessorFn: () => null,
      header: "Grupos",
      meta: { label: "Grupos" },
      cell: ({ row }) => <span className="tabular-nums">{row.original.grupos}</span>,
    },
    {
      id: "cupo",
      accessorFn: () => null,
      header: () => <span className={wrap}>Cupo total</span>,
      meta: { label: "Cupo total" },
      cell: ({ row }) => <span className="tabular-nums">{row.original.cupoTotal}</span>,
    },
    {
      id: "deficit",
      accessorFn: () => null,
      header: () => <span className={wrap}>Grados con déficit</span>,
      meta: { label: "Grados con déficit" },
      cell: ({ row }) =>
        row.original.gradosConDeficit > 0 ? (
          <Badge
            variant="soft"
            color="destructive"
            className="text-xs font-medium tracking-normal tabular-nums"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {row.original.gradosConDeficit}
          </Badge>
        ) : (
          <span className="tabular-nums">0</span>
        ),
    },
    {
      id: "metodologias",
      accessorFn: () => null,
      header: "Metodologías",
      meta: { label: "Metodologías" },
      cell: ({ row }) =>
        row.original.metodologiaDistinta ? (
          <Marca
            label={`Metodología distinta: ${row.original.metodologiaDistinta}`}
            color="orange"
            punto
          />
        ) : (
          <Marca label="Tradicional" color="neutral" punto={false} />
        ),
    },
    {
      id: "estado",
      accessorFn: () => null,
      header: "Estado",
      meta: { label: "Estado" },
      cell: ({ row }) => <Marca {...ESTADO_PROYECCION_UI[row.original.estado]} />,
    },
    {
      id: "observacion",
      accessorFn: () => null,
      header: "Observación",
      meta: { label: "Observación" },
      cell: ({ row }) => <span className={wrap}>{row.original.observacion ?? "—"}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 3 * 32 + 8 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const p = row.original
        return (
          <>
            <AccionFila
              etiqueta={`Ver detalle — ${p.establecimiento}`}
              icono={<EyeIcon />}
              onClick={() => navigate({ search: (prev) => ({ ...prev, terrId: p.id }) })}
            />
            {p.estado === "PROYECTADA" && (
              <AccionFila
                etiqueta={`Aprobar — ${p.establecimiento}`}
                icono={<CheckCircleIcon />}
                onClick={() => setPorAprobar(p)}
              />
            )}
            <AccionFila
              etiqueta={`Devolver con observaciones — ${p.establecimiento}`}
              icono={<ArrowUUpLeftIcon />}
              onClick={() => setPorDevolver(p)}
            />
          </>
        )
      },
    },
  ]

  const paginado = usePaginado(filas)
  const { table } = useDataTable({
    ...paginado.pagination,
    columns,
    data: paginado.pagina,
    pageCount: paginado.pageCount,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "territorial-proyeccion-column-visibility",
  })

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <SearchQueryBar
            id="territorial-proyeccion-search"
            placeholder="Buscar establecimiento..."
            value={texto}
            onValueChange={setTexto}
            onClearAll={() => {
              setTexto("")
              setEstado("")
              setAbierto(false)
            }}
            onClearFilters={() => setBorrador("")}
            activeFilterCount={(estado ? 1 : 0) + (search.terrQ ? 1 : 0)}
            badgeCount={estado ? 1 : 0}
            open={abierto}
            onOpenChange={(o) => {
              if (o) setBorrador(estado)
              setAbierto(o)
            }}
            onApply={() => {
              setEstado(borrador)
              setAbierto(false)
            }}
          >
            <div className="px-4">
              <MatriculaSelectField
                id="filtro-proyeccion-estado"
                label="Estado"
                placeholder="Todos"
                value={borrador}
                options={["PROYECTADA", "APROBADA"]}
                labelFor={(v) => ESTADO_PROYECCION_UI[v as EstadoProyeccion].label}
                onChange={(v) => setBorrador(v as EstadoProyeccion | "")}
              />
            </div>
          </SearchQueryBar>
        </div>
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || estado
            ? "Ningún establecimiento coincide con la búsqueda."
            : "Aún no hay proyecciones de cupos para revisar."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas p={paginado} viewOptions={<DataTableViewOptions table={table} />} />
      <AprobarProyeccionDialog
        proyeccion={porAprobar}
        onOpenChange={(o) => !o && setPorAprobar(null)}
      />
      <DevolverProyeccionDialog
        proyeccion={porDevolver}
        onOpenChange={(o) => !o && setPorDevolver(null)}
      />
    </div>
  )
}

// --- Calendario -----------------------------------------------------------------

function CalendarioSeccion({ puedeGestionar }: { puedeGestionar: boolean }) {
  const { data = [], isPending, isError, error, refetch } = useCalendariosQuery()
  const { data: contexto } = useContextoTerritorialQuery()
  const publicar = usePublicarCalendario()
  const [editar, setEditar] = useState<CalendarioCobertura | null>(null)
  const [ver, setVer] = useState<CalendarioCobertura | null>(null)
  const [ampliar, setAmpliar] = useState<CalendarioCobertura | null>(null)
  const [enLinea, setEnLinea] = useState<CalendarioCobertura | null>(null)
  const [porPublicar, setPorPublicar] = useState<CalendarioCobertura | null>(null)

  const columns: ColumnDef<CalendarioCobertura>[] = [
    {
      id: "anio",
      header: "Año",
      cell: ({ row }) => <span className="tabular-nums">{row.original.anio}</span>,
    },
    { id: "modalidad", header: "Modalidad", cell: ({ row }) => row.original.modalidad },
    {
      id: "ciclo",
      header: "Ciclo",
      cell: ({ row }) => <span className="tabular-nums">{row.original.ciclo}</span>,
    },
    {
      id: "desde",
      header: "Inscripción desde",
      cell: ({ row }) => (
        <span className="tabular-nums">{fecha(row.original.inicioInscripcion)}</span>
      ),
    },
    {
      id: "cierre",
      header: "Cierre",
      cell: ({ row }) => (
        <span className="tabular-nums">{fecha(row.original.fechaCierreInscripcion)}</span>
      ),
    },
    {
      id: "limite",
      header: "Límite de matrícula",
      cell: ({ row }) => (
        <span className="tabular-nums">{fecha(row.original.fechaLimiteMatricula)}</span>
      ),
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const ui = ESTADO_CALENDARIO_UI[row.original.estado]
        return row.original.estado === "FINALIZADO" ? (
          <Badge variant="outline" color="muted" className="text-xs font-medium tracking-normal">
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {ui.label}
          </Badge>
        ) : (
          <Marca {...ui} />
        )
      },
    },
    {
      id: "actions",
      enableHiding: false,
      size: 3 * 32 + 8 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const c = row.original
        const nombre = nombreCalendario(c)
        // 3.10: Borrador → Modificar y Publicar; Publicado → Modificar, Ampliar fecha y Habilitar o
        // suspender la inscripción en línea; Finalizado → Ver detalle.
        if (c.estado === "FINALIZADO" || !puedeGestionar) {
          return (
            <AccionFila
              etiqueta={`Ver detalle — ${nombre}`}
              icono={<EyeIcon />}
              onClick={() => setVer(c)}
            />
          )
        }
        return (
          <>
            <AccionFila
              etiqueta={`Modificar — ${nombre}`}
              icono={<PencilIcon />}
              onClick={() => setEditar(c)}
            />
            {c.estado === "BORRADOR" ? (
              <AccionFila
                etiqueta={`Publicar — ${nombre}`}
                icono={<PaperPlaneTiltIcon />}
                onClick={() => setPorPublicar(c)}
              />
            ) : (
              <>
                <AccionFila
                  etiqueta={`Ampliar fecha — ${nombre}`}
                  icono={<CalendarPlusIcon />}
                  onClick={() => setAmpliar(c)}
                />
                <AccionFila
                  etiqueta={`Habilitar o suspender la inscripción en línea — ${nombre}`}
                  icono={<PlayCircleIcon />}
                  onClick={() => setEnLinea(c)}
                />
              </>
            )}
          </>
        )
      },
    },
  ]

  const pagination = useTablePagination()
  const { table } = useDataTable({
    ...pagination,
    columns,
    data,
    pageCount: 1,
    getRowId: (r) => String(r.id),
  })

  return (
    <>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Aún no hay calendarios de cobertura. Con Nuevo calendario se fijan las fechas que toman los establecimientos."
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <CalendarioDialog
        abierto={editar != null}
        calendario={editar}
        onOpenChange={(o) => !o && setEditar(null)}
      />
      <CalendarioDialog
        abierto={ver != null}
        calendario={ver}
        soloLectura
        onOpenChange={(o) => !o && setVer(null)}
      />
      <AmpliarLimiteDialog
        calendario={ampliar}
        contexto={contexto ?? undefined}
        onOpenChange={(o) => !o && setAmpliar(null)}
      />
      <InscripcionEnLineaDialog
        calendario={enLinea}
        contexto={contexto ?? undefined}
        onOpenChange={(o) => !o && setEnLinea(null)}
      />
      <Confirmar
        abierto={porPublicar != null}
        titulo={`Publicar el calendario ${porPublicar ? nombreCalendario(porPublicar) : ""}`}
        pendiente={publicar.isPending}
        boton="Publicar"
        icono={<PaperPlaneTiltIcon data-icon="inline-start" />}
        onOpenChange={(o) => !o && setPorPublicar(null)}
        onConfirm={() =>
          publicar.mutate(porPublicar?.id ?? 0, {
            onSuccess: () => {
              toast.success(
                `Se publicó el calendario ${porPublicar ? nombreCalendario(porPublicar) : ""}.`,
              )
              setPorPublicar(null)
            },
          })
        }
      >
        Los grupos de admisión y los períodos que aún no tienen esas fechas las toman; los que ya
        las definieron no cambian. La página pública Inscribir mostrará las fechas de inscripción.
      </Confirmar>
    </>
  )
}

function Confirmar({
  abierto,
  titulo,
  children,
  boton,
  icono,
  pendiente,
  onOpenChange,
  onConfirm,
}: {
  abierto: boolean
  titulo: string
  children: ReactNode
  boton: string
  icono: ReactNode
  pendiente: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => !pendiente && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription render={<div />}>{children}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={pendiente}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={onConfirm}>
            {pendiente ? <Spinner data-icon="inline-start" /> : icono}
            {boton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
