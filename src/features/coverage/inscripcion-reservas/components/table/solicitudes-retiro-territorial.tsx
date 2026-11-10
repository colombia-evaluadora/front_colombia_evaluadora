"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
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
  ArrowLeftIcon,
  EyeIcon,
  PersonRemoveIcon,
  RemoveCircleOutlineIcon,
  XIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginado } from "./paginado-territorial"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { coberturaInscritosRoute } from "@/router"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import {
  useCerrarSinRetiro,
  useRegistrarRetiro,
} from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import {
  useContextoTerritorialQuery,
  useSolicitudesRetiroQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  EstadoSolicitudRetiro,
  SolicitudRetiro,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { AccionFila, Ficha, fecha } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"

const num = "tabular-nums"

const ESTADO: Record<
  EstadoSolicitudRetiro,
  {
    label: string
    color: "warning" | "destructive" | "info" | "success" | "neutral"
    punto: boolean
  }
> = {
  PENDIENTE: { label: "Pendiente", color: "warning", punto: true },
  VENCIDA: { label: "Vencida", color: "destructive", punto: true },
  OBJETADA: { label: "Objetada", color: "info", punto: true },
  POR_ANULAR_DESTINO: { label: "Por anular en el destino", color: "warning", punto: true },
  ATENDIDA: { label: "Atendida", color: "success", punto: true },
  CERRADA_SIN_RETIRO: { label: "Cerrada sin retiro", color: "neutral", punto: false },
}

/** El rol territorial decide cuando el origen no respondió a tiempo o la objetó. */
const decidible = (s: SolicitudRetiro) => s.estado === "VENCIDA" || s.estado === "OBJETADA"

function EstadoBadge({ estado }: { estado: EstadoSolicitudRetiro }) {
  const e = ESTADO[estado]
  return (
    <Badge variant="soft" color={e.color} className="text-xs font-medium tracking-normal">
      {e.punto && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {e.label}
    </Badge>
  )
}

/** Solo el Administrador territorial registra el retiro o cierra sin retiro (3.10). */
function usePuedeDecidir() {
  return useContextoTerritorialQuery().data?.puedeGestionarCalendario ?? false
}

/** Por qué Registrar retiro y Cerrar sin retiro están inactivas; undefined si se pueden usar. */
function motivoSinDecidir(s: SolicitudRetiro, puedeDecidir: boolean) {
  if (!puedeDecidir) return "Solo el Administrador territorial decide"
  if (decidible(s)) return undefined
  if (s.estado === "PENDIENTE") return "Aún corre el plazo del origen"
  return "La solicitud ya fue decidida"
}

// --- Lista ------------------------------------------------------------------------

type Filtros = { origen: string; solicitante: string; estado: string }
const SIN_FILTROS: Filtros = { origen: "", solicitante: "", estado: "" }

/** Solicitudes de retiro (3.10): el destino pide retirar del origen a un estudiante que ya matriculó. */
export function SolicitudesRetiroSeccion() {
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data = [], isPending, isError, error, refetch } = useSolicitudesRetiroQuery()
  const [texto, setTexto] = useState("")
  const [abierto, setAbierto] = useState(false)
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS)
  const [borrador, setBorrador] = useState<Filtros>(SIN_FILTROS)
  const ver = (id: number) => navigate({ search: (prev) => ({ ...prev, terrId: id }) })
  const puedeDecidir = usePuedeDecidir()
  const [registrar, setRegistrar] = useState<SolicitudRetiro | null>(null)
  const [cerrar, setCerrar] = useState<SolicitudRetiro | null>(null)

  const q = texto.trim().toLowerCase()
  const filas = data.filter(
    (s) =>
      (!q || s.estudiante.toLowerCase().includes(q)) &&
      (!filtros.origen || s.origen === filtros.origen) &&
      (!filtros.solicitante || s.solicitante === filtros.solicitante) &&
      (!filtros.estado || s.estado === filtros.estado),
  )
  const activos = Object.values(filtros).filter(Boolean).length

  const columns: ColumnDef<SolicitudRetiro>[] = [
    {
      id: "estudiante",
      accessorFn: () => null,
      header: "Estudiante",
      meta: { label: "Estudiante" },
      cell: ({ row }) => row.original.estudiante,
    },
    {
      id: "origen",
      accessorFn: () => null,
      header: "Origen",
      meta: { label: "Origen" },
      cell: ({ row }) => row.original.origen,
    },
    {
      id: "solicitante",
      accessorFn: () => null,
      header: "Solicitante",
      meta: { label: "Solicitante" },
      cell: ({ row }) => row.original.solicitante,
    },
    {
      id: "fecha",
      accessorFn: () => null,
      header: () => <span className="whitespace-normal">Fecha de la solicitud</span>,
      meta: { label: "Fecha de la solicitud" },
      cell: ({ row }) => <span className={num}>{fecha(row.original.fechaSolicitud)}</span>,
    },
    {
      id: "dias",
      accessorFn: () => null,
      header: () => <span className="whitespace-normal">Días sin respuesta</span>,
      meta: { label: "Días sin respuesta" },
      cell: ({ row }) => <span className={num}>{row.original.diasSinRespuesta ?? "—"}</span>,
    },
    {
      id: "estado",
      accessorFn: () => null,
      header: "Estado",
      meta: { label: "Estado" },
      cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
    },
    {
      id: "resolucion",
      accessorFn: () => null,
      header: "Resolución",
      meta: { label: "Resolución" },
      cell: ({ row }) => <span className={num}>{fecha(row.original.fechaResolucion)}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 3 * 32 + 8 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <>
            <AccionFila
              etiqueta={`Ver — ${s.estudiante}`}
              icono={<EyeIcon />}
              onClick={() => ver(s.id)}
            />
            <AccionFila
              etiqueta={`Registrar retiro — ${s.estudiante}`}
              icono={<PersonRemoveIcon />}
              inactiva={motivoSinDecidir(s, puedeDecidir)}
              onClick={() => setRegistrar(s)}
            />
            <AccionFila
              etiqueta={`Cerrar sin retiro — ${s.estudiante}`}
              icono={<RemoveCircleOutlineIcon />}
              inactiva={motivoSinDecidir(s, puedeDecidir)}
              onClick={() => setCerrar(s)}
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
    columnVisibilityStorageKey: "territorial-solicitudes-retiro-column-visibility",
  })

  const lista = (k: "origen" | "solicitante") => [...new Set(data.map((s) => s[k]))].sort()

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-xl">
          <SearchQueryBar
            id="territorial-retiro-search"
            placeholder="Buscar estudiante"
            value={texto}
            onValueChange={setTexto}
            onClearAll={() => {
              setTexto("")
              setFiltros(SIN_FILTROS)
              setAbierto(false)
            }}
            onClearFilters={() => setBorrador(SIN_FILTROS)}
            activeFilterCount={activos + (q ? 1 : 0)}
            badgeCount={activos}
            open={abierto}
            onOpenChange={(o) => {
              if (o) setBorrador(filtros)
              setAbierto(o)
            }}
            onApply={() => {
              setFiltros(borrador)
              setAbierto(false)
            }}
          >
            <div className="grid min-w-0 grid-cols-1 gap-4 px-4">
              <MatriculaSelectField
                id="filtro-retiro-origen"
                label="Origen"
                placeholder="Todos"
                value={borrador.origen}
                options={lista("origen")}
                onChange={(v) => setBorrador((b) => ({ ...b, origen: v }))}
              />
              <MatriculaSelectField
                id="filtro-retiro-solicitante"
                label="Solicitante"
                placeholder="Todos"
                value={borrador.solicitante}
                options={lista("solicitante")}
                onChange={(v) => setBorrador((b) => ({ ...b, solicitante: v }))}
              />
              <MatriculaSelectField
                id="filtro-retiro-estado"
                label="Estado"
                placeholder="Todos"
                value={borrador.estado}
                options={Object.keys(ESTADO)}
                labelFor={(v) => ESTADO[v as EstadoSolicitudRetiro].label}
                onChange={(v) => setBorrador((b) => ({ ...b, estado: v }))}
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
          q || activos
            ? "Ninguna solicitud coincide con la búsqueda."
            : "No hay solicitudes de retiro en su alcance."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas p={paginado} viewOptions={<DataTableViewOptions table={table} />} />
      <RegistrarRetiroDialog solicitud={registrar} onOpenChange={(o) => !o && setRegistrar(null)} />
      <CerrarSinRetiroDialog solicitud={cerrar} onOpenChange={(o) => !o && setCerrar(null)} />
    </div>
  )
}

