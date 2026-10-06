import { useState, type ReactNode } from "react"
import type { IconType } from "react-icons"

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { MagnifyingGlassIcon, PlusIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { ConversacionAcciones } from "@/features/comunicaciones/chat/components/conversacion-acciones"
import { AgregarCanal } from "@/features/comunicaciones/chat/components/agregar-canal"
import { useInstitucionQuery } from "@/features/comunicaciones/chat/api/query/use-institucion-query"
import { useBorradoresQuery } from "@/features/comunicaciones/chat/api/query/use-borradores-query"
import type { VistaChat } from "@/features/comunicaciones/chat/api/schema"
import {
  StackIcon,
  HashIcon,
  CaretDownFillIcon,
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  AtIcon,
  BellSlashIcon,
} from "@/components/ui/icons"

interface ChatSidebarProps {
  conversaciones: Conversacion[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  activaId: number | undefined
  vista: VistaChat | undefined
  onVista: (vista: VistaChat) => void
| undefined
  onSeleccionar: (id: number | undefined) => void
  className?: string
}

export function ChatSidebar({
  conversaciones,
  isPending,
  isError,
  onRetry,
  activaId,
  vista,
  onVista,
  onSeleccionar,
  className,
}: ChatSidebarProps) {
  const { data: institucion } = useInstitucionQuery()
  const { data: borradores = [] } = useBorradoresQuery()
  const totalBorradores = borradores.filter((b) => b.estado === "BORRADOR").length
  const [buscando, setBuscando] = useState(false)
  const [filtro, setFiltro] = useState("")

  const texto = filtro.trim().toLowerCase()
  const visibles = texto
    ? conversaciones.filter((c) => c.nombre.toLowerCase().includes(texto))
    : conversaciones
  const directos = visibles.filter((c) => c.tipo === "DIRECTO" && !c.archivada)
  const canales = visibles.filter((c) => c.tipo === "CANAL" && !c.archivada)
  const archivadas = visibles.filter((c) => c.archivada)

  const item = (c: Conversacion) => (
    <ItemConversacion
      key={c.id}
      conversacion={c}
      activa={c.id === activaId}
      onClick={() => onSeleccionar(c.id)}
      onSalida={() => onSeleccionar(undefined)}
    />
  )

  const cerrarBusqueda = () => {
    setBuscando(false)
    setFiltro("")
  }

  return (
    <aside className={cn("flex min-h-0 flex-col border-r bg-chat-panel", className)}>
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        {buscando ? (
          <>
            <Input
              autoFocus
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && cerrarBusqueda()}
              placeholder="Buscar conversación"
              aria-label="Buscar conversación"
              className="h-9"
            />
            <IconoBoton etiqueta="Cerrar búsqueda" onClick={cerrarBusqueda}>
              <XIcon className="size-5" />
            </IconoBoton>
          </>
        ) : (
          <>
            <span className="flex min-w-0 flex-1 items-center gap-1 font-semibold">
              <span className="truncate">{institucion?.nombre ?? "Institución"}</span>
              <CaretDownFillIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </span>
            <IconoBoton etiqueta="Buscar conversación" onClick={() => setBuscando(true)}>
              <MagnifyingGlassIcon className="size-5" />
            </IconoBoton>
          </>
        )}
      </div>

      <nav aria-label="Conversaciones" className="min-h-0 flex-1 overflow-y-auto py-2">
        {!texto && (
          <ul className="border-b px-2 pb-2">
            <AccesoPendiente icono={AtIcon}>Menciones y reacciones</AccesoPendiente>
            <AccesoVista
              icono={PaperPlaneTiltIcon}
              activo={vista === "borradores"}
              onClick={() => onVista("borradores")}
              extra={
                totalBorradores > 0 && (
                  <span className="flex items-center gap-0.5 text-xs tabular-nums opacity-80">
                    <PencilSimpleIcon aria-hidden className="size-3.5" />
                    {totalBorradores}
                    <span className="sr-only"> borradores</span>
                  </span>
                )
              }
            >
              Borradores y enviados
            </AccesoVista>
            <AccesoVista
              icono={StackIcon}
              activo={vista === "archivos"}
              onClick={() => onVista("archivos")}
            >
              Archivos
            </AccesoVista>
            <AccesoPendiente icono={HashIcon}>Todos los canales</AccesoPendiente>
          </ul>
        )}

        {isPending ? (
          <div className="space-y-2 p-4" aria-busy>
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="space-y-2 p-4 text-sm">
            <p className="text-muted-foreground">No se pudieron cargar las conversaciones.</p>
            <button type="button" onClick={onRetry} className="font-medium text-primary underline">
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <Seccion titulo="Mensajes directos" agregar={texto ? null : "Agregar compañeros"}>
              {directos.map(item)}
            </Seccion>
            <Seccion titulo="Canales" agregar={texto ? null : <AgregarCanal onCreado={onSeleccionar} />}>
              {canales.map(item)}
            </Seccion>
            {archivadas.length > 0 && (
              <Seccion titulo={`Archivados (${archivadas.length})`} agregar={null} inicialAbierta={false}>
                {archivadas.map(item)}
              </Seccion>
            )}
            {texto && visibles.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Ninguna conversación coincide con «{filtro.trim()}».
              </p>
            )}
          </>
        )}
      </nav>
    </aside>
  )
}

