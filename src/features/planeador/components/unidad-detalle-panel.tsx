"use no memo"

import * as React from "react"
import type { SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  BookIcon,
  CalendarBlankIcon,
  GraduationCapIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDataTable } from "@/hooks/use-data-table"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { createUnidadActividadesColumns } from "@/features/planeador/components/table/columns-unidad-actividades"
import { createUnidadCriteriosColumns } from "@/features/planeador/components/table/columns-unidad-criterios"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

import { formatDate } from "@/features/planeador/lib/format-date"

type PanelTab = "general" | "rubricas" | "actividades"

const TABS: { value: PanelTab; label: string }[] = [
  { value: "general", label: "Información general" },
  { value: "rubricas", label: "Rúbricas" },
  { value: "actividades", label: "Actividades" },
]

/**
 * Caja del contenido de cada pestaña. Es el mismo panel que usan las solapas
 * del diálogo de grado: sin borde superior —lo dibuja la lista de pestañas— y
 * con la esquina superior izquierda a escuadra, que es donde se apoya la
 * primera solapa.
 *
 * `data-tabs-filled` lo publica `Tabs` cuando las pestañas ocupan todo el
 * ancho: ahí la de la derecha también se apoya en el borde y el radio sobra.
 *
 * `min-w-0`: sin esto el ancho mínimo de la tabla de rúbricas se propaga hacia
 * arriba y desborda el panel en vez de dejar que `Table` scrollee en
 * horizontal.
 */
const PANEL =
  "min-w-0 rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface UnidadDetallePanelProps {
  unidadId: string
}

/**
 * Las dos tablas del panel usan `useDataTable` + `DataTable`, igual que las
 * del plan académico: así heredan el encabezado ordenable, los estados de
 * carga/error/vacío y —vía la columna `actions`— el overlay de botones que se
 * revela al pasar el puntero por la fila, en vez de reimplementarlo todo.
 *
 * La diferencia es de dónde salen las filas: acá ya vienen dentro de la
 * unidad, no de una consulta paginada. Como `useDataTable` declara
 * `manualSorting`, el orden lo aplica este hook sobre el array en memoria —
 * es el equivalente local de lo que en las otras pantallas hace el backend.
 */
function useSortedRows<T>(rows: T[]) {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const sorted = React.useMemo(() => {
    const [order] = sorting
    if (!order) return rows
    const key = order.id as keyof T
    return [...rows].sort((a, b) => {
      const va = a[key]
      const vb = b[key]
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "es")
      return order.desc ? -cmp : cmp
    })
  }, [rows, sorting])

  return { sorted, sorting, setSorting }
}

/** Cabecera de una pestaña: título, bajada opcional y su acción a la derecha. */
function TabHeader({
  title,
  description,
  actionLabel,
}: {
  title: string
  description?: string
  actionLabel: string
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <Button color="primary" variant="fill" size="sm" disabled className="shrink-0">
        <PlusIcon data-icon="inline-start" />
        {actionLabel}
      </Button>
    </div>
  )
}

