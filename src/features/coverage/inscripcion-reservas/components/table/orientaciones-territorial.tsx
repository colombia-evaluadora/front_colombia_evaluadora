"use no memo"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { SearchQueryBar } from "@/components/search/search-query-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, EyeIcon, PaperPlaneTiltIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginado } from "./paginado-territorial"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { coberturaInscritosRoute } from "@/router"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { useOrientar } from "@/features/coverage/inscripcion-reservas/api/mutations/territorial"
import {
  TEMAS_ORIENTACION,
  useContextoTerritorialQuery,
  useOrientacionesQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type {
  EstadoOrientacion,
  MotivoOrientacion,
  Orientacion,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { Ficha, fecha, useBusquedaTerritorial } from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"

const wrap = "whitespace-normal"
const ESTADO: Record<EstadoOrientacion, { label: string; color: "info" | "success" }> = {
  ENVIADA: { label: "Enviada", color: "info" },
  ATENDIDA: { label: "Atendida", color: "success" },
}
const ALERTA: Record<MotivoOrientacion, string> = {
  continuidad: "Falta de continuidad",
  traslados: "Traslados pendientes",
}

function EstadoBadge({ estado }: { estado: EstadoOrientacion }) {
  return (
    <Badge
      variant="soft"
      color={ESTADO[estado].color}
      className="text-xs font-medium tracking-normal"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {ESTADO[estado].label}
    </Badge>
  )
}

/** Orientaciones (3.10): lo enviado a los establecimientos, su estado y la respuesta. */
export function OrientacionesSeccion() {
  const { terrId } = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const ver = (id?: number) => navigate({ search: (prev) => ({ ...prev, terrId: id }) })
  if (terrId) return <OrientacionDetalle id={terrId} volver={() => ver()} />
  return <OrientacionesLista ver={ver} />
}

function OrientacionesLista({ ver }: { ver: (id: number) => void }) {
  const search = coberturaInscritosRoute.useSearch()
  const { data = [], isPending, isError, error, refetch } = useOrientacionesQuery()
  const { texto, setTexto, q } = useBusquedaTerritorial({ reiniciarPagina: false })
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState("")
  const [borrador, setBorrador] = useState("")
  const [nueva, setNueva] = useState(false)

  const filas = data.filter(
    (o) =>
      (!q ||
        [o.establecimiento, o.tema, o.orientacion, o.enviadaPor].some((t) =>
          t.toLowerCase().includes(q),
        )) &&
      (!estado || o.estado === estado),
  )

  const columns: ColumnDef<Orientacion>[] = [
    {
      id: "establecimiento",
      accessorFn: () => null,
      header: "Establecimiento",
      meta: { label: "Establecimiento" },
      cell: ({ row }) => <span className={wrap}>{row.original.establecimiento}</span>,
    },
    {
      id: "tema",
      accessorFn: () => null,
      header: "Tema",
      meta: { label: "Tema" },
      cell: ({ row }) => row.original.tema,
    },
    {
      id: "orientacion",
      accessorFn: () => null,
      header: "Orientación",
      meta: { label: "Orientación" },
      cell: ({ row }) => (
        <span className="block max-w-48 truncate" title={row.original.orientacion}>
          {row.original.orientacion}
        </span>
      ),
    },
    {
      id: "estado",
      accessorFn: () => null,
      header: "Estado",
      meta: { label: "Estado" },
      cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
    },
    {
      id: "envio",
      accessorFn: () => null,
      header: () => <span className={wrap}>Fecha de envío</span>,
      meta: { label: "Fecha de envío" },
      cell: ({ row }) => <span className="tabular-nums">{fecha(row.original.fechaEnvio)}</span>,
    },
    {
      id: "enviadaPor",
      accessorFn: () => null,
      header: "Enviada por",
      meta: { label: "Enviada por" },
      cell: ({ row }) => <span className={wrap}>{row.original.enviadaPor}</span>,
    },
    {
      id: "atencion",
      accessorFn: () => null,
      header: () => <span className={wrap}>Fecha de atención</span>,
      meta: { label: "Fecha de atención" },
      cell: ({ row }) => <span className="tabular-nums">{fecha(row.original.fechaAtencion)}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 32 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="muted"
                size="icon-sm"
                aria-label={`Ver la orientación a ${row.original.establecimiento}`}
                onClick={() => ver(row.original.id)}
              >
                <EyeIcon />
              </Button>
            }
          />
          <TooltipContent>Ver</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  const paginado = usePaginado(filas)
  const { table } = useDataTable({
    ...paginado.pagination,
    columns,
    data: paginado.pagina,
    pageCount: paginado.pageCount,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "territorial-orientaciones-column-visibility",
  })

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <div className="flex flex-wrap items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <SearchQueryBar
            id="territorial-orientaciones-search"
            placeholder="Buscar por texto"
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
                id="filtro-orientaciones-estado"
                label="Estado"
                placeholder="Todos"
                value={borrador}
                options={["ENVIADA", "ATENDIDA"]}
                labelFor={(v) => ESTADO[v as EstadoOrientacion].label}
                onChange={setBorrador}
              />
            </div>
          </SearchQueryBar>
        </div>
        <Button className="ml-auto" disabled={nueva} onClick={() => setNueva(true)}>
          <PlusIcon data-icon="inline-start" />
          Nueva orientación
        </Button>
      </div>
      {nueva && <NuevaOrientacion onCerrar={() => setNueva(false)} />}
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || estado
            ? "Ninguna orientación coincide con la búsqueda."
            : "Aún no hay orientaciones. Con Nueva orientación se envía una a un establecimiento."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas p={paginado} viewOptions={<DataTableViewOptions table={table} />} />
    </div>
  )
}

const nuevaSchema = z.object({
  establecimientoId: z.number().int().positive("El establecimiento es obligatorio."),
  tema: z.string().min(1, "El tema es obligatorio."),
  orientacion: z
    .string()
    .trim()
    .min(10, "La orientación debe tener entre 10 y 1000 caracteres.")
    .max(1000, "La orientación debe tener entre 10 y 1000 caracteres."),
})

/** Formulario en línea, sobre la tabla, como en el prototipo. */
function NuevaOrientacion({ onCerrar }: { onCerrar: () => void }) {
  const { data: contexto } = useContextoTerritorialQuery()
  const orientar = useOrientar()
  const establecimientos = contexto?.establecimientos ?? []
  const form = useAppForm({
    defaultValues: { establecimientoId: 0, tema: "", orientacion: "" },
    validators: { onSubmit: nuevaSchema },
    onSubmit: ({ value }) =>
      orientar.mutateAsync(
        { ...value, orientacion: value.orientacion.trim(), motivo: null },
        {
          onSuccess: () => {
            const ee = establecimientos.find((e) => e.id === value.establecimientoId)
            toast.success(`Se envió la orientación a ${ee?.nombre ?? "el establecimiento"}.`)
            onCerrar()
          },
        },
      ),
  })

  return (
    <form
      noValidate
      className="mx-(--screen-spacing) grid gap-5 rounded-md border border-border p-5"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <h2 className="text-base">Nueva orientación</h2>
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
        <form.AppField name="establecimientoId">
          {(f) => (
            <f.SelectField
              label="Establecimiento"
              required
              emptyValue={0}
              options={establecimientos.map((e) => ({ value: e.id, label: e.nombre }))}
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
            placeholder="Escriba la orientación"
            description="Sin datos sensibles de estudiantes. Entre 10 y 1000 caracteres."
          />
        )}
      </form.AppField>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          color="neutral"
          disabled={orientar.isPending}
          onClick={onCerrar}
        >
          <XIcon data-icon="inline-start" />
          Cancelar
        </Button>
        <Button type="submit" disabled={orientar.isPending}>
          {orientar.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PaperPlaneTiltIcon data-icon="inline-start" />
          )}
          Enviar
        </Button>
      </div>
    </form>
  )
}

function OrientacionDetalle({ id, volver }: { id: number; volver: () => void }) {
  const { data, isPending } = useOrientacionesQuery()
  const o = data?.find((x) => x.id === id)
  const encabezado = (
    <Button variant="outline" color="neutral" className="w-fit" onClick={volver}>
      <ArrowLeftIcon data-icon="inline-start" />
      Volver
    </Button>
  )
  if (isPending)
    return (
      <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
        {encabezado}
        <Skeleton className="h-48 w-full" />
      </div>
    )
  if (!o)
    return (
      <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
        {encabezado}
        <p className="py-10 text-center text-sm text-red">No se encontró la orientación.</p>
      </div>
    )
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <div className="flex items-center gap-3">
        {encabezado}
        <span className="text-sm font-medium">
          Orientación a {o.establecimiento} · {o.tema}
        </span>
      </div>
      <Ficha
        datos={[
          ["Establecimiento", o.establecimiento],
          ["Tema", o.tema],
          ["Estado", ESTADO[o.estado].label],
          ["Fecha de envío", fecha(o.fechaEnvio)],
          ["Enviada por", o.enviadaPor],
          ["Fecha de atención", fecha(o.fechaAtencion)],
          ["Alerta vinculada", o.alerta ? ALERTA[o.alerta] : "Ninguna"],
        ]}
      />
      <section className="grid gap-1">
        <h2 className="text-base">Orientación</h2>
        <p className="text-sm whitespace-pre-line">{o.orientacion}</p>
      </section>
      <section className="grid gap-1">
        <h2 className="text-base">Respuesta del establecimiento</h2>
        <p className="text-sm whitespace-pre-line">{o.respuesta ?? "Aún no hay respuesta."}</p>
      </section>
    </div>
  )
}
