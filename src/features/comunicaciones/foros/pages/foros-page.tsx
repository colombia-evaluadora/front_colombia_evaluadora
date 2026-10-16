import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ChatCircleTextIcon, PlusIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { OnlineOnlyTooltip } from "@/components/offline/online-only-tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { cn } from "@/lib/utils"
import { forosRoute } from "@/router"
import { useMiembrosQuery } from "@/features/comunicaciones/chat/api/query/use-miembros-query"
import { useChatAccess } from "@/features/comunicaciones/chat/api/use-chat-access"
import { useChatTiempoRealUsuario } from "@/features/comunicaciones/chat/api/use-chat-tiempo-real"
import { CrearChatDialog } from "@/features/comunicaciones/chat/components/crear-chat-dialog"
import { useForoQuery, useForosQuery } from "@/features/comunicaciones/foros/api/query/use-foros-query"
import type { OrdenForo } from "@/features/comunicaciones/foros/api/types"
import { useForoTiempoReal } from "@/features/comunicaciones/foros/api/use-foro-tiempo-real"
import { CrearPublicacionDialog } from "@/features/comunicaciones/foros/components/crear-publicacion-dialog"
import { EtiquetasDialog } from "@/features/comunicaciones/foros/components/etiquetas-dialog"
import { PublicacionDetalle } from "@/features/comunicaciones/foros/components/publicacion-detalle"
import { PublicacionesPanel } from "@/features/comunicaciones/foros/components/publicaciones-panel"

export function ForosPage() {
  return (
    <NoticeProvider>
      <ForosContent />
    </NoticeProvider>
  )
}

function ForosContent() {
  const search = forosRoute.useSearch()
  const navigate = forosRoute.useNavigate()
  const { notify } = useNotify()
  const so = useOnlineOnly()
  const { puedeGestionar, puedeMencionarMasivo } = useChatAccess()
  const [creandoForo, setCreandoForo] = useState(false)
  const [publicando, setPublicando] = useState(false)
  const [gestionandoEtiquetas, setGestionandoEtiquetas] = useState(false)

  const forosQuery = useForosQuery()
  const foros = forosQuery.data ?? []
  const foroId = search.foro
  const foroQuery = useForoQuery(foroId)
  const foro = foroQuery.data
  const miembros = useMiembrosQuery(foroId).data ?? []
  const orden: OrdenForo = search.orden ?? "ACTIVIDAD"

  useChatTiempoRealUsuario()
  useForoTiempoReal(foroId)

  const ir = (cambios: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...cambios }), replace: true })
  const abrirForo = (id: number) =>
    navigate({ search: { foro: id } })
  const abrirPublicacion = (id: number) => navigate({ search: (prev) => ({ ...prev, publicacion: id, mensaje: undefined }) })
  const volver = () => navigate({ search: (prev) => ({ ...prev, publicacion: undefined, mensaje: undefined }) })

  return (
    <div className="flex h-[calc(100dvh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex h-16 shrink-0 items-center border-b bg-chat-panel px-5">
        <h1 className="text-2xl font-bold">Foros</h1>
      </div>
      <NoticeOutlet className="mx-4 my-3 md:mx-5" />

      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Foros"
          className={cn("flex w-full flex-col border-r bg-chat-panel md:w-72 md:shrink-0", foroId && "max-md:hidden")}
        >
          <div className="flex items-center justify-between gap-2 p-3">
            <span className="text-sm font-semibold text-muted-foreground">Tus foros</span>
            {puedeGestionar && (
              <OnlineOnlyTooltip tooltip={so.tooltip}>
                <Button size="icon-xs" variant="ghost" aria-label="Crear un foro" disabled={so.disabled} onClick={() => setCreandoForo(true)}>
                  <PlusIcon />
                </Button>
              </OnlineOnlyTooltip>
            )}
          </div>
          <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            {forosQuery.isPending && <li className="px-3 py-2 text-sm text-muted-foreground">Cargando…</li>}
            {forosQuery.isError && !forosQuery.data && (
              <li role="alert" className="px-3 py-2 text-sm text-red">
                {getErrorMessage(forosQuery.error)}
              </li>
            )}
            {!forosQuery.isPending && foros.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {puedeGestionar ? "Aún no hay foros. Crea el primero con +." : "Todavía no te han sumado a ningún foro."}
              </li>
            )}
            {foros.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  aria-current={f.id === foroId ? "page" : undefined}
                  onClick={() => abrirForo(f.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none aria-[current=page]:bg-primary/10 aria-[current=page]:font-semibold aria-[current=page]:text-primary"
                >
                  <ChatCircleTextIcon aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{f.nombre}</span>
                  {f.menciones ? (
                    <span className="rounded-full bg-red px-1.5 text-xs font-semibold text-white tabular-nums">
                      @{f.menciones}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className={cn("flex min-w-0 flex-1 flex-col", !foroId && "max-md:hidden")}>
          {!foroId ? (
            <div className="m-auto max-w-sm p-6 text-center text-sm text-muted-foreground">
              <ChatCircleTextIcon aria-hidden className="mx-auto mb-3 size-10" />
              Elige un foro para ver sus publicaciones: preguntas, dudas por tarea y temas con respuestas en hilo.
            </div>
          ) : foroQuery.isPending ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando el foro…</p>
          ) : !foro ? (
            <div className="space-y-3 p-6">
              <p role="alert" className="text-sm text-red">
                {foroQuery.isError ? getErrorMessage(foroQuery.error) : "El foro no existe."}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate({ search: {} })}>
                Volver a los foros
              </Button>
            </div>
          ) : search.publicacion ? (
            <PublicacionDetalle
              key={search.publicacion}
              publicacionId={search.publicacion}
              foro={foro}
              miembros={miembros}
              permitirMasivas={puedeMencionarMasivo}
              mensajeDestacado={search.mensaje}
              onVolver={volver}
            />
          ) : (
            <PublicacionesPanel
              key={foro.id}
              foro={foro}
              orden={orden}
              etiqueta={search.etiqueta}
              q={search.q}
              onFiltros={(c) => ir(c)}
              onAbrir={abrirPublicacion}
              onNueva={() => setPublicando(true)}
              onEtiquetas={() => setGestionandoEtiquetas(true)}
            />
          )}
        </main>
      </div>

      <CrearChatDialog
        tipo="FORO"
        open={creandoForo}
        onClose={() => setCreandoForo(false)}
        onCreado={(id) => abrirForo(id)}
      />
      {foro && (
        <>
          <CrearPublicacionDialog
            foro={foro}
            miembros={miembros}
            permitirMasivas={puedeMencionarMasivo}
            open={publicando}
            onClose={() => setPublicando(false)}
            onCreada={(p) => {
              setPublicando(false)
              notify("Se publicó en el foro.")
              abrirPublicacion(p.id)
            }}
          />
          <EtiquetasDialog
            foro={foro}
            open={gestionandoEtiquetas}
            onClose={() => setGestionandoEtiquetas(false)}
            disabled={so.disabled}
          />
        </>
      )}
    </div>
  )
}
