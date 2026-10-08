import { useState } from "react"
import { isAfter, subDays, startOfYear } from "date-fns"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CaretDownIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { ArchivoCompartido, FormatoArchivo } from "@/features/comunicaciones/chat/api/types"
import { ICONO_ARCHIVO } from "@/features/comunicaciones/chat/api/ui-mappings"
import { useArchivosQuery } from "@/features/comunicaciones/chat/api/query/use-archivos-query"
import { fechaLarga } from "@/features/comunicaciones/chat/lib/chat-format"
import { SquaresFourIcon, ListIcon } from "@/components/ui/icons"
import { VistaEncabezado } from "@/features/comunicaciones/chat/components/vista-encabezado"
import { ArchivoAcciones } from "@/features/comunicaciones/chat/components/archivo-acciones"
import { DocumentoEditor } from "@/features/comunicaciones/chat/components/documento-editor"

// Mismo estilo de item que el menú de conversaciones (en oración, no mayúsculas).
const ITEM = "gap-3 py-2 text-sm font-normal tracking-normal normal-case"

type Alcance = "TODO" | "MIOS" | "OTROS"
type Periodo = "CUALQUIERA" | "7D" | "30D" | "ANIO"
type Tipo = "TODOS" | FormatoArchivo
type Orden = "RECIENTE" | "ANTIGUO" | "NOMBRE"

const ALCANCES: Opcion<Alcance>[] = [
  { valor: "TODO", etiqueta: "Todo" },
  { valor: "MIOS", etiqueta: "Compartidos por mí" },
  { valor: "OTROS", etiqueta: "Compartidos conmigo" },
]
const PERIODOS: Opcion<Periodo>[] = [
  { valor: "CUALQUIERA", etiqueta: "Cualquier fecha" },
  { valor: "7D", etiqueta: "Últimos 7 días" },
  { valor: "30D", etiqueta: "Últimos 30 días" },
  { valor: "ANIO", etiqueta: "Este año" },
]
const TIPOS: Opcion<Tipo>[] = [
  { valor: "TODOS", etiqueta: "Todos los tipos" },
  { valor: "WORD", etiqueta: "Documentos de Word" },
  { valor: "PDF", etiqueta: "PDF" },
  { valor: "IMAGEN", etiqueta: "Imágenes" },
]
const ORDENES: Opcion<Orden>[] = [
  { valor: "RECIENTE", etiqueta: "Archivo más reciente" },
  { valor: "ANTIGUO", etiqueta: "Archivo más antiguo" },
  { valor: "NOMBRE", etiqueta: "Nombre (A-Z)" },
]

interface Opcion<T> {
  valor: T
  etiqueta: string
}

function desdePeriodo(periodo: Periodo) {
  const hoy = new Date()
  if (periodo === "7D") return subDays(hoy, 7)
  if (periodo === "30D") return subDays(hoy, 30)
  if (periodo === "ANIO") return startOfYear(hoy)
  return null
}

export function ArchivosView({ onVolver }: { onVolver: () => void }) {
  const [editando, setEditando] = useState<ArchivoCompartido | null>(null)
  if (editando) return <DocumentoEditor archivo={editando} onVolver={() => setEditando(null)} />
  return <ListaArchivos onVolver={onVolver} onEditar={setEditando} />
}

