"use no memo"

import * as React from "react"
import { Link } from "@tanstack/react-router"
import type { SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import {
  BookIcon,
  CalendarBlankIcon,
  ClipboardCheckIcon,
  ClipboardTextIcon,
  FolderOpenIcon,
  GraduationCapIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  WarningIcon,
} from "@/components/ui/icons"
import { LoadingLabel } from "@/components/offline/loading-label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { ContenidosList } from "@/features/planeador/components/unidad-evidencias-section"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useResolvedSubjectLabelQuery } from "@/features/academic-management/curricular-references/api/query/use-subject-label-resolution"
import { useUnidadCriteriosQuery } from "@/features/planeador/api/query/use-unidad-criterios-query"
import { useUnidadValoracionesQuery } from "@/features/planeador/api/query/use-unidad-valoraciones-query"
import { createUnidadActividadesColumns } from "@/features/planeador/components/table/columns-unidad-actividades"
import { articuloDefinido, useRotuloUnidad } from "@/features/planeador/lib/unidad-instrumento-label"
import { ROTULO_ACTIVIDAD_FALLBACK } from "@/features/planeador/api/query/use-rotulo-actividad-query"
import {
  deArticuloRotulo,
  demostrativoRotulo,
  pluralizarRotulo,
  terminacionRotulo,
} from "@/features/planeador/lib/rotulo-gramatica"
import { createUnidadCriteriosColumns } from "@/features/planeador/components/table/columns-unidad-criterios"
import { DialogAgregarCriterio } from "@/features/planeador/components/dialogs/dialog-agregar-criterio"
import { DialogAgregarActividad } from "@/features/planeador/components/dialogs/dialog-agregar-actividad"
import { DialogDeleteUnidad } from "@/features/planeador/components/dialogs/dialog-delete-unidad"
import type { CriterioUnidad, UnidadActividad, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"

import { formatDate } from "@/features/planeador/lib/format-date"
import { getErrorMessage } from "@/lib/api-client"
import { esAjena } from "@/features/planeador/lib/docente-dueno"
import { useOnlineOnly } from "@/lib/offline/use-online-only"

type PanelTab = "general" | "rubricas" | "actividades"

/** Sin "Rúbricas" en unidades formativas. Recibe `esFormativo` ya resuelto: `enfoquePedagogico` viene fijo en "Evaluativo". */
interface PanelTabDef {
  value: PanelTab
  label: string
  Icon: React.ComponentType<{ className?: string; "data-icon"?: string }>
}

// Mismos íconos que `UnidadFormTabs`. "Criterios en {instrumento}" solo si todas las vinculadas comparten instrumento.
function getVisibleTabs(
  esFormativo: boolean,
  instrumentoLabel: string | undefined,
  rotuloActividadLabel: string,
): PanelTabDef[] {
  const tabs: PanelTabDef[] = [
    { value: "general", label: "Información general", Icon: ClipboardTextIcon },
    {
      value: "rubricas",
      label: instrumentoLabel ? `Criterios en ${instrumentoLabel}` : "Rúbricas",
      Icon: FolderOpenIcon,
    },
    { value: "actividades", label: rotuloActividadLabel, Icon: ClipboardCheckIcon },
  ]
  if (esFormativo) {
    return tabs.filter((tab) => tab.value !== "rubricas")
  }
  return tabs
}

/** Instrumento único entre las vinculadas, o `undefined` si no hay o hay varios. */
function resolverInstrumentoUnico(actividades: UnidadActividad[]): string | undefined {
  const distintos = new Set(actividades.map((a) => a.instrumento).filter(Boolean))
  return distintos.size === 1 ? [...distintos][0] : undefined
}

/** Caja de cada pestaña; `min-w-0` evita que la tabla de rúbricas desborde el panel. */
const PANEL =
  "min-w-0 rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

interface UnidadDetallePanelProps {
  unidadId: string
  /** Rótulo ya resuelto por la página; si falta se usa `useRotuloUnidad`. */
  rotuloUnidad?: string
  onDeleted?: () => void
}

/** Las filas vienen en la unidad (no paginadas): el orden se aplica en memoria por el `manualSorting`. */
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

function TabHeader({
  title,
  description,
  actionLabel,
  onAction,
  action,
  hideAction = false,
}: {
  title: string
  description?: string
  actionLabel?: string
  /** Sin esto (ni `action`) el botón queda `disabled`. */
  onAction?: () => void
  /** Nodo propio para acciones con `Popover` autocontenido. */
  action?: React.ReactNode
  /** Solo lectura: oculta el botón (sin permiso, no flujo pendiente). */
  hideAction?: boolean
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {!hideAction &&
        (action ?? (
          <Button
            color="primary"
            variant="fill"
            size="sm"
            disabled={!onAction}
            onClick={onAction}
            className="shrink-0"
          >
            <PlusIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        ))}
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
    // `divide-x` no deja hueco solo; sin padding en los extremos.
    <div className="min-w-0 md:px-6 md:first:pl-0 md:last:pr-0">
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <Icon className="size-4 shrink-0" />
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

function conDemostrativo(rotuloUnidad: string): string {
  return `${demostrativoRotulo(rotuloUnidad)} ${rotuloUnidad.toLowerCase()}`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function InformacionGeneral({ unidad, rotuloUnidad: rotuloConocido }: { unidad: UnidadTematica; rotuloUnidad?: string }) {
  const rotuloUnidad = useRotuloUnidad(unidad, rotuloConocido)
  // `enfoquePedagogico` siempre llega "Evaluativo": se deriva por `useUnidadReferenteQuery` (grado/asignatura casi nunca vienen).
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativa = unidadReferente?.esFormativo ?? false
  // Rótulo dinámico "Dimensión"/"Asignatura" (Formativo = Preescolar, ver `fn_actividad_es_formativa`).
  const { data: resolvedSubjectLabel } = useResolvedSubjectLabelQuery(unidadReferente?.id)
  const subjectLabel = resolvedSubjectLabel ?? (esFormativa ? "Dimensión" : "Asignatura")
  // Regla 13: rótulo real, siempre en singular (concatenar "s" rompe, ej. "Actividads").
  const rotuloActividadLower = (unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK).toLowerCase()

  return (
    <div className="flex flex-col gap-6">
      {/* Referente desactivado en el catálogo; `undefined` no muestra nada. */}
      {unidad.referenteVigente === false && (
        <div className="border-orange bg-orange-22 text-orange flex items-start gap-2 rounded-md border p-3 text-sm">
          <WarningIcon className="size-4 shrink-0 translate-y-0.5" aria-hidden="true" />
          <p>
            El referente curricular de {conDemostrativo(rotuloUnidad)} ya no está activo. No puede
            ofrecer enunciados ni evidencias hasta que se le asigne uno vigente.
          </p>
        </div>
      )}

      {/* `divide-x`: separatrices sin línea suelta al final. */}
      <div className="divide-border grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x">
        <Columna title="Descripción" className="md:pr-6">
          <p className="text-muted-foreground text-sm">{unidad.descripcion}</p>
        </Columna>
        {/* Sin "de la unidad" para no concordar género con el rótulo. */}
        <Columna title="Objetivos" className="md:px-6">
          <BulletList items={unidad.objetivos} />
        </Columna>
        <Columna title="Contenidos" className="md:pl-6">
          <ContenidosList items={unidad.contenidos} />
        </Columna>
      </div>

      <div className="bg-muted/10 rounded-md border p-4">
        {/* Formativa: sin actividades sumativas, el método de cálculo no aplica. */}
        {!esFormativa && (
          <>
            <h4 className="text-sm font-semibold">
              Forma en que se calcula cada {rotuloActividadLower} dentro {deArticuloRotulo(rotuloUnidad)}{" "}
              {rotuloUnidad.toLowerCase()}
            </h4>
            <p className="text-muted-foreground text-sm">
              Método Seleccionado:{" "}
              <span className="text-primary font-semibold">{unidad.metodoCalculo}</span>
            </p>
          </>
        )}
        <div
          className={cn(
            "divide-border grid gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x",
            !esFormativa && "mt-4",
          )}
        >
          <ResumenItem Icon={GraduationCapIcon} label="Grado:" value={unidad.grado} />
          <ResumenItem Icon={BookIcon} label={`${subjectLabel}:`} value={unidad.asignatura} />
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

/** Exportado: lo reusa `planeador-editar-unidad-page.tsx`. */
export function Rubricas({
  unidad,
  instrumentoLabel,
  rotuloUnidad: rotuloConocido,
}: {
  unidad: UnidadTematica
  rotuloUnidad?: string
  /** Instrumento único ya resuelto por `UnidadTabs`; `undefined` → título genérico "Criterios". */
  instrumentoLabel?: string
}) {
  // Misma query que `DialogAgregarCriterio` para que tabla y modal tengan las mismas columnas.
  const rotuloUnidad = useRotuloUnidad(unidad, rotuloConocido)
  const { data: valoraciones = [] } = useUnidadValoracionesQuery(unidad.id)
  const nombresNiveles = React.useMemo(() => valoraciones.map((v) => v.nombre), [valoraciones])
  const { puedeCrear, puedeEditar, puedeEliminar } = usePlaneadorSoloLectura()
  // QA 71: criterio abierto en "Editar criterio" (null = cerrado).
  const [editando, setEditando] = React.useState<CriterioUnidad | null>(null)
  const columns = React.useMemo(
    () =>
      createUnidadCriteriosColumns(nombresNiveles, {
        unidadId: unidad.id,
        puedeEditar,
        puedeEliminar,
        onEdit: setEditando,
      }),
    [nombresNiveles, unidad.id, puedeEditar, puedeEliminar],
  )
  // `unidad.criterios` llega vacío del backend real: viven en este endpoint.
  const { data: criterios = [], isPending, isError, error, refetch } = useUnidadCriteriosQuery(unidad.id)
  const { sorted, sorting, setSorting } = useSortedRows(criterios)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Sin `Pagination`: son pocos y vienen enteros.
  const { table } = useDataTable({
    columns,
    data: sorted,
    pageCount: 1,
    getRowId: (row) => String(row.id),
    pageIndex: 0,
    pageSize: sorted.length || 1,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
    columnVisibilityStorageKey: "unidad-detalle-panel-column-visibility",
  })

  return (
    <div>
      <TabHeader
        title={instrumentoLabel ? `Criterios en ${instrumentoLabel}` : "Criterios"}
        actionLabel="Agregar criterio"
        onAction={() => setDialogOpen(true)}
        hideAction={!puedeCrear}
      />
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={`${capitalizar(conDemostrativo(rotuloUnidad))} no tiene criterios definidos.`}
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
      {puedeCrear && (
        <DialogAgregarCriterio unidadId={unidad.id} open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
      {editando && (
        <DialogAgregarCriterio
          key={editando.id}
          unidadId={unidad.id}
          criterio={editando}
          open
          onOpenChange={(open) => {
            if (!open) setEditando(null)
          }}
        />
      )}
    </div>
  )
}

/** Exportado igual que `Rubricas`. */
export function Actividades({
  unidad,
  rotuloUnidad: rotuloConocido,
}: {
  unidad: UnidadTematica
  rotuloUnidad?: string
}) {
  const rotuloUnidad = useRotuloUnidad(unidad, rotuloConocido)
  // `unidad.actividades` llega vacío del backend real: viven en este endpoint.
  const { data: actividadesVinculadas = [], isPending, isError, error, refetch } = useUnidadActividadesQuery(unidad.id)
  // Tope de cada fila al editar en línea.
  const totalPonderacion = React.useMemo(
    () => actividadesVinculadas.reduce((sum, a) => sum + a.ponderacion, 0),
    [actividadesVinculadas],
  )
  // `enfoquePedagogico` siempre llega "Evaluativo": se usa `useUnidadReferenteQuery`.
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativa = unidadReferente?.esFormativo ?? false
  const { puedeEditar, puedeEliminar } = usePlaneadorSoloLectura()
  const { sedeId, anio, jornadaId, funcionario } = usePlaneadorDocenteScope()
  // Manda `unidad.instrumento` (sso V488); si no, el instrumento único de las vinculadas.
  const instrumentoLabel = React.useMemo(
    () => unidad.instrumento || resolverInstrumentoUnico(actividadesVinculadas),
    [unidad.instrumento, actividadesVinculadas],
  )
  const columns = React.useMemo(
    () =>
      createUnidadActividadesColumns(
        unidad.metodoCalculo,
        totalPonderacion,
        esFormativa,
        puedeEditar,
        puedeEliminar,
        unidad.rotuloEjecucion,
        rotuloUnidad,
        { sede: sedeId, ano: anio, jornada: jornadaId, docente: funcionario },
      ),
    [
      unidad.metodoCalculo,
      totalPonderacion,
      esFormativa,
      puedeEditar,
      puedeEliminar,
      unidad.rotuloEjecucion,
      rotuloUnidad,
      sedeId,
      anio,
      jornadaId,
      funcionario,
    ],
  )
  const { sorted, sorting, setSorting } = useSortedRows(actividadesVinculadas)

  const { table } = useDataTable({
    columns,
    data: sorted,
    pageCount: 1,
    getRowId: (row) => String(row.id),
    pageIndex: 0,
    pageSize: sorted.length || 1,
    goToPage: () => {},
    setPageSize: () => {},
    sorting,
    setSorting,
    columnVisibilityStorageKey: "unidad-detalle-panel-actividades-column-visibility",
  })

  // Con instrumento único: "Actividades en {instrumento}"; si no, genérico simple.
  // Regla 13 (sso V488/V511): rótulo real, siempre en singular.
  const rotuloActividadLabel = unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const rotuloActividadGenero = articuloDefinido(rotuloActividadLabel) === "el" ? "o" : "a"
  const rotuloActividadPluralLower = pluralizarRotulo(rotuloActividadLabel.toLowerCase())
  const tituloActividades = instrumentoLabel
    ? `${rotuloActividadLabel} en ${instrumentoLabel}`
    : rotuloActividadLabel
  const descripcionActividades = instrumentoLabel
    ? `Vinculad${rotuloActividadGenero} en ${instrumentoLabel}.`
    : `Vinculad${rotuloActividadGenero} a ${conDemostrativo(rotuloUnidad)}.`

  return (
    <div>
      <TabHeader
        title={tituloActividades}
        description={descripcionActividades}
        action={<DialogAgregarActividad unidad={unidad} rotuloUnidad={rotuloUnidad} />}
      />
      {/* Formativa sin banner (no se califica); "Promedio simple" aclara por qué no hay columna de peso. */}
      {!esFormativa && unidad.metodoCalculo === "Promedio simple" && (
        <div className="border-blue-stroke bg-blue-22 text-blue mb-4 flex items-start gap-3 rounded-md border p-3 text-sm">
          <InfoIcon className="size-5 shrink-0" />
          <p>
            {capitalizar(conDemostrativo(rotuloUnidad))} promedia sus {rotuloActividadPluralLower}:
            tod{terminacionRotulo(rotuloActividadLabel)}s cuentan por igual, no hay un peso ni un puntaje
            que asignar.
          </p>
        </div>
      )}
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage={`${capitalizar(conDemostrativo(rotuloUnidad))} todavía no tiene ningun${rotuloActividadGenero === "o" ? "" : "a"} ${rotuloActividadLabel.toLowerCase()} vinculad${rotuloActividadGenero}.`}
        errorMessage={error ? getErrorMessage(error) : undefined}
      />
    </div>
  )
}

/** Corrige la pestaña si la nueva unidad no tiene "Rúbricas". El enfoque sale de `useUnidadReferenteQuery`
 * (grado/asignatura casi nunca vienen y `enfoquePedagogico` es fijo). */
function UnidadTabs({
  unidad,
  rotuloUnidad,
  tab,
  onTabChange,
}: {
  unidad: UnidadTematica
  rotuloUnidad?: string
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
}) {
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativo = unidadReferente?.esFormativo ?? false
  // Manda `unidad.instrumento` (sso V488); si no, `resolverInstrumentoUnico`.
  const { data: actividadesVinculadas = [] } = useUnidadActividadesQuery(unidad.id)
  const instrumentoLabel = React.useMemo(
    () => unidad.instrumento || resolverInstrumentoUnico(actividadesVinculadas),
    [unidad.instrumento, actividadesVinculadas],
  )
  // Regla 13 (sso V488/V511): rótulo real, en singular.
  const rotuloActividadLabel = unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const visibleTabs = React.useMemo(
    () => getVisibleTabs(esFormativo, instrumentoLabel, rotuloActividadLabel),
    [esFormativo, instrumentoLabel, rotuloActividadLabel],
  )

  React.useEffect(() => {
    if (!visibleTabs.some((t) => t.value === tab)) {
      onTabChange("general")
    }
  }, [visibleTabs, tab, onTabChange])

  return (
    <Tabs value={tab} onValueChange={(value) => onTabChange(value as PanelTab)} className="w-full min-w-0">
      <TabsList variant="folder">
        {visibleTabs.map(({ value, label, Icon }) => (
          <TabsTrigger key={value} value={value}>
            <span className="inline-flex items-center gap-1.5">
              <Icon data-icon="inline-start" />
              {label}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="general" className={PANEL}>
        <InformacionGeneral unidad={unidad} rotuloUnidad={rotuloUnidad} />
      </TabsContent>
      {!esFormativo && (
        <TabsContent value="rubricas" className={PANEL}>
          <Rubricas unidad={unidad} instrumentoLabel={instrumentoLabel} rotuloUnidad={rotuloUnidad} />
        </TabsContent>
      )}
      <TabsContent value="actividades" className={PANEL}>
        <Actividades unidad={unidad} rotuloUnidad={rotuloUnidad} />
      </TabsContent>
    </Tabs>
  )
}

function esForbidden(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 403
}

/** Detalle de unidad como panel embebido; las pestañas son estado local, no rutas. */
export function UnidadDetallePanel({ unidadId, rotuloUnidad: rotuloConocido, onDeleted }: UnidadDetallePanelProps) {
  const { data: unidad, isPending, isError, error, refetch } = useUnidadDetalleQuery(Number(unidadId))
  const rotuloUnidad = useRotuloUnidad(unidad, rotuloConocido)
  const [tab, setTab] = React.useState<PanelTab>("general")
  const { puedeEditar } = usePlaneadorSoloLectura()
  const soloEnLinea = useOnlineOnly()
  // Unidad compartida de un colega (Regla 25): se usa, pero no se edita ni se elimina.
  const ajena = esAjena(unidad)

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-md border bg-card">
      <div className="bg-muted/10 flex items-center justify-between gap-2 border-b p-3">
        <h2 className="min-w-0 truncate text-base font-bold">
          {unidad?.nombre ?? "Cargando…"}
        </h2>
        {unidad && (
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Página aparte, no modal, como "Editar" de Actividad. */}
            {puedeEditar && !ajena && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      color="neutral"
                      size="icon-sm"
                      aria-label="Editar"
                      disabled={soloEnLinea.disabled}
                      nativeButton={soloEnLinea.disabled}
                      render={
                        soloEnLinea.disabled ? undefined : <Link
                          to={paths.app.planeadorUnidadEditar.getHref(String(unidad.id))}
                          search={{ instrumento: rotuloUnidad }}
                        />
                      }
                    />
                  }
                >
                  <PencilIcon />
                </TooltipTrigger>
                <TooltipContent>{soloEnLinea.tooltip ?? "Editar"}</TooltipContent>
              </Tooltip>
            )}
            {!ajena && <DialogDeleteUnidad unidad={unidad} rotuloUnidad={rotuloUnidad} onDeleted={onDeleted} />}
          </div>
        )}
      </div>

      <div className="scrollbar-slim min-h-0 w-full min-w-0 flex-1 overflow-y-auto p-3">
        {isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-6 py-12 text-sm">
            <LoadingLabel>Cargando…</LoadingLabel>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <p className="text-red text-sm">{getErrorMessage(error)}</p>
            {/* 403: la unidad no se comparte con este docente; reintentar no cambia nada. */}
            {!esForbidden(error) && (
              <Button variant="outline" color="neutral" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            )}
          </div>
        )}

        {unidad && (
          <UnidadTabs unidad={unidad} rotuloUnidad={rotuloUnidad} tab={tab} onTabChange={setTab} />
        )}
      </div>
    </div>
  )
}