// --- Ver --------------------------------------------------------------------------

function BotonDecidir({
  texto,
  icono,
  inactiva,
  onClick,
}: {
  texto: string
  icono: React.ReactNode
  inactiva?: string
  onClick: () => void
}) {
  const boton = (
    <Button
      variant="outline"
      color="neutral"
      aria-disabled={inactiva ? true : undefined}
      className={inactiva ? "cursor-not-allowed opacity-50" : undefined}
      onClick={inactiva ? undefined : onClick}
    >
      {icono}
      {texto}
    </Button>
  )
  if (!inactiva) return boton
  return (
    <Tooltip>
      <TooltipTrigger render={boton} />
      <TooltipContent>{inactiva}</TooltipContent>
    </Tooltip>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="text-base">{titulo}</h2>
      <div className="grid gap-3 border-l-2 border-border pl-3 text-sm">{children}</div>
    </section>
  )
}

/** Ver de una solicitud: pantalla propia, con Registrar retiro y Cerrar sin retiro arriba. */
export function SolicitudRetiroVista({ id }: { id: number }) {
  const navigate = coberturaInscritosRoute.useNavigate()
  const volver = () => navigate({ search: (prev) => ({ ...prev, terrId: undefined }) })
  const { data, isPending } = useSolicitudesRetiroQuery()
  const puedeDecidir = usePuedeDecidir()
  const [registrar, setRegistrar] = useState(false)
  const [cerrar, setCerrar] = useState(false)
  const s = data?.find((x) => x.id === id)

  const botonVolver = (
    <Button variant="outline" color="neutral" onClick={volver}>
      <ArrowLeftIcon data-icon="inline-start" />
      Volver
    </Button>
  )

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap gap-2">
              {botonVolver}
              {s && (
                <>
                  <BotonDecidir
                    texto="Registrar retiro"
                    icono={<PersonRemoveIcon data-icon="inline-start" />}
                    inactiva={motivoSinDecidir(s, puedeDecidir)}
                    onClick={() => setRegistrar(true)}
                  />
                  <BotonDecidir
                    texto="Cerrar sin retiro"
                    icono={<RemoveCircleOutlineIcon data-icon="inline-start" />}
                    inactiva={motivoSinDecidir(s, puedeDecidir)}
                    onClick={() => setCerrar(true)}
                  />
                </>
              )}
            </div>
          }
        >
          <span className="grid gap-1">
            <span className="text-sm font-normal text-muted-foreground">
              Inscripción y reservas › Solicitudes de retiro ›
            </span>
            <span className="flex items-center gap-3">
              {s?.estudiante ?? "Solicitud de retiro"}
              {s && <EstadoBadge estado={s.estado} />}
            </span>
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        {isPending ? (
          <Skeleton className="h-80 w-full" />
        ) : !s ? (
          <p className="py-10 text-center text-sm text-red">
            No se encontró la solicitud de retiro.
          </p>
        ) : (
          <div className="grid gap-6">
            <Ficha
              columnas={2}
              datos={[
                ["Estudiante", s.estudiante],
                ["Origen", s.origenDetalle],
                ["Solicitante (destino)", s.solicitanteDetalle],
                ["Fecha de la solicitud", fecha(s.fechaSolicitud)],
                [
                  "Plazo de atención",
                  `${s.plazoDiasHabiles} días hábiles · vence ${fecha(s.venceEl)}`,
                ],
                ["Estado", ESTADO[s.estado].label],
              ]}
            />
            <Bloque titulo="Evidencia de la matrícula en el destino">
              <p>{s.evidencia ?? "Sin evidencia."}</p>
            </Bloque>
            <Bloque titulo="Objeción del origen">
              <p>
                {s.objecion
                  ? `${s.objecion.autor} · ${fecha(s.objecion.fecha)} — ${s.objecion.texto}`
                  : "El origen no ha objetado."}
              </p>
            </Bloque>
            <Bloque titulo="Historial de avisos">
              {s.avisos.map((a, i) => (
                <div key={i} className="grid gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {fecha(a.fecha)} · {a.autor}
                  </span>
                  <span>{a.texto}</span>
                </div>
              ))}
            </Bloque>
            <RegistrarRetiroDialog solicitud={registrar ? s : null} onOpenChange={setRegistrar} />
            <CerrarSinRetiroDialog solicitud={cerrar ? s : null} onOpenChange={setCerrar} />
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}

function RegistrarRetiroDialog({
  solicitud,
  onOpenChange,
}: {
  solicitud: SolicitudRetiro | null
  onOpenChange: (open: boolean) => void
}) {
  const registrar = useRegistrarRetiro()
  return (
    <Dialog open={solicitud != null} onOpenChange={(o) => !registrar.isPending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar retiro — {solicitud?.estudiante}</DialogTitle>
          <DialogDescription className="sr-only">
            Confirma el retiro de la matrícula en el origen.
          </DialogDescription>
        </DialogHeader>
        {solicitud && (
          <>
            <Ficha
              columnas={1}
              datos={[
                ["Origen", solicitud.origenDetalle],
                ["Solicitante", solicitud.solicitante],
                ["Evidencia", solicitud.evidencia ?? "—"],
                ["Motivo de la novedad", solicitud.motivoNovedad],
              ]}
            />
            <p className="text-sm">
              La matrícula en {solicitud.origen} pasará a Retirado. Ambos establecimientos serán
              avisados.
            </p>
          </>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={registrar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            color="destructive"
            disabled={registrar.isPending}
            onClick={() =>
              registrar.mutate(solicitud!.id, {
                onSuccess: () => {
                  toast.success(
                    `Se registró el retiro de ${solicitud!.estudiante} en ${solicitud!.origen}.`,
                  )
                  onOpenChange(false)
                },
              })
            }
          >
            {registrar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PersonRemoveIcon data-icon="inline-start" />
            )}
            Registrar retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const cerrarSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(10, "El motivo debe tener entre 10 y 500 caracteres.")
    .max(500, "El motivo debe tener entre 10 y 500 caracteres."),
})

function CerrarSinRetiroDialog({
  solicitud,
  onOpenChange,
}: {
  solicitud: SolicitudRetiro | null
  onOpenChange: (open: boolean) => void
}) {
  const cerrar = useCerrarSinRetiro()
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: { onSubmit: cerrarSchema },
    onSubmit: ({ value }) =>
      cerrar.mutateAsync(
        { id: solicitud?.id ?? 0, motivo: value.motivo.trim() },
        {
          onSuccess: () => {
            toast.success(`Se cerró sin retiro la solicitud de ${solicitud?.estudiante}.`)
            form.reset()
            onOpenChange(false)
          },
        },
      ),
  })
  return (
    <Dialog
      open={solicitud != null}
      onOpenChange={(o) => {
        if (cerrar.isPending) return
        form.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cerrar sin retiro — {solicitud?.estudiante}</DialogTitle>
          <DialogDescription>
            {solicitud?.objecion
              ? `El establecimiento ${solicitud.origen} objetó: "${solicitud.objecion.texto}"`
              : `El establecimiento ${solicitud?.origen} no respondió en el plazo.`}
          </DialogDescription>
        </DialogHeader>
        <form
          id="cerrar-sin-retiro-form"
          noValidate
          className="grid min-w-0 grid-cols-1 gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => (
              <f.TextareaField
                label="Motivo del cierre"
                required
                maxLength={500}
                rows={3}
                placeholder="Explique la decisión"
                description="De 10 a 500 caracteres."
              />
            )}
          </form.AppField>
          <Aviso tono="warning">
            Se avisará a {solicitud?.solicitante} (destino) para que anule la matrícula de{" "}
            {solicitud?.estudiante}; hasta entonces tendrá alerta diaria y acciones administrativas
            bloqueadas.
          </Aviso>
          <p className="text-xs text-muted-foreground">
            Los campos marcados con * son obligatorios
          </p>
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={cerrar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="submit"
            form="cerrar-sin-retiro-form"
            color="destructive"
            disabled={cerrar.isPending}
          >
            {cerrar.isPending && <Spinner data-icon="inline-start" />}
            Cerrar sin retiro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
