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
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useDataTable } from "@/hooks/use-data-table"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadActividadesQuery } from "@/features/planeador/api/query/use-unidad-actividades-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useUnidadCriteriosQuery } from "@/features/planeador/api/query/use-unidad-criterios-query"
import { useUnidadValoracionesQuery } from "@/features/planeador/api/query/use-unidad-valoraciones-query"
import { createUnidadActividadesColumns } from "@/features/planeador/components/table/columns-unidad-actividades"
import { createUnidadCriteriosColumns } from "@/features/planeador/components/table/columns-unidad-criterios"
import { DialogAgregarCriterio } from "@/features/planeador/components/dialogs/dialog-agregar-criterio"
import { DialogAgregarActividad } from "@/features/planeador/components/dialogs/dialog-agregar-actividad"
import { DialogDeleteUnidad } from "@/features/planeador/components/dialogs/dialog-delete-unidad"
import type { UnidadActividad, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

import { formatDate } from "@/features/planeador/lib/format-date"

type PanelTab = "general" | "rubricas" | "actividades"

/**
 * La pestaña "Rúbricas" no aplica a una unidad de enfoque formativo: el
 * seguimiento formativo no califica por niveles de desempeño, así que no
 * hay nada que definir ahí — se saca en vez de mostrarla deshabilitada
 * (misma idea que "¿Es evaluación sumativa?" en el form de Actividad,
 * que se bloquea en "No" para el mismo tipo de unidad).
 *
 * Recibe `esFormativo` ya resuelto (no lee `unidad.enfoquePedagogico`): ese
 * campo viene hardcodeado en `"Evaluativo"` para toda unidad real
 * (`toUnidadTematica` no tiene de dónde sacarlo) — el enfoque de verdad se
 * deriva en vivo por Grado+Asignatura, ver `UnidadTabs` más abajo.
 */
interface PanelTabDef {
  value: PanelTab
  label: string
  Icon: React.ComponentType<{ className?: string; "data-icon"?: string }>
}

// Mismos íconos que `UnidadFormTabs` (alta/edición de unidad) para que las
// pestañas se vean iguales en las dos pantallas.
//
// `instrumentoLabel` (pedido explícito): la pestaña decía siempre "Rúbricas"
// aunque las actividades vinculadas calificaran con Lista de cotejo o Escala
// de valoración — pasa a "Criterios en {instrumento}" cuando TODAS las
// actividades vinculadas comparten el mismo `instrumento_evaluacion` (ver
// `resolverInstrumentoUnico`); con ninguna vinculada, o con varias que usan
// instrumentos distintos, no hay un único rótulo que mostrar y se cae al
// genérico "Rúbricas" de siempre.
function getVisibleTabs(esFormativo: boolean, instrumentoLabel: string | undefined): PanelTabDef[] {
  const tabs: PanelTabDef[] = [
    { value: "general", label: "Información general", Icon: ClipboardTextIcon },
    {
      value: "rubricas",
      label: instrumentoLabel ? `Criterios en ${instrumentoLabel}` : "Rúbricas",
      Icon: FolderOpenIcon,
    },
    { value: "actividades", label: "Actividades", Icon: ClipboardCheckIcon },
  ]
  if (esFormativo) {
    return tabs.filter((tab) => tab.value !== "rubricas")
  }
  return tabs
}

/** Único `instrumento_evaluacion` real entre las actividades ya vinculadas a
 *  la unidad, o `undefined` si no hay ninguna vinculada (todavía) o si hay
 *  más de uno distinto (ahí no hay un solo instrumento que titular). */
function resolverInstrumentoUnico(actividades: UnidadActividad[]): string | undefined {
  const distintos = new Set(actividades.map((a) => a.instrumento).filter(Boolean))
  return distintos.size === 1 ? [...distintos][0] : undefined
}

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
  /** Llamado cuando la unidad abierta se elimina — la página reselecciona
   *  otra en el rail (esta ya no existe). */
  onDeleted?: () => void
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
  onAction,
  action,
}: {
  title: string
  description?: string
  actionLabel?: string
  /** Sin esto (y sin `action`) el botón queda `disabled` — mismo criterio
   *  que el resto de la app para las acciones que todavía no tienen flujo
   *  propio. */
  onAction?: () => void
  /** Reemplaza el botón por defecto con un nodo propio — para acciones que
   *  abren un `Popover` autocontenido (ej. `DialogAgregarActividad`) en vez
   *  de un `onClick` simple: ahí el trigger y el contenido viven juntos, no
   *  se puede armar con `actionLabel`/`onAction`. */
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action ?? (
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
      )}
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
  // `unidad.enfoquePedagogico` SIEMPRE llega "Evaluativo" desde este listado
  // (el backend real no guarda un enfoque propio por unidad, ver el
  // comentario de `toUnidadTematica` en `use-unidades-query.ts`) — hay que
  // derivarlo en vivo. `useUnidadReferenteQuery` (por `unidad.id`, la unidad
  // YA existe acá), no `useReferenteCurricularQuery(unidad.gradoId,
  // unidad.asignaturaId)`: esos ids casi nunca vienen del backend real (ver
  // el comentario de `UnidadTematica.gradoId`), así que esa query quedaba
  // deshabilitada para la mayoría de las unidades reales y `esFormativa`
  // caía siempre al default `false` (mismo bug ya corregido en
  // `Actividades`/`DialogAgregarActividad`/`UnidadTabs`, acá en un cuarto
  // lugar).
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativa = unidadReferente?.esFormativo ?? false

  return (
    <div className="flex flex-col gap-6">
      {/* `referenteVigente === false`: el referente curricular que esta
          unidad guarda ya no está activo (lo desactivaron en el catálogo) —
          no puede ofrecer enunciados/evidencias hasta que se le asigne uno
          vigente (ver el comentario de `UnidadTematica.referenteVigente`).
          `undefined` (mock, o backend viejo) no muestra nada. */}
      {unidad.referenteVigente === false && (
        <div className="border-orange bg-orange-22 text-orange flex items-start gap-2 rounded-md border p-3 text-sm">
          <WarningIcon className="size-4 shrink-0 translate-y-0.5" aria-hidden="true" />
          <p>
            El referente curricular de esta unidad ya no está activo. No puede ofrecer enunciados ni
            evidencias hasta que se le asigne uno vigente.
          </p>
        </div>
      )}

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
        {/* Una unidad de enfoque Formativo no admite actividades sumativas
            (mismo bloqueo que ya aplica `UnidadAsociadaSection` en el form de
            Actividad, y el mismo `enfoqueDerivado !== "Formativo"` que ya
            oculta este bloque en la edición, `UnidadInfoGeneralFields`) —
            sin actividades sumativas no hay nada que "calcular" a partir de
            ellas, así que el método de cálculo no aplica y no tiene sentido
            mostrarlo acá tampoco. Antes el panel de VER lo mostraba siempre,
            aunque `UnidadDraft.metodoCalculo` para una unidad Formativa
            siga trayendo el default ("Ponderado") sin que el docente lo haya
            elegido. */}
        {!esFormativa && (
          <>
            <h4 className="text-sm font-semibold">
              Forma en que se van a calcular las actividades dentro de la unidad
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

/**
 * Exportado (no solo usado acá adentro): las páginas de alta/edición de
 * unidad (`planeador-editar-unidad-page.tsx`) reusan esta misma pestaña
 * tal cual, para no mantener dos editores de criterios distintos.
 */
export function Rubricas({
  unidad,
  instrumentoLabel,
}: {
  unidad: UnidadTematica
  /** Ver `resolverInstrumentoUnico`/`getVisibleTabs`: mismo rótulo que ya
   *  resuelve la pestaña, pasado por el caller (`UnidadTabs`) para no volver
   *  a pedir las actividades vinculadas acá adentro. `undefined` cuando no
   *  hay un único instrumento que mostrar (sin actividades vinculadas, o con
   *  varias que usan instrumentos distintos) — ahí el título se queda en el
   *  genérico "Criterios de la unidad". Opcional: `planeador-editar-unidad-
   *  page.tsx` reusa este componente ANTES de que la unidad tenga
   *  actividades vinculadas (alta), donde no aplica. */
  instrumentoLabel?: string
}) {
  // Nombres (y cantidad) reales de los niveles de desempeño de la unidad —
  // MISMA query que `DialogAgregarCriterio` (`GET /planeador/unidades/:id/
  // valoraciones`, confirmado real), para que la tabla y el modal de alta
  // queden con la MISMA cantidad de columnas/campos. Antes la tabla sacaba
  // sus nombres de `useNivelesDesempenoNombres` (derivado por nivel
  // educativo, con default fijo de 4 bandas) mientras el modal ya usaba
  // esta query por unidad — cuando la escala real de la unidad no
  // coincidía con ese derivado (más o menos bandas, nombres distintos), la
  // tabla mostraba menos columnas que niveles tenía cada criterio guardado.
  const { data: valoraciones = [] } = useUnidadValoracionesQuery(unidad.id)
  const nombresNiveles = React.useMemo(() => valoraciones.map((v) => v.nombre), [valoraciones])
  const columns = React.useMemo(
    () => createUnidadCriteriosColumns(nombresNiveles),
    [nombresNiveles],
  )
  // `GET /planeador/unidades/:id/criterios` (real) — no se lee `unidad.criterios`
  // del detalle: ese campo queda siempre vacío contra el backend real (viven
  // en este endpoint aparte, mismo criterio que `Actividades` más abajo).
  const { data: criterios = [], isPending, isError, refetch } = useUnidadCriteriosQuery(unidad.id)
  const { sorted, sorting, setSorting } = useSortedRows(criterios)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  // Sin `Pagination`: los criterios vienen enteros en una sola llamada y son
  // pocos, así que entran todos en una sola página.
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
        title={instrumentoLabel ? `Criterios en ${instrumentoLabel}` : "Criterios de la unidad"}
        actionLabel="Agregar criterio"
        onAction={() => setDialogOpen(true)}
      />
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Esta unidad no tiene criterios definidos."
      />
      <DialogAgregarCriterio unidadId={unidad.id} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

/** Exportado por el mismo motivo que `Rubricas` — ver su comentario. */
export function Actividades({ unidad }: { unidad: UnidadTematica }) {
  // `GET /unidades/:id/actividades` (real) — ya no se lee `unidad.actividades`
  // del detalle: ese campo queda siempre vacío contra el backend real
  // (viven en este endpoint aparte, ver `use-unidad-actividades-query.ts`).
  const { data: actividadesVinculadas = [], isPending, isError, refetch } = useUnidadActividadesQuery(unidad.id)
  // Suma de TODAS las ponderaciones ya vinculadas — el tope de cada fila al
  // editar en línea sale de acá (ver `createUnidadActividadesColumns`), no
  // de un `100` fijo por fila.
  const totalPonderacion = React.useMemo(
    () => actividadesVinculadas.reduce((sum, a) => sum + a.ponderacion, 0),
    [actividadesVinculadas],
  )
  // `unidad.enfoquePedagogico` NO sirve acá: el backend real no guarda un
  // enfoque propio por unidad y `useUnidadesQuery` siempre lo manda
  // "Evaluativo" (ver el comentario de `toUnidadTematica`) — usarlo dejaba
  // "(%)" visible en unidades Formativas de verdad (reportado en vivo,
  // "Exploramos y contamos nuestras experiencias", Preescolar). El
  // referente REAL de esta unidad ya guardada sale de
  // `useUnidadReferenteQuery` (por `unidad.id`, no por grado/asignatura).
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativa = unidadReferente?.esFormativo ?? false
  // Mismo criterio que la pestaña "Rúbricas" (`resolverInstrumentoUnico`):
  // `undefined` en Formativa (no hay instrumento) o con instrumentos
  // mixtos/sin actividades vinculadas todavía.
  const instrumentoLabel = React.useMemo(
    () => resolverInstrumentoUnico(actividadesVinculadas),
    [actividadesVinculadas],
  )
  const columns = React.useMemo(
    () => createUnidadActividadesColumns(unidad.id, unidad.metodoCalculo, totalPonderacion, esFormativa),
    [unidad.id, unidad.metodoCalculo, totalPonderacion, esFormativa],
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

  // Pedido explícito: título y descripción decían siempre "Actividades de
  // la unidad"/"su peso dentro de la unidad" sin importar nada — mismo
  // criterio que ya usa "Rúbricas" (`getVisibleTabs`/`resolverInstrumentoUnico`):
  // con un único instrumento entre las actividades vinculadas, "Actividades
  // en {instrumento}" / "Actividades vinculadas en {instrumento}." — más
  // preciso que el peso/método de cálculo, que es un dato aparte (una misma
  // unidad Rúbrica puede ser Ponderada o Promediada). Sin instrumento único
  // (Formativa —nunca lo tiene—, sin actividades vinculadas todavía, o con
  // varias que usan instrumentos distintos) se cae al genérico de siempre,
  // con el método de cálculo como pista (`esFormativa` manda antes que
  // `metodoCalculo`, igual que la columna de peso/el banner de abajo).
  const tituloActividades = instrumentoLabel ? `Actividades en ${instrumentoLabel}` : "Actividades de la unidad"
  const descripcionActividades = instrumentoLabel
    ? `Actividades vinculadas en ${instrumentoLabel}.`
    : esFormativa
      ? "Las actividades vinculadas a la unidad."
      : unidad.metodoCalculo === "Ponderado"
        ? "Las actividades vinculadas y su peso (%) dentro de la unidad."
        : unidad.metodoCalculo === "Suma de puntos"
          ? "Las actividades vinculadas y su puntaje dentro de la unidad."
          : "Las actividades vinculadas a la unidad — todas cuentan por igual."

  return (
    <div>
      <TabHeader
        title={tituloActividades}
        description={descripcionActividades}
        action={<DialogAgregarActividad unidad={unidad} />}
      />
      {/* Formativa: SIN banner — no hay nada de calificación que aclarar (la
          unidad se observa, no se califica; "Promedio simple" abajo es un
          aviso sobre cálculo de nota, y acá ese cálculo directamente no
          aplica). "Promedio simple" no lleva peso por actividad (ni %, ni
          puntaje) — sin la columna, la tabla podía leerse como si algo
          faltara por cargar; el banner aclara que es el método el que lo
          decide. Mismo criterio en el popover "Vincular actividad"
          (`DialogAgregarActividad`). */}
      {!esFormativa && unidad.metodoCalculo === "Promedio simple" && (
        <div className="border-blue-stroke bg-blue-22 text-blue mb-4 flex items-start gap-3 rounded-md border p-3 text-sm">
          <InfoIcon className="size-5 shrink-0" />
          <p>
            Esta unidad temática promedia sus actividades: todas cuentan por igual, no hay un peso
            ni un puntaje que asignar.
          </p>
        </div>
      )}
      <DataTable
        table={table}
        isPending={isPending}
        isError={isError}
        onRetry={refetch}
        emptyMessage="Esta unidad todavía no tiene actividades vinculadas."
      />
    </div>
  )
}

/**
 * Envuelve `Tabs` para poder correr el `useEffect` que corrige la pestaña
 * seleccionada cuando la unidad activa cambia a una sin "Rúbricas" (por
 * ejemplo, el usuario tenía esa pestaña abierta en una unidad Evaluativo
 * y hace click en una unidad Formativo en la lista de la izquierda):
 * sin esto, `Tabs` quedaría con un `value` que no matchea ningún
 * `TabsTrigger` visible y no se vería ningún contenido.
 *
 * El enfoque (¿es Formativo?) sale de `useUnidadReferenteQuery` (por
 * `unidad.id`, la unidad YA existe acá) en vez de `useReferenteCurricularQuery
 * (unidad.gradoId, unidad.asignaturaId)`: esos ids casi nunca vienen del
 * backend real (solo cuando el docente los ELIGIÓ en el form de edición, ver
 * el comentario de `UnidadTematica.gradoId`), así que esa query quedaba
 * deshabilitada para la mayoría de las unidades reales y `esFormativo` caía
 * siempre al default `false` — la pestaña "Rúbricas" se mostraba igual en
 * unidades Formativas de verdad (mismo bug que ya se corrigió en
 * `Actividades`/`DialogAgregarActividad`, acá en un tercer lugar).
 * Tampoco leer `unidad.enfoquePedagogico`: viene hardcodeado en
 * `"Evaluativo"` para toda unidad real (el backend no lo guarda por unidad).
 */
function UnidadTabs({
  unidad,
  tab,
  onTabChange,
}: {
  unidad: UnidadTematica
  tab: PanelTab
  onTabChange: (tab: PanelTab) => void
}) {
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativo = unidadReferente?.esFormativo ?? false
  // Instrumento real de las actividades ya vinculadas — ver
  // `resolverInstrumentoUnico` y el comentario de `getVisibleTabs`.
  const { data: actividadesVinculadas = [] } = useUnidadActividadesQuery(unidad.id)
  const instrumentoLabel = React.useMemo(
    () => resolverInstrumentoUnico(actividadesVinculadas),
    [actividadesVinculadas],
  )
  const visibleTabs = React.useMemo(
    () => getVisibleTabs(esFormativo, instrumentoLabel),
    [esFormativo, instrumentoLabel],
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
        <InformacionGeneral unidad={unidad} />
      </TabsContent>
      {!esFormativo && (
        <TabsContent value="rubricas" className={PANEL}>
          <Rubricas unidad={unidad} instrumentoLabel={instrumentoLabel} />
        </TabsContent>
      )}
      <TabsContent value="actividades" className={PANEL}>
        <Actividades unidad={unidad} />
      </TabsContent>
    </Tabs>
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
export function UnidadDetallePanel({ unidadId, onDeleted }: UnidadDetallePanelProps) {
  const { data: unidad, isPending, isError, refetch } = useUnidadDetalleQuery(Number(unidadId))
  const [tab, setTab] = React.useState<PanelTab>("general")

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col rounded-md border bg-card">
      <div className="bg-muted/10 flex items-center justify-between gap-2 border-b p-3">
        <h2 className="min-w-0 truncate text-base font-bold">
          {unidad?.nombre ?? "Cargando…"}
        </h2>
        {unidad && (
          <div className="flex shrink-0 items-center gap-0.5">
            {/* Página aparte, no modal — mismo criterio que "Editar" de
                Actividad (`planeador-editar-actividad-page.tsx`). */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Editar"
                    render={<Link to={paths.app.planeadorUnidadEditar.getHref(String(unidad.id))} />}
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>Editar</TooltipContent>
            </Tooltip>
            <DialogDeleteUnidad unidad={unidad} onDeleted={onDeleted} />
          </div>
        )}
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
          <UnidadTabs unidad={unidad} tab={tab} onTabChange={setTab} />
        )}
      </div>
    </div>
  )
}