function ListaArchivos({
  onVolver,
  onEditar,
}: {
  onVolver: () => void
  onEditar: (a: ArchivoCompartido) => void
}) {
  const { data = [], isPending, isError, refetch } = useArchivosQuery()
  const [busqueda, setBusqueda] = useState("")
  const [alcance, setAlcance] = useState<Alcance>("TODO")
  const [periodo, setPeriodo] = useState<Periodo>("CUALQUIERA")
  const [tipo, setTipo] = useState<Tipo>("TODOS")
  const [soloMisCanales, setSoloMisCanales] = useState(false)
  const [orden, setOrden] = useState<Orden>("RECIENTE")
  const [cuadricula, setCuadricula] = useState(false)

  const texto = busqueda.trim().toLowerCase()
  const desde = desdePeriodo(periodo)
  const resultados = data
    .filter((a) => !texto || `${a.nombre} ${a.conversacionNombre}`.toLowerCase().includes(texto))
    .filter((a) => alcance === "TODO" || (alcance === "MIOS") === a.esPropio)
    .filter((a) => !desde || isAfter(new Date(a.fecha), desde))
    .filter((a) => tipo === "TODOS" || a.formato === tipo)
    .filter((a) => !soloMisCanales || a.enMiCanal)
    .sort((a, b) => {
      if (orden === "NOMBRE") return a.nombre.localeCompare(b.nombre, "es")
      const dif = a.fecha.localeCompare(b.fecha)
      return orden === "RECIENTE" ? -dif : dif
    })

  const hayFiltros =
    !!texto || alcance !== "TODO" || periodo !== "CUALQUIERA" || tipo !== "TODOS" || soloMisCanales

  const limpiar = () => {
    setBusqueda("")
    setAlcance("TODO")
    setPeriodo("CUALQUIERA")
    setTipo("TODOS")
    setSoloMisCanales(false)
  }

  return (
    <>
      <VistaEncabezado titulo="Archivos" onVolver={onVolver}>
        <label className="ml-auto flex h-10 w-full max-w-xl min-w-0 items-center gap-2 rounded-lg border bg-card px-3 focus-within:ring-2 focus-within:ring-primary">
          <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Buscar archivos</span>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setBusqueda("")}
            placeholder="Buscar por nombre de archivo o palabra clave"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {busqueda && (
            <button type="button" aria-label="Limpiar búsqueda" onClick={() => setBusqueda("")}>
              <XIcon className="size-4 text-muted-foreground" />
            </button>
          )}
        </label>
      </VistaEncabezado>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <FiltroMenu etiqueta="Alcance" opciones={ALCANCES} valor={alcance} onCambio={setAlcance} />
          <FiltroMenu
            etiqueta="Fecha"
            opciones={PERIODOS}
            valor={periodo}
            onCambio={setPeriodo}
            neutro="CUALQUIERA"
          />
          <FiltroMenu
            etiqueta="Tipo de archivo"
            opciones={TIPOS}
            valor={tipo}
            onCambio={setTipo}
            neutro="TODOS"
          />
          <button
            type="button"
            aria-pressed={soloMisCanales}
            onClick={() => setSoloMisCanales((v) => !v)}
            className={chip(soloMisCanales)}
          >
            {soloMisCanales && <CheckIcon aria-hidden className="size-4" />}
            Solo mis canales
          </button>

          <div
            role="group"
            aria-label="Forma de ver los archivos"
            className="ml-auto flex overflow-hidden rounded-lg border"
          >
            <button
              type="button"
              aria-label="Ver en lista"
              aria-pressed={!cuadricula}
              onClick={() => setCuadricula(false)}
              className={vistaBoton(!cuadricula)}
            >
              <ListIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Ver en cuadrícula"
              aria-pressed={cuadricula}
              onClick={() => setCuadricula(true)}
              className={cn(vistaBoton(cuadricula), "border-l")}
            >
              <SquaresFourIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 mb-3 flex items-center justify-between gap-3 text-sm">
          <p aria-live="polite" className="font-medium">
            {isPending ? "Cargando…" : `${resultados.length} ${resultados.length === 1 ? "resultado" : "resultados"}`}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              Ordenar: {ORDENES.find((o) => o.valor === orden)?.etiqueta}
              <CaretDownIcon aria-hidden className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {ORDENES.map((o) => (
                <ItemOpcion key={o.valor} activo={o.valor === orden} onClick={() => setOrden(o.valor)}>
                  {o.etiqueta}
                </ItemOpcion>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isPending ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-17 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm">
            <p className="text-muted-foreground">No se pudieron cargar los archivos.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 font-medium text-primary underline"
            >
              Reintentar
            </button>
          </div>
        ) : resultados.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {hayFiltros ? (
              <>
                <p>Ningún archivo coincide con los filtros.</p>
                <button
                  type="button"
                  onClick={limpiar}
                  className="mt-2 font-medium text-primary underline"
                >
                  Quitar filtros
                </button>
              </>
            ) : (
              <p>Los archivos que se compartan en tus canales aparecerán aquí.</p>
            )}
          </div>
        ) : (
          <ul
            className={cn(
              cuadricula ? "grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3" : "space-y-2",
            )}
          >
            {resultados.map((a) => (
              <li key={a.id}>
                <TarjetaArchivo archivo={a} cuadricula={cuadricula} onEditar={() => onEditar(a)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function chip(activo: boolean) {
  return cn(
    "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
    activo ? "border-primary bg-primary/10 text-foreground" : "bg-card hover:bg-muted/40",
  )
}

function vistaBoton(activo: boolean) {
  return cn(
    "grid size-9 place-items-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset",
    activo ? "bg-muted/60 text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
  )
}

function FiltroMenu<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambio,
  neutro,
}: {
  etiqueta: string
  opciones: Opcion<T>[]
  valor: T
  onCambio: (valor: T) => void
  // Valor que no filtra; si no se da, el primero. Con él el chip muestra `etiqueta`.
  neutro?: T
}) {
  const sinFiltro = valor === (neutro ?? opciones[0].valor)
  const actual = opciones.find((o) => o.valor === valor)?.etiqueta
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`${etiqueta}: ${actual}`} className={chip(!sinFiltro && !!neutro)}>
        {neutro && sinFiltro ? etiqueta : actual}
        <CaretDownIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        {opciones.map((o) => (
          <ItemOpcion key={o.valor} activo={o.valor === valor} onClick={() => onCambio(o.valor)}>
            {o.etiqueta}
          </ItemOpcion>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ItemOpcion({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: string
}) {
  return (
    <DropdownMenuItem className={ITEM} onClick={onClick}>
      <CheckIcon aria-hidden className={cn("size-4", !activo && "invisible")} />
      {children}
    </DropdownMenuItem>
  )
}

function TarjetaArchivo({
  archivo: a,
  cuadricula,
  onEditar,
}: {
  archivo: ArchivoCompartido
  cuadricula: boolean
  onEditar: () => void
}) {
  const { Icono, color, tipo } = ICONO_ARCHIVO[a.formato]
  const detalle = `Compartido por ${a.esPropio ? "ti" : a.compartidoPor} el ${fechaLarga(a.fecha)}`
  return (
    <article
      className={cn(
        "group/archivo relative flex rounded-lg border bg-card transition-colors hover:border-primary/40",
        cuadricula ? "flex-col gap-3 p-3" : "items-center gap-3 px-4 py-3",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center rounded-md bg-muted/40",
          cuadricula ? "h-24 w-full" : "size-10",
        )}
      >
        <Icono className={cn(color, cuadricula ? "size-10" : "size-7")} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium" title={a.nombre}>
          {a.nombre}
        </h3>
        <p className="truncate text-xs text-muted-foreground" title={`${detalle} en ${a.conversacionNombre}`}>
          <span className="sr-only">{tipo}. </span>
          {detalle}
        </p>
      </div>
      {/* Visible al pasar el cursor o al llegar con el teclado. */}
      <ArchivoAcciones
        archivo={a}
        onEditar={onEditar}
        className={cn(
          "absolute top-2 right-2 opacity-0 transition-opacity group-focus-within/archivo:opacity-100 group-hover/archivo:opacity-100 has-data-popup-open:opacity-100 motion-reduce:transition-none",
          !cuadricula && "top-1/2 -translate-y-1/2",
        )}
      />
    </article>
  )
}
