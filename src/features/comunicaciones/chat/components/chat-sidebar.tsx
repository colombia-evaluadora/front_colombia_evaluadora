import { CHAT_FUNCIONES, PROXIMAMENTE } from "@/features/comunicaciones/chat/lib/funciones-disponibles"
import { useState, type ReactNode } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import { ICONO_CATEGORIA } from "@/features/comunicaciones/chat/api/ui-mappings"
import { iniciales } from "@/features/comunicaciones/chat/lib/chat-format"
import { horaVistaPrevia, lineaVistaPrevia } from "@/features/comunicaciones/chat/lib/vista-previa"
import { ConversacionAcciones } from "@/features/comunicaciones/chat/components/conversacion-acciones"
import { AgregarCanal } from "@/features/comunicaciones/chat/components/agregar-canal"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { AgregarCompanero } from "@/features/comunicaciones/chat/components/agregar-companero"
import { CrearChatDialog } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import { coincidePersona, usePersonasQuery } from "@/features/comunicaciones/chat/api/query/use-personas-query"
import { useAbrirDirecto } from "@/features/comunicaciones/chat/api/mutations/use-acciones-miembro"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useBorradoresQuery } from "@/features/comunicaciones/chat/api/query/use-borradores-query"
import type { VistaChat } from "@/features/comunicaciones/chat/api/schema"
import { useArchivarConversacion } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { agregarReciente } from "@/features/comunicaciones/chat/lib/estado-mensaje"
import { InvitacionesSeccion } from "@/features/comunicaciones/chat/components/invitaciones-seccion"
import { chatRoute } from "@/router"
import { FiltrosChatPopover } from "@/features/comunicaciones/chat/components/filtros-chat-popover"
import { FavoritosFiltrosPopover } from "@/features/comunicaciones/chat/components/favoritos-filtros-popover"
import { ResultadosBusqueda } from "@/features/comunicaciones/chat/components/resultados-busqueda"
import {
  useBusquedaChatQuery,
  useOpcionesFiltroQuery,
} from "@/features/comunicaciones/chat/api/query/use-busqueda-chat-query"
import {
  FILTROS_VACIOS,
  contarFiltrosAvanzados,
  describirFiltros,
  filtrosAUrl,
  filtrosDeUrl,
  filtrosEfectivos,
  hayFiltros,
  hayFiltrosDeAutor,
  type FiltrosChat,
} from "@/features/comunicaciones/chat/lib/filtros-chat"

const CLAVE_RECIENTES = "chat-busquedas-recientes"

function leerRecientes(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function guardarRecientes(lista: string[]) {
  try {
    localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(lista))
  } catch {
    // Sin almacenamiento solo duran hasta recargar.
  }
}
import {
  StackIcon,
  CaretDownFillIcon,
  MagnifyingGlassIcon,
  XIcon,
  PencilSimpleIcon,
  PaperPlaneTiltIcon,
  BellSlashIcon,
  PlusIcon,
  UserIcon,
  UsersThreeIcon,
  ArchiveIcon,
  UnarchiveIcon,
  ClockCounterClockwiseIcon,
  WarningCircleIcon,
  type Icon,
} from "@/components/ui/icons"