function Columna({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">—</p>
  }
  return (
    <ul className="text-muted-foreground list-disc space-y-3 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function ResumenItem({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    // `px-6` contra la separatriz (`divide-x` del padre no deja hueco por su
    // cuenta) y sin padding en los extremos, para que la fila no se despegue
    // de los bordes de la caja.
    <div className="min-w-0 md:px-6 md:first:pl-0 md:last:pr-0">
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Icon className="size-4 shrink-0" />
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function InformacionGeneral({ unidad }: { unidad: UnidadTematica }) {
  return (
    <div className="flex flex-col gap-6">
      {/* `divide-x` en vez de bordes por columna: dibuja las separatrices
          entre columnas sin una línea suelta al final de la fila. */}
      <div className="divide-border grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x">
        <Columna title="Descripción" className="md:pr-6">
          <p className="text-muted-foreground text-sm">{unidad.descripcion}</p>
        </Columna>
        <Columna title="Objetivos de la unidad" className="md:px-6">
          <BulletList items={unidad.objetivos} />
        </Columna>
        <Columna title="Contenidos" className="md:pl-6">
          <BulletList items={unidad.contenidos} />
        </Columna>
      </div>

      <div className="bg-muted/10 rounded-md border p-4">
        <h4 className="text-sm font-semibold">
          Forma en que se van a calcular las actividades dentro de la unidad
        </h4>
        <p className="text-muted-foreground text-sm">
          Método Seleccionado:{" "}
          <span className="text-primary font-semibold">{unidad.metodoCalculo}</span>
        </p>
        <div className="divide-border mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x">
          <ResumenItem Icon={GraduationCapIcon} label="Grado:" value={unidad.grado} />
          <ResumenItem Icon={BookIcon} label="Asignatura:" value={unidad.asignatura} />
          <ResumenItem
            Icon={CalendarBlankIcon}
            label="Inicio:"
            value={formatDate(unidad.fechaInicio)}
          />
          <ResumenItem
            Icon={CalendarBlankIcon}
            label="Fin:"
            value={formatDate(unidad.fechaFin)}
          />
        </div>
      </div>
    </div>
  )
}

function Rubricas({ unidad }: { unidad: UnidadTematica }) {
  const columns = React.useMemo(() => createUnidadCriteriosColumns(), [])
  const { sorted, sorting, setSorting } = useSortedRows(unidad.criterios)

  // Sin `Pagination`: los criterios vienen enteros dentro del detalle y son
  // pocos, así que entran todos en una sola página.
  const { table } = useDataTable({
    columns,
    data: sorted,
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: sorted.length || 1,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
  })

  return (
    <div>
      <TabHeader title="Criterios de la unidad" actionLabel="Agregar criterio" />
      {/* `isPending`/`isError` en falso: las filas llegan dentro del detalle
          de la unidad, así que su carga y su error ya los maneja el panel. */}
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        emptyMessage="Esta unidad no tiene criterios definidos."
      />
    </div>
  )
}

function Actividades({ unidad }: { unidad: UnidadTematica }) {
  const columns = React.useMemo(() => createUnidadActividadesColumns(), [])
  const { sorted, sorting, setSorting } = useSortedRows(unidad.actividades)

  const { table } = useDataTable({
    columns,
    data: sorted,
    pageCount: 1,
    getRowId: (row) => row.id,
    pageIndex: 0,
    pageSize: sorted.length || 1,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
  })

  return (
    <div>
      <TabHeader
        title="Actividades de la unidad"
        description="Las actividades vinculadas y su peso dentro de la unidad."
        actionLabel="Vincular actividad"
      />
      <DataTable
        table={table}
        isPending={false}
        isError={false}
        onRetry={() => {}}
        emptyMessage="Esta unidad todavía no tiene actividades vinculadas."
      />
    </div>
  )
}

/**
 * Detalle de una unidad temática como panel embebido: ocupa la columna
 * derecha de la pestaña "Unidad temática".
 *
 * Las tres pestañas internas son estado local y no rutas —a diferencia de las
 * dos vistas del Planeador—: son secciones del mismo recurso, no pantallas
 * distintas, y no aportan nada como URL enlazable.
 */
export function UnidadDetallePanel({ unidadId }: UnidadDetallePanelProps) {
  const { data: unidad, isPending, isError, refetch } = useUnidadDetalleQuery(unidadId)
  const [tab, setTab] = React.useState<PanelTab>("general")

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-md border bg-card">
      <div className="bg-muted/10 flex items-center justify-between gap-2 border-b p-3">
        <h2 className="min-w-0 truncate text-base font-bold">
          {unidad?.nombre ?? "Cargando…"}
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Editar">
            <PencilIcon />
          </Button>
          <Button variant="ghost" color="neutral" size="icon-sm" disabled aria-label="Eliminar">
            <TrashIcon />
          </Button>
        </div>
      </div>

      <div className="scrollbar-slim min-h-0 w-full min-w-0 flex-1 overflow-y-auto p-3">
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <Spinner /> Cargando unidad…
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-red text-sm">Ocurrió un error al cargar la unidad.</p>
            <Button variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {unidad && (
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as PanelTab)}
            className="w-full min-w-0"
          >
            <TabsList variant="folder">
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className={PANEL}>
              <InformacionGeneral unidad={unidad} />
            </TabsContent>
            <TabsContent value="rubricas" className={PANEL}>
              <Rubricas unidad={unidad} />
            </TabsContent>
            <TabsContent value="actividades" className={PANEL}>
              <Actividades unidad={unidad} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}
