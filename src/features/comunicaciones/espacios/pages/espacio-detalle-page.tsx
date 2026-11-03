import { getRouteApi, Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useSilenciar } from "@/features/comunicaciones/espacios/api/mutations/use-acciones-espacio"
import { useEspacioQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import type { EspacioDetalle, HerramientaEspacio } from "@/features/comunicaciones/espacios/api/types"
import { ChatEspacio } from "@/features/comunicaciones/espacios/components/chat-espacio"
import { MaterialesEspacio } from "@/features/comunicaciones/espacios/components/materiales-espacio"
import { BadgeEstadoEspacio, fechaDia } from "@/features/comunicaciones/espacios/components/ui-espacio"

const route = getRouteApi("/app/comunicaciones/espacios/detalle/$id")

const ETIQUETA: Partial<Record<HerramientaEspacio, string>> = {
  CHAT: "Chat",
  ENCUESTAS: "Encuestas",
}
const ORDEN: HerramientaEspacio[] = ["CHAT", "ENCUESTAS"]

/** Tira de silenciados sobre el contenido (M.3.MOD.3): reactivar solo el docente. */
function TiraSilenciados({ detalle }: { detalle: EspacioDetalle }) {
  const { notify } = useNotify()
  const { reactivar } = useSilenciar(detalle.espacio.id)
  if (detalle.silenciados.length === 0) return null
  return (
    <ul aria-label="Estudiantes silenciados" className="flex flex-wrap gap-2 rounded-md bg-yellow-22 p-2 text-sm">
      {detalle.silenciados.map((s) => (
        <li key={s.usuarioId} className="flex items-center gap-2">
          {s.nombre}
          <Badge variant="soft" color="warning">
            Silenciado
          </Badge>
          {detalle.espacio.rol === "PROPIETARIO" && (
            <Button
              variant="link"
              size="sm"
              onClick={() =>
                reactivar.mutate(s.usuarioId, {
                  onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                })
              }
            >
              Reactivar
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

function Contenido({ id }: { id: number }) {
  const { data: detalle, isPending, isError } = useEspacioQuery(id)

  if (isPending) return <Skeleton className="m-4 h-64" />
  if (isError || !detalle) {
    return (
      <p className="p-6 text-sm">
        No tiene acceso a este espacio o ya no existe.{" "}
        <Link className="underline" to={paths.app.comunicacionesEspacios.getHref()}>
          Volver a Espacios académicos
        </Link>
      </p>
    )
  }

  const { espacio, herramientas, conContenido } = detalle
  // Una herramienta deshabilitada con historial se sigue consultando (Sección 5.1).
  const visibles = ORDEN.filter((h) => herramientas.includes(h) || conContenido.includes(h))
  const supervision = espacio.rol === "SUPERVISOR"

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3 p-4">
      <header className="rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{espacio.actividad}</h1>
          <span className="flex gap-2">
            {supervision && (
              <Badge variant="soft" color="info">
                Solo lectura · Supervisión
              </Badge>
            )}
            <BadgeEstadoEspacio estado={espacio.estado} />
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {[espacio.asignatura, espacio.grupo, espacio.docente].filter(Boolean).join(" · ")} ·{" "}
          {fechaDia(espacio.fechaInicio)} a {fechaDia(espacio.fechaCierre)}
        </p>
        {detalle.silenciado && (
          <p className="mt-1 text-sm text-red">El docente lo silenció en este espacio: puede consultar, pero no escribir.</p>
        )}
      </header>
      <NoticeOutlet />
      <TiraSilenciados detalle={detalle} />
      <Tabs defaultValue={visibles[0] ?? "MATERIALES"}>
        <TabsList>
          {visibles.map((h) => (
            <TabsTrigger key={h} value={h}>
              {ETIQUETA[h]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="MATERIALES">Materiales</TabsTrigger>
        </TabsList>
        {visibles.includes("CHAT") && (
          <TabsContent value="CHAT" className="pt-3">
            <ChatEspacio detalle={detalle} puedeEscribir={detalle.puedeEscribir && herramientas.includes("CHAT")} />
          </TabsContent>
        )}
        {visibles.includes("ENCUESTAS") && (
          <TabsContent value="ENCUESTAS" className="space-y-2 pt-3 text-sm">
            <p>Las encuestas se crean y responden desde Comunicaciones.</p>
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              nativeButton={false}
              render={<Link to={paths.app.comunicacionesChat.getHref()} />}
            >
              Ir a Comunicaciones
            </Button>
          </TabsContent>
        )}
        <TabsContent value="MATERIALES" className="pt-3">
          <MaterialesEspacio espacioId={id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function EspacioDetallePage() {
  const { id } = route.useParams()
  return (
    <NoticeProvider>
      <Contenido key={id} id={Number(id)} />
    </NoticeProvider>
  )
}