function IconoBoton({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      className="grid size-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      {children}
    </button>
  )
}

function AccesoVista({
  icono: Icono,
  activo,
  onClick,
  extra,
  children,
}: {
  icono: IconType
  activo: boolean
  onClick: () => void
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
          activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/50",
        )}
      >
        <Icono aria-hidden className={cn("size-5 shrink-0", !activo && "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {extra}
      </button>
    </li>
  )
}

// Accesos que dependen del backend: se muestran pero aún no navegan.
function AccesoPendiente({ icono: Icono, children }: { icono: IconType; children: ReactNode }) {
  return (
    <li>
      <span
        aria-disabled
        title="Disponible cuando se conecte el servicio de comunicaciones"
        className="flex h-9 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground"
      >
        <Icono className="size-5 shrink-0 opacity-70" aria-hidden />
        {children}
      </span>
    </li>
  )
}

function Seccion({
  titulo,
  agregar,
  inicialAbierta = true,
  children,
}: {
  titulo: string
  // Texto = acceso aún sin back; nodo = control propio.
  agregar: ReactNode
| null
  inicialAbierta?: boolean
  children: ReactNode
}) {
  const [abierta, setAbierta] = useState(inicialAbierta)
  return (
    <section className="border-b px-2 py-2 last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={abierta}
          onClick={() => setAbierta((v) => !v)}
          className="flex h-9 w-full items-center gap-2 rounded-lg px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <CaretDownFillIcon
            aria-hidden
            className={cn("size-5 transition-transform", !abierta && "-rotate-90")}
          />
          {titulo}
        </button>
      </h3>
      {abierta && (
        <ul className="space-y-0.5">
          {children}
          {typeof agregar !== "string" ? (
            agregar && <li>{agregar}</li>
          ) : (
            <li>
              <span
                aria-disabled
                title="Disponible cuando se conecte el servicio de comunicaciones"
                className="flex h-9 items-center gap-3 px-2 text-sm text-muted-foreground"
              >
                <span className="grid size-5 place-items-center rounded bg-muted/60">
                  <PlusIcon className="size-3.5" aria-hidden />
                </span>
                {agregar}
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

function ItemConversacion({
  conversacion: c,
  activa,
  onClick,
  onSalida,
}: {
  conversacion: Conversacion
  activa: boolean
  onClick: () => void
  onSalida: () => void
}) {
  const Icono = ICONO_CATEGORIA[c.categoria]
  const conPendientes = c.noLeidos > 0 && !activa
  return (
    <li
      className={cn(
        "group/fila relative flex items-center rounded-lg transition-colors",
        activa ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={activa ? "page" : undefined}
        className={cn(
          "flex h-9 min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
          conPendientes && "font-semibold",
        )}
      >
        {c.esBot ? (
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-md bg-[conic-gradient(var(--red),var(--yellow),var(--green),var(--blue),var(--red))] text-[10px] font-bold text-white"
          >
            C
          </span>
        ) : (
          <Icono
            aria-hidden
            className={cn("size-5 shrink-0", activa ? "opacity-100" : "text-muted-foreground")}
          />
        )}
        <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
        {c.silenciadoHasta && (
          <BellSlashIcon aria-label="Silenciado" className="size-4 shrink-0 opacity-60" />
        )}
        {conPendientes && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full border px-1.5 text-xs font-medium">
            <span className="sr-only">Mensajes sin leer: </span>
            {c.noLeidos}
          </span>
        )}
        {c.actividadAbierta && !conPendientes && (
          <span
            title="Actividad abierta"
            className={cn("size-2 shrink-0 rounded-full", activa ? "bg-white" : "bg-green")}
          >
            <span className="sr-only">Actividad abierta</span>
          </span>
        )}
      </button>

      {/* Acciones al pasar el mouse o con foco; tapan los indicadores de la derecha. */}
      <ConversacionAcciones
        conversacion={c}
        variante="fila"
        activa={activa}
        onSalida={onSalida}
        className={cn(
          "absolute inset-y-0 right-0 rounded-r-lg pr-1 pl-2 opacity-0 transition-opacity group-focus-within/fila:opacity-100 group-hover/fila:opacity-100 has-data-popup-open:opacity-100 max-md:opacity-100",
          activa ? "bg-primary" : "bg-muted",
        )}
      />
    </li>
  )
}
