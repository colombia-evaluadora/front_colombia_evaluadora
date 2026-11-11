"use no memo"

import { useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useRouter } from "@tanstack/react-router"
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
  ArrowLeftIcon,
  CaretDownIcon,
  CaretRightIcon,
  EyeIcon,
  FileDownloadOutlinedIcon,
  NavigationArrowIcon,
  PaperPlaneTiltIcon,
  XIcon,
} from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginado } from "./paginado-territorial"
import { AccionFila as Accion, useBusquedaTerritorial } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { coberturaInscritosRoute } from "@/router"

import { useOrientar } from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import {
  TEMAS_ORIENTACION,
  useSeguimientoDetalleQuery,
  useSeguimientoQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  MotivoOrientacion,
  SeguimientoEstablecimiento,
  SeguimientoGrupo,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const num = "tabular-nums"

/** Conteo que pide atención (sin continuidad, traslados pendientes): punto naranja si es mayor que 0. */
function Alerta({ n }: { n: number }) {
  if (n === 0) return <span className={num}>0</span>
  return (
    <Badge
      variant="soft"
      color="warning"
      className="text-xs font-medium tracking-normal tabular-nums"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {n}
    </Badge>
  )
}

const SIN_CONTINUIDAD = "No hay estudiantes sin continuidad"
const SIN_TRASLADOS = "No hay traslados pendientes"

/** Botón de Orientar del detalle: inactivo, con el porqué, cuando no hay nada que orientar. */
function BotonOrientar({
  texto,
  icono,
  inactiva,
  onClick,
}: {
  texto: string
  icono: ReactNode
  inactiva?: string
  onClick: () => void
}) {
  const boton = (
    <Button
      variant="outline"
      color="neutral"
      size="sm"
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

/** Navega dentro de Seguimiento: Ver (terrEE) y Orientar (terrEE + terrOrientar). */
function useIrA() {
  const navigate = coberturaInscritosRoute.useNavigate()
  return (terrEE?: number, terrOrientar?: MotivoOrientacion) =>
    navigate({ search: (prev) => ({ ...prev, terrEE, terrOrientar }) })
}

/** Exporta la lista tal como se ve (CSV con BOM para que Excel lea las tildes). */
function exportar(filas: SeguimientoEstablecimiento[]) {
  const cab = [
    "Establecimiento",
    "Cursando",
    "Reservadas",
    "Sin continuidad",
    "Omitidos",
    "Traslados pendientes",
    "Días del más antiguo",
  ]
  const csv = [
    cab,
    ...filas.map((f) => [
      f.establecimiento,
      f.cursando,
      f.reservadas,
      f.sinContinuidad,
      f.omitidos,
      f.trasladosPendientes,
      f.diasMasAntiguo ?? "",
    ]),
  ]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
    .join("\r\n")
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: "seguimiento-reservas-traslados.csv",
  })
  a.click()
  URL.revokeObjectURL(url)
}

// --- Lista ----------------------------------------------------------------------

/** Seguimiento (3.10): continuidad y traslados por establecimiento del alcance. */
export function SeguimientoSeccion() {
  const search = coberturaInscritosRoute.useSearch()
  const irA = useIrA()
  const { data = [], isPending, isError, error, refetch } = useSeguimientoQuery()
  const { texto, setTexto, q } = useBusquedaTerritorial({ reiniciarPagina: false })
  const [abierto, setAbierto] = useState(false)
  // Filtro: solo los que tienen algo que orientar (sin continuidad o traslados pendientes).
  const [pendientes, setPendientes] = useState("")
  const [borrador, setBorrador] = useState("")

  const filas = data.filter(
    (s) =>
      (!q || s.establecimiento.toLowerCase().includes(q)) &&
      (!pendientes || s.sinContinuidad + s.trasladosPendientes > 0),
  )
  const cifra = (
    id: keyof SeguimientoEstablecimiento,
    label: string,
    alerta = false,
  ): ColumnDef<SeguimientoEstablecimiento> => ({
    id,
    header: () => <span className="whitespace-normal">{label}</span>,
    meta: { label },
    cell: ({ row }) =>
      alerta ? (
        <Alerta n={row.original[id] as number} />
      ) : (
        <span className={num}>{row.original[id] ?? "—"}</span>
      ),
  })

  const columns: ColumnDef<SeguimientoEstablecimiento>[] = [
    {
      id: "establecimiento",
      accessorFn: () => null,
      header: "Establecimiento",
      meta: { label: "Establecimiento" },
      cell: ({ row }) => <span className="whitespace-normal">{row.original.establecimiento}</span>,
    },
    cifra("cursando", "Cursando"),
    cifra("reservadas", "Reservadas"),
    cifra("sinContinuidad", "Sin continuidad", true),
    cifra("omitidos", "Omitidos"),
    cifra("trasladosPendientes", "Traslados pendientes", true),
    cifra("diasMasAntiguo", "Días del más antiguo"),
    {
      id: "actions",
      enableHiding: false,
      size: 3 * 32 + 8 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <>
            <Accion
              etiqueta={`Ver — ${s.establecimiento}`}
              icono={<EyeIcon />}
              onClick={() => irA(s.establecimientoId)}
            />
            <Accion
              etiqueta={`Orientar por falta de continuidad — ${s.establecimiento}`}
              icono={<PaperPlaneTiltIcon />}
              inactiva={s.sinContinuidad > 0 ? undefined : SIN_CONTINUIDAD}
              onClick={() => irA(s.establecimientoId, "continuidad")}
            />
            <Accion
              etiqueta={`Orientar por traslados pendientes — ${s.establecimiento}`}
              icono={<NavigationArrowIcon />}
              inactiva={s.trasladosPendientes > 0 ? undefined : SIN_TRASLADOS}
              onClick={() => irA(s.establecimientoId, "traslados")}
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
    getRowId: (r) => String(r.establecimientoId),
    columnVisibilityStorageKey: "territorial-seguimiento-column-visibility",
  })

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <SearchQueryBar
            id="territorial-seguimiento-search"
            placeholder="Buscar establecimiento..."
            value={texto}
            onValueChange={setTexto}
            onClearAll={() => {
              setTexto("")
              setPendientes("")
              setAbierto(false)
            }}
            onClearFilters={() => setBorrador("")}
            activeFilterCount={(pendientes ? 1 : 0) + (search.terrQ ? 1 : 0)}
            badgeCount={pendientes ? 1 : 0}
            open={abierto}
            onOpenChange={(o) => {
              if (o) setBorrador(pendientes)
              setAbierto(o)
            }}
            onApply={() => {
              setPendientes(borrador)
              setAbierto(false)
            }}
          >
            <div className="px-4">
              <MatriculaSelectField
                id="filtro-seguimiento-pendientes"
                label="Establecimientos"
                placeholder="Todos"
                value={borrador}
                options={["CON_PENDIENTES"]}
                labelFor={() => "Con algo que orientar"}
                onChange={setBorrador}
              />
            </div>
          </SearchQueryBar>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            color="neutral"
            disabled={!filas.length}
            onClick={() => exportar(filas)}
          >
            <FileDownloadOutlinedIcon data-icon="inline-start" />
            Exportar reservas y traslados
          </Button>
        </div>
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || pendientes
            ? "Ningún establecimiento coincide con la búsqueda."
            : "No hay establecimientos en su alcance."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas p={paginado} viewOptions={<DataTableViewOptions table={table} />} />
    </div>
  )
}

