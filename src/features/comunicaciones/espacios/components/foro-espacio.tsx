import { format } from "date-fns"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import {
  useAccionesTema,
  useCrearTema,
  useResponderTema,
  useTemaQuery,
  useTemasQuery,
  type Tema,
} from "@/features/comunicaciones/espacios/api/query/use-foro-equipos-query"
import type { EspacioDetalle } from "@/features/comunicaciones/espacios/api/types"
import { ComposerEspacio } from "@/features/comunicaciones/espacios/components/composer-espacio"
import { ParticipacionItem } from "@/features/comunicaciones/espacios/components/participacion-item"

function TemaAbierto({
  detalle,
  tema,
  equipo,
  puedeEscribir,
}: {
  detalle: EspacioDetalle
  tema: Tema
  equipo: number | null
  puedeEscribir: boolean
}) {
  const id = detalle.espacio.id
  const { notify } = useNotify()
  const { data, isPending } = useTemaQuery(id, tema.id)
  const responder = useResponderTema(id, tema.id)
  const { solucion } = useAccionesTema(id, tema.id)
  const fallar = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })
  const esDocente = detalle.espacio.rol === "PROPIETARIO"

  if (isPending || !data) return <Skeleton className="ml-4 h-20" />
  return (
    <div className="space-y-2 border-l-2 pl-3">
      {data.respuestas.map((r) => (
        <ParticipacionItem
          key={r.id}
          espacio={detalle}
          p={r}
          esDocente={esDocente}
          etiqueta={data.tema.solucionId === r.id ? "Solución" : undefined}
          extra={
            detalle.puedeAdministrar && !r.oculta && !r.retirada
              ? [
                  data.tema.solucionId === r.id
                    ? { label: "Reabrir pregunta", onClick: () => solucion.mutate(null, { onError: fallar }) }
                    : { label: "Marcar como solución", onClick: () => solucion.mutate(r.id, { onError: fallar }) },
                ]
              : undefined
          }
        />
      ))}
      {puedeEscribir && (
        <ComposerEspacio
          espacioId={id}
          equipo={equipo}
          etiqueta="Escriba su respuesta"
          textoBoton="Responder"
          pendiente={responder.isPending}
          onEnviar={(datos, listo) => responder.mutate(datos, { onSuccess: listo, onError: fallar })}
        />
      )}
    </div>
  )
}

function FilaTema({
  detalle,
  tema,
  equipo,
  puedeEscribir,
}: {
  detalle: EspacioDetalle
  tema: Tema
  equipo: number | null
  puedeEscribir: boolean
}) {
  const { notify } = useNotify()
  const [abierto, setAbierto] = useState(false)
  const { seguir } = useAccionesTema(detalle.espacio.id, tema.id)
  const esSupervision = detalle.espacio.rol === "SUPERVISOR"

  return (
    <li className="space-y-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={abierto}
          className="min-w-0 text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? "▾" : "▸"} Tema: {tema.titulo}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({tema.respuestas} {tema.respuestas === 1 ? "respuesta" : "respuestas"})
          </span>
        </button>
        <span className="flex items-center gap-2">
          {tema.solucionId && (
            <Badge variant="soft" color="success">
              Resuelta
            </Badge>
          )}
          {!esSupervision && (
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              disabled={seguir.isPending}
              onClick={() =>
                seguir.mutate(!tema.siguiendo, {
                  onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                })
              }
            >
              {tema.siguiendo ? "Dejar de seguir" : "Seguir"}
            </Button>
          )}
        </span>
      </div>
      <ParticipacionItem
        espacio={detalle}
        p={tema.apertura}
        esDocente={detalle.espacio.rol === "PROPIETARIO"}
      />
      {abierto && <TemaAbierto detalle={detalle} tema={tema} equipo={equipo} puedeEscribir={puedeEscribir} />}
    </li>
  )
}

/** Foro del espacio o de un equipo: el docente abre temas y los estudiantes responden en un nivel (Sección 5.2). */
export function ForoEspacio({
  detalle,
  equipo = null,
  puedeEscribir,
}: {
  detalle: EspacioDetalle
  equipo?: number | null
  puedeEscribir: boolean
}) {
  const id = detalle.espacio.id
  const { notify } = useNotify()
  const { data: temas = [], isPending, isError } = useTemasQuery(id, equipo)
  const crear = useCrearTema(id, equipo)
  const [nuevo, setNuevo] = useState(false)
  const [titulo, setTitulo] = useState("")
  const puedeAbrir = detalle.puedeAdministrar && puedeEscribir

  if (isPending) return <Skeleton className="h-40 w-full" />
  if (isError) return <p className="text-sm text-red">No se pudo cargar el foro.</p>

  // Franja "Fijado" del foro (M.3.CHA.3): planteamientos de tema fijados por el docente.
  const fijados = temas.map((t) => t.apertura).filter((a) => a.fijada && !a.oculta && !a.retirada)

  return (
    <div className="space-y-3">
      {fijados.length > 0 && (
        <section aria-label="Mensajes fijados" className="space-y-1 rounded-md bg-blue-22 p-2 text-sm">
          {fijados.map((m) => (
            <a key={m.id} href={`#participacion-${m.id}`} className="block underline-offset-2 hover:underline">
              <span className="font-medium">Fijado:</span> {m.texto || "Adjunto"}{" "}
              <span className="text-muted-foreground">
                — {m.autor} · {format(new Date(m.fecha), "dd/MM")}
              </span>
            </a>
          ))}
        </section>
      )}
      {puedeAbrir && !nuevo && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setNuevo(true)}>
            Nuevo tema
          </Button>
        </div>
      )}
      {nuevo && (
        <div className="space-y-2 rounded-md border p-3">
          <Input
            aria-label="Título del tema"
            placeholder="Título del tema"
            maxLength={200}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <ComposerEspacio
            espacioId={id}
            equipo={equipo}
            etiqueta="Escriba el planteamiento del tema"
            textoBoton="Publicar tema"
            pendiente={crear.isPending}
            onEnviar={(datos, listo) => {
              if (!titulo.trim()) {
                notify("El tema necesita un título.", { variant: "error" })
                return
              }
              crear.mutate(
                { titulo: titulo.trim(), ...datos },
                {
                  onSuccess: () => {
                    listo()
                    setTitulo("")
                    setNuevo(false)
                  },
                  onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
                },
              )
            }}
          />
          <Button variant="ghost" color="neutral" size="sm" onClick={() => setNuevo(false)}>
            Cancelar
          </Button>
        </div>
      )}
      {temas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay temas.</p>
      ) : (
        <ul className="space-y-2">
          {temas.map((t) => (
            <FilaTema key={t.id} detalle={detalle} tema={t} equipo={equipo} puedeEscribir={puedeEscribir} />
          ))}
        </ul>
      )}
    </div>
  )
}
