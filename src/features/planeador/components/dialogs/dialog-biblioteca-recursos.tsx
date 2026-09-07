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
import { useActividadesQuery } from "@/features/planeador/api/query/use-actividades-query"

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

interface RecursoGaleriaItem extends Recurso {
  /** Nombre de la actividad de la que proviene este recurso (para que el
   *  usuario sepa de dónde lo está trayendo). */
  actividadNombre: string
}

interface DialogBibliotecaRecursosProps {
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
  recursosActuales,
  onSelect,
  open,
  onOpenChange,
}: DialogBibliotecaRecursosProps) {
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)

  // Trae TODAS las actividades del docente. Acá no paginamos contra el
  // backend porque la lista mock es chica (~12) y la galería se arma en
  // el cliente; cuando llegue el endpoint real con paginación se ajusta.
  const { data: actividades = [] } = useActividadesQuery()

  // Aplana: de cada actividad, todos sus `recursos`. Cada item queda
  // etiquetado con el nombre de la actividad de origen para que el
  // usuario sepa de dónde viene cuando lo ve en la grilla.
  const biblioteca = useMemo<RecursoGaleriaItem[]>(() => {
    const items: RecursoGaleriaItem[] = []
    for (const act of actividades) {
      for (const r of act.recursos) {
        items.push({ ...r, actividadNombre: act.nombre })
      }
    }
    return items
  }, [actividades])

  // Excluye los que ya están en el form actual — agregarlos de nuevo
  // no aporta (el docente ya los ve abajo en "Recursos agregados").
  // La dedupe es por URL: si dos actividades tienen el mismo enlace,
  // cuentan como uno solo, lo que matchea el comportamiento de "ya
  // tengo este recurso, no lo quiero dos veces".
  const bibliotecaDisponible = useMemo(() => {
    const urlsActuales = new Set(recursosActuales.map((r) => r.url).filter(Boolean))
    return biblioteca.filter((r) => !urlsActuales.has(r.url))
  }, [biblioteca, recursosActuales])

  // Filtra por query: contra título, descripción, fuente, nombre de
  // actividad de origen y url. Sin acentos es lo justo para que
  // "actividad" matchee "actividad" sin depender del locale del
  // navegador.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return bibliotecaDisponible
    return bibliotecaDisponible.filter((r) => {
      const haystack = [r.titulo, r.descripcion, r.fuente, r.url, r.actividadNombre]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [bibliotecaDisponible, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Si el filtro reduce las páginas, clampeamos para no quedar en una
  // página que ya no existe (mismo patrón que `DialogSelectGeneralAreas`).
  const page = Math.min(pageIndex, pageCount - 1)
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function handleSearch(next: string) {
    setSearch(next)
    setPageIndex(0)
  }

  function handleSelect(item: RecursoGaleriaItem) {
    // Devolvemos el recurso SIN `id` y SIN `actividadNombre` (esos son
    // metadata de la galería, no del recurso). El padre genera el id
    // nuevo al insertarlo en el form.
    const { actividadNombre: _omit, ...recursoSinId } = item
    onSelect(recursoSinId)
    onOpenChange(false)
    // Reset al cerrar para que la próxima apertura arranque limpia
    // (mismo patrón que `DialogSelectGeneralAreas.handleOpenChange`).
    setSearch("")
    setPageIndex(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Biblioteca de recursos</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Recursos que ya subiste en otras actividades. Elegí uno para agregarlo sin volver a cargarlo.
          </p>
        </DialogHeader>

        {/* Buscador: `<Field variant="outlined">` con label flotante.
            El ícono `MagnifyingGlassIcon` ya no se necesita como addon —
            con el label flotante se vería redundante (la etiqueta
            "Buscar…" ya comunica la acción). */}
        <Field variant="outlined">
          <FieldLabel htmlFor="biblioteca-search">Buscar</FieldLabel>
          <Input
            id="biblioteca-search"
            autoFocus
            placeholder="Buscar por título, descripción, actividad..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </Field>

        {filtered.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed py-12 text-center text-sm">
            {bibliotecaDisponible.length === 0
              ? "No tenés recursos guardados en otras actividades todavía."
              : "Sin recursos que coincidan con la búsqueda."}
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))` }}
          >
            {pageItems.map((item) => (
              <RecursoGaleriaCard
                key={`${item.actividadNombre}-${item.url}-${item.id}`}
                item={item}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
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

        <DialogFooter>
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
  const tipoLabel =
    item.tipo === "URL"
      ? "URL / Sitio web"
      : item.tipo === "Unidad virtual"
        ? "Unidad virtual / repositorio"
        : "Archivo en PC"

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group/card flex h-full flex-col items-start gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted-22 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {tipoLabel}
        </span>
        <CheckIcon className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover/card:opacity-100" />
      </div>
      <p className="line-clamp-2 text-sm font-medium" title={item.url || item.fuente}>
        {item.titulo || item.url || item.fuente || "(sin título)"}
      </p>
      {item.descripcion && (
        <p
          className="text-muted-foreground line-clamp-2 text-xs"
          title={item.descripcion}
        >
          {item.descripcion}
        </p>
      )}
      <p className="text-muted-foreground mt-auto line-clamp-1 text-xs italic" title={item.actividadNombre}>
        de: {item.actividadNombre}
      </p>
    </button>
  )
}
