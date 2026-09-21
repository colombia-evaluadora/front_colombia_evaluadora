import { useMemo, useState } from "react"

import { CheckIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import type { Recurso } from "@/features/planeador/api/types/actividad"
import {
  useMaterialesReutilizablesQuery,
  type MaterialReutilizable,
} from "@/features/planeador/api/query/use-materiales-reutilizables-query"

const COLUMNS = 3
const ROWS = 6
const PAGE_SIZE = COLUMNS * ROWS

// Misma ventana de páginas que `DialogSelectGeneralAreas`: muestra la
// actual, las vecinas y los extremos, con elipsis para los saltos. Ver
// el comentario de `buildPageRange` en ese componente para los detalles
// del por qué de la ventana de 3.
function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  const window = new Set<number>([1, total, current - 1, current, current + 1])
  const items: (number | "ellipsis")[] = []
  let last = 0
  for (const p of [...window].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)) {
    if (last && p - last > 1) items.push("ellipsis")
    items.push(p)
    last = p
  }
  return items
}

/** Lo que la galería pinta: el material del endpoint, tal cual. */
type RecursoGaleriaItem = MaterialReutilizable

interface DialogBibliotecaRecursosProps {
  /** La actividad que se está editando, o 0 si todavía se está creando.
   *  Cuando existe, el backend la EXCLUYE de la galería (no tiene sentido
   *  reusar un archivo de sí misma) y la usa para resolver el alcance. */
  actividadId: number
  /** El grupo del formulario. Es el ancla del alcance mientras la
   *  actividad no exista; sin ninguno de los dos el backend responde 400. */
  grupoId: number
  /** Recursos ya en el form actual — se excluyen de la galería para no
   *  mostrar duplicados. */
  recursosActuales: Recurso[]
  /** Llamado cuando el docente elige un recurso de la galería. Recibe el
   *  recurso a agregar (sin id, el padre genera uno al insertarlo). */
  onSelect: (recurso: Omit<Recurso, "id">) => void
  /** Controla la apertura del modal (el padre ya tiene el botón que
   *  dispara la apertura). */
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal "Biblioteca de recursos" — galería con buscador + paginación
 * que muestra todos los recursos que el docente ha subido en sus
 * actividades previas. Pensado como atajo al alta manual: en vez de
 * tener que volver a tipear la URL/cargar el archivo para cada
 * actividad, el docente elige uno ya subido y se inserta en el form.
 *
 * Mismo idioma visual que `DialogSelectGeneralAreas`: buscador arriba,
 * grilla de 3 columnas con cards de recursos, paginación al pie, y
 * footer con confirmar/cancelar. La única diferencia es la forma de
 * seleccionar: las áreas son multi-select con checkboxes (acorde al
 * dominio), acá cada recurso es single-select — click en una card
 * agrega el recurso y cierra el modal.
 */
export function DialogBibliotecaRecursos({
  actividadId,
  grupoId,
  recursosActuales,
  onSelect,
  open,
  onOpenChange,
}: DialogBibliotecaRecursosProps) {
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)

  // Búsqueda y paginación van CONTRA EL SERVIDOR: el endpoint recibe
  // SEARCH/PAGINA/SIZE y devuelve `total_count`. Antes esto traía todas las
  // actividades del docente y filtraba en el cliente — con el listado real,
  // que no devuelve materiales, la galería salía vacía siempre.
  //
  // `open` como `enabled`: el modal vive montado junto al formulario, así
  // que sin ese gate consultaría al abrir cualquier actividad.
  const { data, isPending, isError } = useMaterialesReutilizablesQuery(
    { actividadId, grupoId, search, pagina: pageIndex + 1, size: PAGE_SIZE },
    open,
  )

  // Los que ya están en el form no se ofrecen de nuevo. La comparación es
  // por `archivoId` y no por URL: la biblioteca son ARCHIVOS, y el mismo
  // archivo puede estar en dos actividades con descripciones distintas.
  const yaAgregados = useMemo(
    () => new Set(recursosActuales.map((r) => r.archivoId).filter((id): id is number => id != null)),
    [recursosActuales],
  )

  const items = useMemo(
    () => (data?.items ?? []).filter((item) => !yaAgregados.has(item.archivoId)),
    [data, yaAgregados],
  )

  // El total lo da el servidor y NO se descuenta lo filtrado acá: sería
  // mentir sobre cuántas páginas hay. En el peor caso una página muestra
  // menos tarjetas porque alguna ya estaba agregada.
  const totalCount = data?.totalCount ?? 0
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const page = Math.min(pageIndex, pageCount - 1)

  function handleSearch(next: string) {
    setSearch(next)
    setPageIndex(0)
  }