interface ChatSidebarProps {
  conversaciones: Conversacion[]
  isPending: boolean
  isError: boolean
  onRetry: () => void
  activaId: number | undefined
  vista: VistaChat | undefined
  onVista: (vista: VistaChat) => void
  onSeleccionar: (id: number | undefined) => void
  // Resultado del historial filtrado: abre la conversación en ese mensaje.
  onAbrirMensaje?: (conversacionId: number, mensajeId: number) => void
  // Invitación resaltada (`?invitacion=` del deep link de la notificación).
  invitacionDestacada?: number
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
  onAbrirMensaje,
  invitacionDestacada,
  className,
}: ChatSidebarProps) {
  const { data: borradores = [] } = useBorradoresQuery()
  const totalBorradores = borradores.filter((b) => b.estado === "BORRADOR").length
  const { puedeGestionar, reglaDirectoCon } = useChatAccess()
  const { notify } = useNotify()
  // Historial y filtros (lib/filtros-chat.ts): en la URL para compartirlos o guardarlos como
  // marcador. El texto del buscador vive también en estado local para no perder el cursor.
  const filtrosUrl = chatRoute.useSearch()
  const navigate = chatRoute.useNavigate()
  const [texto, setTextoLocal] = useState(filtrosUrl.q ?? "")
  const setTexto = (v: string) => {
    setTextoLocal(v)
    navigate({ search: (prev) => ({ ...prev, q: v || undefined }), replace: true })
  }
  const filtros: FiltrosChat = { ...filtrosDeUrl(filtrosUrl), q: texto }
  const aplicarFiltros = (f: FiltrosChat) => {
    setTextoLocal(f.q)
    navigate({ search: (prev) => ({ ...prev, ...filtrosAUrl(f) }), replace: true })
  }
  const buscando = hayFiltros(filtros)
  // Filtros del panel (tipo, fechas, estado, persona, rol, grupo): la lista es la del servidor.
  const conPanel = contarFiltrosAvanzados(filtros) > 0
  const busqueda = useBusquedaChatQuery(filtros)
  const paginas = buscando ? busqueda.data?.pages : undefined
  const delServidor = new Set(paginas?.[0]?.conversaciones ?? [])
  const resultados = paginas?.flatMap((p) => p.mensajes) ?? []
  const opcionesFiltro = useOpcionesFiltroQuery(hayFiltrosDeAutor(filtros))
  const nombreGrupo = (id: number) => opcionesFiltro.data?.grupos.find((g) => Number(g.valor) === id)?.etiqueta
  const resumenFiltros = conPanel ? describirFiltros(filtros, nombreGrupo) : ""
  const [crearGrupo, setCrearGrupo] = useState(false)
  // Búsquedas recientes (diseño 4501:66442): por navegador, solo una comodidad.
  const [recientes, setRecientes] = useState<string[]>(leerRecientes)
  const [enfocado, setEnfocado] = useState(false)
  const recordar = () => {
    const nuevas = agregarReciente(recientes, texto)
    setRecientes(nuevas)
    guardarRecientes(nuevas)
  }
  const verRecientes = enfocado && !texto && recientes.length > 0
  const t = texto.trim().toLowerCase()
  // El buscador (en lugar del nombre del establecimiento) filtra la lista en el lugar y,
  // con 2+ letras, también busca personas: elegir una abre (o crea) el mensaje directo.
  // Con filtros del panel la lista es la que devuelve el servidor; con solo palabras, las que
  // coinciden por nombre más las que tienen mensajes con esas palabras.
  const visibles = conPanel
    ? conversaciones.filter((c) => delServidor.has(c.id))
    : t
      ? conversaciones.filter((c) => c.nombre.toLowerCase().includes(t) || delServidor.has(c.id))
      : conversaciones
  const personasQuery = usePersonasQuery(t.length >= 2, texto)
  const conDirecto = new Set(conversaciones.filter((c) => c.tipo === "DIRECTO").map((c) => c.nombre))
  const personas =
    t.length >= 2
      ? (personasQuery.data ?? [])
          .filter((p) => reglaDirectoCon(p.perfil) !== "PROHIBIDO" && !conDirecto.has(p.nombre))
          .filter((p) => coincidePersona(p, texto, !personasQuery.isPlaceholderData))
          .slice(0, 8)
      : []
  const abrirDirecto = useAbrirDirecto()

  const directos = visibles.filter((c) => c.tipo === "DIRECTO" && !c.archivada)
  const grupos = visibles.filter((c) => c.tipo === "GRUPO" && !c.archivada)
  // En el chat los CANAL se llaman "Foros".
  const foros = visibles.filter((c) => c.tipo === "CANAL" && !c.archivada)
  const archivadas = visibles.filter((c) => c.archivada)

  const item = (c: Conversacion) => (
    <ItemConversacion
      key={c.id}
      conversacion={c}
      activa={c.id === activaId}
      onClick={() => {
        if (t) recordar()
        onSeleccionar(c.id)
      }}
      onSalida={() => onSeleccionar(undefined)}
    />
  )

  return (
    <aside className={cn("flex min-h-0 flex-col border-r bg-chat-panel", className)}>
      <div className="relative flex h-16 shrink-0 items-center gap-2 border-b px-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-card px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <MagnifyingGlassIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
          <span className="sr-only">Buscar conversaciones</span>
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={() => setEnfocado(true)}
            onBlur={() => setEnfocado(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setTexto("")
              if (e.key === "Enter") recordar()
            }}
            placeholder="Buscar conversaciones, personas y mensajes"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {texto && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={() => setTexto("")}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </label>
        <FiltrosChatPopover filtros={filtros} onFiltros={aplicarFiltros} />
        <FavoritosFiltrosPopover filtros={filtros} onFiltros={aplicarFiltros} />
        {verRecientes && (
          <div className="absolute inset-x-3 top-full z-30 -mt-2 overflow-hidden rounded-lg border bg-popover py-2 text-popover-foreground shadow-md">
            <p className="px-4 pb-1 text-xs text-muted-foreground">Búsquedas recientes</p>
            <ul aria-label="Búsquedas recientes">
              {recientes.map((r) => (
                <li key={r}>
                  <button
                    type="button"
                    // Sin esto el blur del input cierra la lista antes del clic.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setTexto(r)}
                    className="flex h-9 w-full items-center gap-3 px-4 text-left text-sm hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <ClockCounterClockwiseIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {conPanel && (
        <div role="status" className="flex items-center gap-2 border-b bg-primary/5 px-3 py-1.5 text-xs">
          <span className="min-w-0 flex-1 truncate" title={resumenFiltros}>
            Filtrando: {resumenFiltros}
          </span>
          <button
            type="button"
            onClick={() => aplicarFiltros({ ...FILTROS_VACIOS, q: texto })}
            className="shrink-0 font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Quitar filtros
          </button>
        </div>
      )}
      <nav aria-label="Conversaciones" className="min-h-0 flex-1 overflow-y-auto py-2">
          <InvitacionesSeccion destacada={invitacionDestacada} onAceptada={onSeleccionar} />
          {/* Archivados arriba, con contador y desarchivar por fila (diseño 4742:72681). */}
          {archivadas.length > 0 && (
            <Seccion
              titulo="Archivados"
              icono={ArchiveIcon}
              contador={archivadas.length}
              inicialAbierta={false}
            >
              {archivadas.map((c) => (
                <ItemConversacion
                  key={c.id}
                  conversacion={c}
                  activa={c.id === activaId}
                  onClick={() => onSeleccionar(c.id)}
                  onSalida={() => onSeleccionar(undefined)}
                  desarchivar
                />
              ))}
            </Seccion>
          )}
          <ul className="border-b px-2 pb-2">
            <AccesoVista
              icono={PaperPlaneTiltIcon}
              activo={vista === "borradores"}
              onClick={() => onVista("borradores")}
              proximamente={!CHAT_FUNCIONES.borradores}
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
              proximamente={!CHAT_FUNCIONES.archivos}
            >
              Archivos
            </AccesoVista>
          </ul>

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
        ) : t && !buscando && visibles.length === 0 && personas.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {personasQuery.isFetching ? "Buscando…" : `Ninguna conversación o persona coincide con “${texto.trim()}”.`}
          </p>
        ) : (
          <>
            {buscando && (
              <Seccion titulo="Mensajes" icono={MagnifyingGlassIcon}>
                <ResultadosBusqueda
                  mensajes={resultados}
                  termino={filtrosEfectivos(filtros).q}
                  cargando={busqueda.isPending || (busqueda.isPlaceholderData && resultados.length === 0)}
                  error={busqueda.isError}
                  hayMas={!!busqueda.hasNextPage}
                  cargandoMas={busqueda.isFetchingNextPage}
                  onMas={() => void busqueda.fetchNextPage()}
                  onReintentar={() => void busqueda.refetch()}
                  onAbrir={(m) => {
                    if (t) recordar()
                    if (onAbrirMensaje) onAbrirMensaje(m.conversacionId, m.id)
                    else onSeleccionar(m.conversacionId)
                  }}
                />
              </Seccion>
            )}
            {personas.length > 0 && (
              <Seccion titulo="Personas">
                {personas.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={abrirDirecto.isPending}
                      onClick={() =>
                        abrirDirecto.mutate(p.id, {
                          onSuccess: (c) => {
                            recordar()
                            setTexto("")
                            onSeleccionar(c.id)
                          },
                          onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
                        })
                      }
                      className="flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <UserIcon aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                    </button>
                  </li>
                ))}
              </Seccion>
            )}
            <Seccion
              titulo="Mensajes directos"
              accion={puedeGestionar && <AgregarCompanero onCreado={onSeleccionar} />}
            >
              {directos.map(item)}
            </Seccion>
            <Seccion
              titulo="Grupos"
              accion={
                puedeGestionar && (
                  <button
                    type="button"
                    onClick={() => setCrearGrupo(true)}
                    aria-label="Crear grupo"
                    title="Crear grupo"
                    className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <PlusIcon className="size-5" />
                  </button>
                )
              }
            >
              {grupos.map(item)}
            </Seccion>
            <Seccion
              titulo="Foros"
              accion={puedeGestionar && <AgregarCanal onCreado={onSeleccionar} />}
            >
              {foros.map(item)}
            </Seccion>
          </>
        )}
      </nav>
      <CrearChatDialog tipo="GRUPO" open={crearGrupo} onClose={() => setCrearGrupo(false)} onCreado={onSeleccionar} />
    </aside>
  )
}