// --- Ver ------------------------------------------------------------------------

export function SeguimientoDetalleVista({ establecimientoId }: { establecimientoId: number }) {
  const irA = useIrA()
  const { data, isPending, isError, error, refetch } = useSeguimientoDetalleQuery(establecimientoId)
  const [vista, setVista] = useState<"grado" | "sede">("grado")
  // Mientras carga no se sabe si hay algo que orientar: las acciones quedan activas, como antes.
  const suma = (k: "trasladosPendientes" | "sinContinuidad") =>
    data ? (data.porGrado ?? []).reduce((n, g) => n + g[k], 0) : 1
  const totales = {
    trasladosPendientes: suma("trasladosPendientes"),
    sinContinuidad: suma("sinContinuidad"),
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" color="neutral" size="sm" onClick={() => irA()}>
            <ArrowLeftIcon data-icon="inline-start" />
            Seguimiento
          </Button>
          {data && (
            <span className="text-sm font-medium">
              {data.establecimiento} · {data.periodo}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonOrientar
            texto="Orientar por traslados pendientes"
            icono={<NavigationArrowIcon data-icon="inline-start" />}
            inactiva={totales.trasladosPendientes > 0 ? undefined : SIN_TRASLADOS}
            onClick={() => irA(establecimientoId, "traslados")}
          />
          <BotonOrientar
            texto="Orientar por falta de continuidad"
            icono={<PaperPlaneTiltIcon data-icon="inline-start" />}
            inactiva={totales.sinContinuidad > 0 ? undefined : SIN_CONTINUIDAD}
            onClick={() => irA(establecimientoId, "continuidad")}
          />
        </div>
      </div>

      <Tabs value={vista} onValueChange={(v) => setVista(v as "grado" | "sede")}>
        <TabsList>
          <TabsTrigger value="grado">Por grado</TabsTrigger>
          <TabsTrigger value="sede">Por sede</TabsTrigger>
        </TabsList>
      </Tabs>

      {isPending ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <div className="grid justify-items-center gap-3 py-10 text-sm">
          <p className="text-red">{getErrorMessage(error)}</p>
          <Button variant="outline" color="neutral" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <TablaAgrupada
          key={vista}
          titulo={vista === "grado" ? "Grado · Sede" : "Sede · Grado"}
          grupos={vista === "grado" ? data.porGrado : data.porSede}
        />
      )}
    </div>
  )
}

/** Filas que se abren para mostrar su desglose (sedes de un grado o grados de una sede). */
function TablaAgrupada({ titulo, grupos }: { titulo: string; grupos: SeguimientoGrupo[] }) {
  // La primera fila con algo que atender llega abierta, como en el prototipo.
  const [abiertos, setAbiertos] = useState<Set<string>>(() => {
    const g = grupos.find((x) => x.sinContinuidad + x.trasladosPendientes > 0)
    return new Set(g ? [g.nombre] : [])
  })
  const alternar = (n: string) =>
    setAbiertos((s) => {
      const r = new Set(s)
      if (r.has(n)) r.delete(n)
      else r.add(n)
      return r
    })

  const cifras = (f: SeguimientoGrupo | SeguimientoGrupo["hijos"][number]) => (
    <>
      <TableCell className={num}>{f.cursando}</TableCell>
      <TableCell className={num}>{f.reservadas}</TableCell>
      <TableCell>
        <Alerta n={f.sinContinuidad} />
      </TableCell>
      <TableCell className={num}>{f.omitidos}</TableCell>
      <TableCell>
        <Alerta n={f.trasladosPendientes} />
      </TableCell>
    </>
  )

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{titulo}</TableHead>
            <TableHead>Cursando</TableHead>
            <TableHead>Reservadas</TableHead>
            <TableHead>Sin continuidad</TableHead>
            <TableHead>Omitidos</TableHead>
            <TableHead className="whitespace-normal">Traslados pendientes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.flatMap((g) => {
            const abierto = abiertos.has(g.nombre)
            return [
              <TableRow key={g.nombre}>
                <TableCell>
                  <Button
                    variant="ghost"
                    color="muted"
                    size="icon-xs"
                    aria-expanded={abierto}
                    aria-label={`${abierto ? "Ocultar" : "Mostrar"} el desglose de ${g.nombre}`}
                    onClick={() => alternar(g.nombre)}
                  >
                    {abierto ? <CaretDownIcon /> : <CaretRightIcon />}
                  </Button>
                </TableCell>
                <TableCell>{g.nombre}</TableCell>
                {cifras(g)}
              </TableRow>,
              ...(abierto
                ? g.hijos.map((h) => (
                    <TableRow key={`${g.nombre}/${h.nombre}`}>
                      <TableCell />
                      <TableCell className="pl-6">{h.nombre}</TableCell>
                      {cifras(h)}
                    </TableRow>
                  ))
                : []),
            ]
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// --- Orientar -------------------------------------------------------------------

const TITULO_ORIENTAR: Record<MotivoOrientacion, string> = {
  continuidad: "Orientar por falta de continuidad",
  traslados: "Orientar por traslados pendientes",
}

/** Texto sugerido con las cifras del establecimiento; la persona lo ajusta antes de enviar. */
function textoSugerido(motivo: MotivoOrientacion, s: SeguimientoEstablecimiento | undefined) {
  if (!s) return ""
  if (motivo === "continuidad")
    return `Tiene ${s.sinContinuidad} estudiantes sin continuidad: no se les encontró cupo en el grado siguiente. Revise los grupos y cupos del período, en especial los grados con déficit en la proyección, o resuélvalos con Reservar cupo.`
  const dias = s.diasMasAntiguo ? `, el más antiguo de hace ${s.diasMasAntiguo} días` : ""
  return `Tiene ${s.trasladosPendientes} traslados pendientes${dias}. Revíselos y responda desde Inscripción y reservas.`
}

const FORM_ORIENTAR = "orientar-form"
const orientarSchema = z.object({
  establecimientoId: z.number().int().positive("El establecimiento es obligatorio."),
  tema: z.string().min(1, "El tema es obligatorio."),
  orientacion: z
    .string()
    .trim()
    .min(10, "La orientación debe tener entre 10 y 1000 caracteres.")
    .max(1000, "La orientación debe tener entre 10 y 1000 caracteres."),
})

/** Orientar (3.10): pantalla propia, sin las subpestañas; Cancelar y Enviar vuelven a donde se abrió. */
export function OrientarVista({
  motivo,
  establecimientoId,
}: {
  motivo: MotivoOrientacion
  establecimientoId: number
}) {
  const { data, isPending } = useSeguimientoQuery()
  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-80 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  return (
    <OrientarForm
      key={`${motivo}-${establecimientoId}`}
      motivo={motivo}
      establecimientoId={establecimientoId}
      lista={data ?? []}
    />
  )
}

function OrientarForm({
  motivo,
  establecimientoId,
  lista,
}: {
  motivo: MotivoOrientacion
  establecimientoId: number
  lista: SeguimientoEstablecimiento[]
}) {
  const router = useRouter()
  const volver = () => router.history.back()
  const orientar = useOrientar()
  const form = useAppForm({
    defaultValues: {
      establecimientoId,
      // Las dos orientaciones de Seguimiento van con el tema Cobertura (3.10).
      tema: "Cobertura",
      orientacion: textoSugerido(
        motivo,
        lista.find((s) => s.establecimientoId === establecimientoId),
      ),
    },
    validators: { onSubmit: orientarSchema },
    onSubmit: ({ value }) =>
      orientar.mutateAsync(
        { ...value, orientacion: value.orientacion.trim(), motivo },
        {
          onSuccess: () => {
            const ee = lista.find((s) => s.establecimientoId === value.establecimientoId)
            toast.success(
              `Se envió la orientación a ${ee?.establecimiento ?? "el establecimiento"}.`,
            )
            volver()
          },
        },
      ),
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                color="neutral"
                disabled={orientar.isPending}
                onClick={volver}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ORIENTAR} disabled={orientar.isPending}>
                {orientar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <PaperPlaneTiltIcon data-icon="inline-start" />
                )}
                Enviar
              </Button>
            </div>
          }
        >
          <span className="grid gap-1">
            <span className="text-sm font-normal text-muted-foreground">
              Entidad territorial › Seguimiento ›
            </span>
            {TITULO_ORIENTAR[motivo]}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <form
          id={FORM_ORIENTAR}
          noValidate
          className="rounded-md border border-border p-5"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <div className="grid gap-5">
            <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
              <form.AppField name="establecimientoId">
                {(f) => (
                  <f.SelectField
                    label="Establecimiento"
                    required
                    emptyValue={0}
                    options={lista.map((s) => ({
                      value: s.establecimientoId,
                      label: s.establecimiento,
                    }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="tema">
                {(f) => (
                  <f.SelectField
                    label="Tema"
                    required
                    options={TEMAS_ORIENTACION.map((t) => ({ value: t, label: t }))}
                  />
                )}
              </form.AppField>
            </div>
            <form.AppField name="orientacion">
              {(f) => (
                <f.TextareaField
                  label="Orientación"
                  required
                  maxLength={1000}
                  description="Sin datos sensibles de estudiantes. Entre 10 y 1000 caracteres."
                />
              )}
            </form.AppField>
            <Aviso tono="info">No incluya datos sensibles de estudiantes.</Aviso>
            <p className="text-xs text-muted-foreground">
              Los campos marcados con * son obligatorios
            </p>
          </div>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}
