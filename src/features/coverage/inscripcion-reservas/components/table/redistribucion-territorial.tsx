"use no memo"

import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import { SITUACION_EDAD_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"
import type { SituacionEdad } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"

import { useState } from "react"
import type { ColumnDef, Table as TanstackTable } from "@tanstack/react-table"
import { toast } from "sonner"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeftIcon, EyeIcon, MapPinIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"
import { Paginas, usePaginadoServidor } from "./paginado-territorial"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { coberturaInscritosRoute } from "@/router"

import {
  fetchRedistribucion,
  useRedistribucionQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import type { EnRedistribucion } from "@/features/coverage/inscripcion-reservas/api/types/territorial"
import { UbicarDialog } from "@/features/coverage/inscripcion-reservas/components/dialogs/dialog-ubicar"
import {
  AccionFila as Accion,
  BotonExportar,
  Buscador,
  Cargando,
  exportarCsv,
  FIJA,
  Ficha,
  km,
  nombre,
  num,
  siNo,
  useBusquedaTerritorial,
  wrap,
} from "@/features/coverage/inscripcion-reservas/components/table/territorial-comunes"
import {
  UbicadoDetalle,
  UbicadosLista,
} from "@/features/coverage/inscripcion-reservas/components/table/ubicados-territorial"

/**
 * Casillas de selección. Con `compatible`, al marcar la primera fila se bloquean
 * las que no lo son (Ubicar por lote: mismo grado y modalidad), y "toda la
 * página" marca solo las compatibles con la primera.
 */
function seleccionColumna<T extends { numero: string; aspirante: string }>(
  compatible?: (a: T, b: T) => boolean,
): ColumnDef<T> {
  const ancla = (table: TanstackTable<T>) => table.getSelectedRowModel().rows[0]?.original
  const permitida = (table: TanstackTable<T>, fila: T) => {
    const a = ancla(table)
    return !compatible || !a || compatible(a, fila)
  }
  return {
    id: "select",
    header: ({ table }) => {
      const filas = table.getRowModel().rows
      const a = ancla(table) ?? filas[0]?.original
      const marcables = filas.filter((r) => !compatible || !a || compatible(a, r.original))
      const todas = marcables.length > 0 && marcables.every((r) => r.getIsSelected())
      return (
        <Checkbox
          aria-label="Seleccionar página"
          checked={todas}
          indeterminate={!todas && marcables.some((r) => r.getIsSelected())}
          onCheckedChange={(v) => marcables.forEach((r) => r.toggleSelected(!!v))}
        />
      )
    },
    cell: ({ row, table }) => {
      const ok = row.getIsSelected() || permitida(table, row.original)
      return (
        <Checkbox
          aria-label={`Seleccionar ${row.original.aspirante}`}
          checked={row.getIsSelected()}
          disabled={!ok}
          title={ok ? undefined : "Solo estudiantes del mismo grado y modalidad"}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 40,
    meta: { className: cn(FIJA, "left-0 w-10 min-w-10") },
  }
}

const seleccionados = <T,>(table: TanstackTable<T>) =>
  table.getSelectedRowModel().rows.map((r) => r.original)

// --- Sección ----------------------------------------------------------------------

/** Redistribución (3.10): aspirantes sin cupo en sus opciones y los ya ubicados que aún no tienen grupo. */
export function RedistribucionSeccion() {
  const { terrRed, terrId } = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const ir = (search: { terrRed?: "ubicados"; terrId?: number }) =>
    navigate({
      search: (prev) => ({
        ...prev,
        terrRed: search.terrRed,
        terrId: search.terrId,
        terrQ: undefined,
        page: 0,
      }),
    })

  if (terrId)
    return terrRed === "ubicados" ? (
      <UbicadoDetalle id={terrId} volver={() => ir({ terrRed })} />
    ) : (
      <RedistribucionDetalle id={terrId} volver={() => ir({})} />
    )

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <Tabs
        className="px-(--screen-spacing)"
        value={terrRed ?? "redistribucion"}
        onValueChange={(v) => ir({ terrRed: v === "ubicados" ? "ubicados" : undefined })}
      >
        <TabsList>
          <TabsTrigger value="redistribucion">En redistribución</TabsTrigger>
          <TabsTrigger value="ubicados">Ubicados sin grupo</TabsTrigger>
        </TabsList>
      </Tabs>
      {terrRed === "ubicados" ? (
        <UbicadosLista ver={(id) => ir({ terrRed: "ubicados", terrId: id })} />
      ) : (
        <EnRedistribucionLista ver={(id) => ir({ terrId: id })} />
      )}
    </div>
  )
}

// --- En redistribución ------------------------------------------------------------

function EnRedistribucionLista({ ver }: { ver: (id: number) => void }) {
  const { texto, setTexto, q } = useBusquedaTerritorial()
  const [area, setArea] = useState("")
  const [varios, setVarios] = useState<EnRedistribucion[]>([])
  // La búsqueda, el filtro y la página van al back: solo llega la página.
  const paginado = usePaginadoServidor(0)
  const filtros = { q, area: area || undefined }
  const { data, isPending, isError, error, refetch } = useRedistribucionQuery({
    ...filtros,
    pageIndex: paginado.pagination.pageIndex,
    pageSize: paginado.pagination.pageSize,
  })
  const filas = data?.filas ?? []
  const total = data?.total ?? 0

  const columns: ColumnDef<EnRedistribucion>[] = [
    seleccionColumna<EnRedistribucion>(
      (a, b) => a.grado === b.grado && a.modalidad === b.modalidad,
    ),
    {
      id: "aspirante",
      accessorFn: () => null,
      header: "Inscripción y aspirante",
      meta: { label: "Inscripción y aspirante", className: cn(FIJA, "left-10") },
      cell: ({ row }) => <span className={wrap}>{nombre(row.original)}</span>,
    },
    {
      id: "grado",
      accessorFn: () => null,
      header: "Grado",
      meta: { label: "Grado" },
      cell: ({ row }) => row.original.grado,
    },
    {
      id: "jornada",
      accessorFn: () => null,
      header: "Jornada",
      meta: { label: "Jornada" },
      cell: ({ row }) => row.original.jornada,
    },
    {
      id: "situacionEdad",
      accessorFn: () => null,
      header: "Situación de edad",
      meta: { label: "Situación de edad" },
      cell: ({ row }) => (
        <Marca
          {...(SITUACION_EDAD_UI[row.original.situacionEdad as SituacionEdad] ??
            SITUACION_EDAD_UI.SIN_CALCULAR)}
        />
      ),
    },
    {
      id: "estado",
      accessorFn: () => null,
      header: "Estado",
      meta: { label: "Estado" },
      cell: () => <Marca label="En redistribución" color="orange" punto />,
    },
    {
      id: "area",
      accessorFn: () => null,
      header: () => <span className={wrap}>Dentro del área de influencia</span>,
      meta: { label: "Dentro del área de influencia" },
      cell: ({ row }) => siNo(row.original.dentroAreaInfluencia),
    },
    {
      id: "distancia",
      accessorFn: () => null,
      header: "Distancia (km)",
      meta: { label: "Distancia (km)" },
      cell: ({ row }) => <span className={num}>{km(row.original.distanciaKm)}</span>,
    },
    {
      id: "cercana",
      accessorFn: () => null,
      header: () => <span className={wrap}>Establecimiento y Sede más cercana con cupo</span>,
      meta: { label: "Establecimiento y Sede más cercana con cupo" },
      cell: ({ row }) => <span className={wrap}>{row.original.sedeCercana ?? "—"}</span>,
    },
    {
      id: "origen",
      accessorFn: () => null,
      header: "Establecimiento de origen",
      meta: { label: "Establecimiento de origen" },
      cell: ({ row }) => <span className={wrap}>{row.original.establecimientoOrigen}</span>,
    },
    {
      id: "dias",
      accessorFn: () => null,
      header: () => <span className={wrap}>Días en redistribución</span>,
      meta: { label: "Días en redistribución" },
      cell: ({ row }) => <span className={num}>{row.original.diasEnRedistribucion}</span>,
    },
    {
      id: "actions",
      enableHiding: false,
      size: 2 * 32 + 4 + 16,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <>
          <Accion
            etiqueta={`Ver — ${row.original.aspirante}`}
            icono={<EyeIcon />}
            onClick={() => ver(row.original.id)}
          />
          <Accion
            etiqueta={`Ubicar estudiante — ${row.original.aspirante}`}
            icono={<MapPinIcon />}
            onClick={() => setVarios([row.original])}
          />
        </>
      ),
    },
  ]

  const pageCount = Math.max(1, Math.ceil(total / paginado.pagination.pageSize))
  const { table } = useDataTable({
    ...paginado.pagination,
    columns,
    data: filas,
    pageCount,
    getRowId: (r) => String(r.id),
    columnVisibilityStorageKey: "territorial-redistribucion-column-visibility",
  })
  const elegidos = seleccionados(table)

  return (
    <>
      <div className="flex flex-wrap items-start gap-2 px-(--screen-spacing)">
        <div className="w-full max-w-md">
          <Buscador
            id="territorial-redistribucion-search"
            texto={texto}
            onTexto={setTexto}
            filtro={area}
            onFiltro={(v) => {
              setArea(v)
              paginado.pagination.goToPage(0)
            }}
            etiqueta="Dentro del área de influencia"
            opciones={[
              ["S", "Sí"],
              ["N", "No"],
            ]}
          />
        </div>
        <div className="ml-auto flex gap-2">
          <BotonExportar
            disabled={!filas.length}
            onClick={async () => {
              // Exporta todo lo que cumple los filtros, no solo la página.
              const todas = (await fetchRedistribucion(filtros)).filas
              exportarCsv(
                "redistribucion.csv",
                [
                  "Inscripción",
                  "Aspirante",
                  "Grado",
                  "Jornada",
                  "Dentro del área",
                  "Distancia (km)",
                  "Sede más cercana con cupo",
                  "Establecimiento de origen",
                  "Días",
                ],
                todas.map((r) => [
                  r.numero,
                  r.aspirante,
                  r.grado,
                  r.jornada,
                  siNo(r.dentroAreaInfluencia),
                  km(r.distanciaKm),
                  r.sedeCercana ?? "",
                  r.establecimientoOrigen,
                  r.diasEnRedistribucion,
                ]),
              )
            }}
          />
          <Button
            disabled={!elegidos.length}
            onClick={() => {
              // Juntos solo si comparten grado y modalidad: van a la misma opción.
              const [p] = elegidos
              if (elegidos.some((r) => r.grado !== p.grado || r.modalidad !== p.modalidad))
                return toast.error(
                  "Seleccione estudiantes del mismo grado y modalidad para ubicarlos juntos.",
                )
              setVarios(elegidos)
            }}
          >
            <MapPinIcon data-icon="inline-start" />
            Ubicar estudiante(s)
          </Button>
        </div>
      </div>
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={
          q || area
            ? "Ninguna inscripción coincide con la búsqueda."
            : "No hay aspirantes en redistribución."
        }
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      <Paginas
        p={{ ...paginado, pageCount, total }}
        viewOptions={<DataTableViewOptions table={table} />}
      />
      <UbicarDialog
        inscripciones={varios}
        onOpenChange={(o) => !o && setVarios([])}
        onUbicado={() => table.resetRowSelection()}
      />
    </>
  )
}

function RedistribucionDetalle({ id, volver }: { id: number; volver: () => void }) {
  const { data, isPending } = useRedistribucionQuery({ id })
  const [ubicar, setUbicar] = useState<EnRedistribucion | null>(null)
  const r = data?.filas.find((x) => x.id === id)
  if (isPending) return <Cargando volver={volver} />
  if (!r)
    return (
      <Cargando
        volver={volver}
        error="La inscripción ya no está en redistribución: quizá ya se ubicó."
      />
    )
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 px-(--screen-spacing)">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="outline" color="neutral" onClick={volver}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver
          </Button>
          <span className="text-sm font-medium">Inscripción {nombre(r)}</span>
        </div>
        <Button onClick={() => setUbicar(r)}>
          <MapPinIcon data-icon="inline-start" />
          Ubicar estudiante
        </Button>
      </div>
      <Ficha
        datos={[
          ["Número de inscripción", r.numero],
          ["Aspirante", r.aspirante],
          ["Grado y modalidad", `${r.grado} · ${r.modalidad}`],
          ["Jornada pedida", r.jornada],
          [
            "Situación de edad",
            (SITUACION_EDAD_UI[r.situacionEdad as SituacionEdad] ?? SITUACION_EDAD_UI.SIN_CALCULAR)
              .label,
          ],
          ["Establecimiento de origen", r.establecimientoOrigen],
          ["Dentro del área de influencia", siNo(r.dentroAreaInfluencia)],
          ["Distancia (km)", km(r.distanciaKm)],
          ["Sede más cercana con cupo", r.sedeCercana ?? "—"],
          ["Días en redistribución", r.diasEnRedistribucion],
          ["Estado", "En redistribución"],
        ]}
      />
      <UbicarDialog
        inscripciones={ubicar ? [ubicar] : []}
        onOpenChange={(o) => !o && setUbicar(null)}
        onUbicado={volver}
      />
    </div>
  )
}