function AccesoVista({
  icono: Icono,
  activo,
  onClick,
  extra,
  proximamente,
  children,
}: {
  icono: Icon
  activo: boolean
  onClick: () => void
  extra?: ReactNode
  // La función aún no existe en el backend real: se ve pero no se abre.
  proximamente?: boolean
  children: ReactNode
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={proximamente}
        title={proximamente ? `${PROXIMAMENTE}: aún no disponible` : undefined}
        aria-current={activo ? "page" : undefined}
        className={cn(
          "flex h-9 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
          activo ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted/50",
          proximamente && "cursor-not-allowed opacity-60 hover:bg-transparent",
        )}
      >
        <Icono aria-hidden className={cn("size-5 shrink-0", !activo && "text-muted-foreground")} />
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {proximamente ? <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground normal-case">{PROXIMAMENTE}</span> : extra}
      </button>
    </li>
  )
}

function Seccion({
  titulo,
  accion,
  icono: Icono,
  contador,
  inicialAbierta = true,
  children,
}: {
  titulo: string
  icono?: Icon
  contador?: number
  // Control junto al título ("+" de Canales): a mano aunque la lista sea larga.
  accion?: ReactNode
  inicialAbierta?: boolean
  children: ReactNode
}) {
  const [abierta, setAbierta] = useState(inicialAbierta)
  return (
    <section className="border-b px-2 py-2 last:border-b-0">
      <h3 className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={abierta}
          onClick={() => setAbierta((v) => !v)}
          className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <CaretDownFillIcon
            aria-hidden
            className={cn("size-5 transition-transform", !abierta && "-rotate-90")}
          />
          {Icono && <Icono aria-hidden className="size-5" />}
          <span className="flex-1 text-left">{titulo}</span>
          {contador != null && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full border px-1.5 text-xs font-medium tabular-nums">
              {contador}
            </span>
          )}
        </button>
        {accion}
      </h3>
      {abierta && (
        <ul className="space-y-0.5">
          {children}
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
  desarchivar = false,
}: {
  conversacion: Conversacion
  activa: boolean
  onClick: () => void
  onSalida: () => void
  // Fila de "Archivados": botón para devolverla a su sección.
  desarchivar?: boolean
}) {
  const archivar = useArchivarConversacion()
  const { notify } = useNotify()
  const Icono = c.tipo === "GRUPO" ? UsersThreeIcon : ICONO_CATEGORIA[c.categoria]
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
          "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:outline-none",
          c.ultimoMensaje ? "min-h-12 py-1.5" : "h-9",
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
        ) : c.tipo === "DIRECTO" ? (
          // Mensaje directo: iniciales de la persona (diseño 4516:68095).
          <span
            aria-hidden
            className="grid size-5 shrink-0 place-items-center rounded-full bg-navy-22 text-[9px] font-semibold text-navy"
          >
            {iniciales(c.nombre)}
          </span>
        ) : (
          <Icono
            aria-hidden
            className={cn("size-5 shrink-0", activa ? "opacity-100" : "text-muted-foreground")}
          />
        )}
        {c.ultimoMensaje ? (
          // Vista previa del último mensaje y su hora (diseño 4516:68095).
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
              <time
                dateTime={c.ultimoMensaje.enviadoEn}
                className={cn(
                  "shrink-0 text-[11px] font-normal",
                  activa ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {horaVistaPrevia(c.ultimoMensaje.enviadoEn)}
              </time>
            </span>
            <span
              className={cn(
                "truncate text-xs",
                activa ? "text-primary-foreground/80" : conPendientes ? "text-foreground" : "text-muted-foreground",
                !conPendientes && "font-normal",
              )}
            >
              {lineaVistaPrevia(c)}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
        )}
        {c.importante && (
          // Comunicado marcado como importante por quien lo publicó.
          <WarningCircleIcon
            aria-label="Importante"
            role="img"
            className={cn("size-4 shrink-0", activa ? "opacity-100" : "text-red")}
          />
        )}
        {c.silenciadoHasta && (
          <BellSlashIcon aria-label="Silenciado" className="size-4 shrink-0 opacity-60" />
        )}
        {/* Menciones y reacciones quedan fuera de la UI (card de diseño); solo el contador de no leídos. */}
        {/* Mensaje directo sin leer: badge naranja lleno (diseño 4456:65817); foros y grupos, contador. */}
        {conPendientes && (
          <span
            className={cn(
              "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-medium",
              c.tipo === "DIRECTO" ? "bg-orange text-orange-foreground" : "border",
            )}
          >
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

      {desarchivar && (
        <button
          type="button"
          aria-label={`Desarchivar ${c.nombre}`}
          title="Desarchivar"
          disabled={archivar.isPending}
          onClick={() =>
            archivar.mutate(
              { id: c.id, archivar: false },
              {
                onSuccess: () => notify(`${c.nombre} salió de Archivados.`),
                onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
              },
            )
          }
          className="mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <UnarchiveIcon className="size-4.5" />
        </button>
      )}
      {/* Acciones al pasar el mouse o con foco de teclado (no al hacer clic: la fila elegida solo
          muestra el nombre, como en el diseño); tapan los indicadores de la derecha. */}
      {!desarchivar && (
      <ConversacionAcciones
        conversacion={c}
        variante="fila"
        activa={activa}
        onSalida={onSalida}
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 rounded-r-lg pr-1 pl-2 opacity-0 transition-opacity group-hover/fila:pointer-events-auto group-hover/fila:opacity-100 group-has-[:focus-visible]/fila:pointer-events-auto group-has-[:focus-visible]/fila:opacity-100 has-data-popup-open:pointer-events-auto has-data-popup-open:opacity-100",
          // Mismo tono que la fila (muted/50) pero opaco, para tapar los indicadores.
          activa ? "bg-primary" : "bg-chat-panel bg-linear-to-r from-muted/50 to-muted/50",
        )}
      />
      )}
    </li>
  )
}