  function handleSelect(item: RecursoGaleriaItem) {
    // Se arma un recurso de tipo "Archivo" que apunta al MISMO archivo, por
    // su id. No se copia ningún binario: `PUT .../materiales` acepta
    // `fkTarchivo` y dos actividades pueden referenciar el mismo TARCHIVO.
    onSelect({
      titulo: item.nombreArchivo,
      fuente: item.nombreArchivo,
      tipo: "Archivo",
      // Sin blob: el archivo ya está guardado del lado del servidor.
      url: "",
      descripcion: item.descripcion,
      archivoId: item.archivoId,
    })
    onOpenChange(false)
    setSearch("")
    setPageIndex(0)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Biblioteca de recursos</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Recursos que ya subiste en otras actividades. Elegí uno para agregarlo sin volver a cargarlo.
          </p>
        </DialogHeader>

        {/* Único bloque con scroll: header y footer quedan fijos afuera —
            antes el `DialogContent` no tenía `max-h`/límite de altura, así
            que una página llena de tarjetas de recurso podía empujar el
            título y los botones fuera de la pantalla. */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6">
        {/* Buscador: `<Field variant="outlined">` con label flotante.
            El ícono `MagnifyingGlassIcon` ya no se necesita como addon —
            con el label flotante se vería redundante (la etiqueta
            "Buscar…" ya comunica la acción). */}
        <Field variant="outlined">
          <FieldLabel htmlFor="biblioteca-search">Buscar</FieldLabel>
          <Input
            id="biblioteca-search"
            autoFocus
            placeholder="Buscar por nombre de archivo..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </Field>

        {isPending || isError || items.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed py-12 text-center text-sm">
            {isPending
              ? "Buscando…"
              : isError
                ? "No se pudo cargar la biblioteca."
                : search.trim()
                  ? "Sin archivos que coincidan con la búsqueda."
                  : "No hay archivos guardados en tus otras actividades todavía."}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
          >
            {items.map((item) => (
              <RecursoGaleriaCard
                key={`${item.actividadOrigenId}-${item.archivoId}`}
                item={item}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        )}

        {items.length > 0 && pageCount > 1 && (
          <div className="flex items-center justify-center">
            <UIPagination className="mx-0 w-auto justify-center">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={page > 0 ? "#" : undefined}
                    text=""
                    aria-label="Página anterior"
                    className={cn(page === 0 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault()
                      if (page > 0) setPageIndex(page - 1)
                    }}
                  />
                </PaginationItem>
                {buildPageRange(page + 1, pageCount).map((it, i) =>
                  it === "ellipsis" ? (
                    <PaginationItem key={`e-${i}`}>
                      <span className="px-2 text-muted-foreground">…</span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={it}>
                      <PaginationLink
                        href="#"
                        isActive={it === page + 1}
                        onClick={(e) => {
                          e.preventDefault()
                          setPageIndex(it - 1)
                        }}
                      >
                        {it}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    href={page < pageCount - 1 ? "#" : undefined}
                    text=""
                    aria-label="Página siguiente"
                    className={cn(page >= pageCount - 1 && "pointer-events-none opacity-50")}
                    onClick={(e) => {
                      e.preventDefault()
                      if (page < pageCount - 1) setPageIndex(page + 1)
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </UIPagination>
          </div>
        )}
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6">
          {/* El footer acá es solo "Cerrar" — la selección es single-shot
              (cada card click agrega y cierra), no hay draft que confirmar
              como en el dialog de áreas. Diferencia explícita con
              `DialogSelectGeneralAreas`. `fill` + `neutral` para que el
              botón tenga el mismo peso visual que la acción primaria
              (agregar un recurso desde la card), sin competir con ella
              por color: acá no hay primaria, las acciones del modal son
              todas neutras. */}
          <DialogClose
            render={
              <Button size="sm" type="button" variant="fill" color="neutral" />
            }
          >
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Card individual de la galería. Click la selecciona; muestra título,
 * tipo y la actividad de origen para que el docente sepa qué está
 * trayendo. Mismo idioma visual que `RecursoItem` del listado principal,
 * pero read-only — el único affordance es el click.
 */
function RecursoGaleriaCard({
  item,
  onSelect,
}: {
  item: RecursoGaleriaItem
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group/card flex h-full flex-col items-start gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted-22 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {item.tipoRecurso || "Archivo en PC"}
        </span>
        <CheckIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover/card:opacity-100" />
      </div>
      <p className="line-clamp-2 text-sm font-medium" title={item.nombreArchivo}>
        {item.nombreArchivo}
      </p>
      {item.descripcion && (
        <p className="text-muted-foreground line-clamp-2 text-xs" title={item.descripcion}>
          {item.descripcion}
        </p>
      )}
      <p
        className="text-muted-foreground mt-auto line-clamp-1 text-xs italic"
        title={item.actividadOrigenTitulo}
      >
        de: {item.actividadOrigenTitulo}
      </p>
    </button>
  )
}
