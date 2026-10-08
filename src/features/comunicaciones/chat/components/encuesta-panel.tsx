import { format } from "date-fns"

import { Skeleton } from "@/components/ui/skeleton"
import { CalendarBlankIcon, CheckCircleFillIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import type { Encuesta, PreguntaEncuesta } from "@/features/comunicaciones/chat/api/types"
import { estadoEleccion, porcentaje } from "@/features/comunicaciones/chat/lib/eleccion"
import { resumenEncuesta } from "@/features/comunicaciones/chat/lib/encuesta"

const COLORES = ["bg-blue", "bg-orange", "bg-green", "bg-purple", "bg-red", "bg-yellow"]

const ETIQUETA_ESTADO = { PROGRAMADA: "Programada", ACTIVA: "Activa", FINALIZADA: "Finalizada" }

export function EncuestaEstado({ encuesta: e }: { encuesta: Encuesta }) {
  const estado = estadoEleccion(e)
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b px-3 py-2 text-xs text-muted-foreground md:px-5">
      <span className="flex items-center gap-1">
        {estado === "ACTIVA" && <CheckCircleFillIcon aria-hidden className="size-4 text-green" />}
        Estado: {ETIQUETA_ESTADO[estado]}
      </span>
      {e.fechaCierre && (
        <span className="flex items-center gap-1">
          <CalendarBlankIcon aria-hidden className="size-4" />
          Fecha cierre: {format(new Date(e.fechaCierre), "dd/MM/yyyy")}
        </span>
      )}
      <span>Total participantes: {e.participantes}</span>
    </div>
  )
}

export function EncuestaResultados({
  encuesta: e,
  isPending,
}: {
  encuesta: Encuesta | null | undefined
  isPending: boolean
}) {
  if (isPending) return <Skeleton className="mb-4 h-64 w-full" />
  if (!e) return null

  // Con resultados privados solo quien la creó los ve.
  if (e.resultados === "ADMIN" && !e.esCreador) {
    return (
      <p className="mb-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Los resultados de esta encuesta solo los ve quien la creó.
      </p>
    )
  }

  const r = resumenEncuesta(e)

  return (
    <section aria-label={`Resultados de ${e.nombre}`} className="mb-4 rounded-xl border bg-card p-3 md:p-4">
      <dl className="mb-5 grid gap-3 sm:grid-cols-3">
        <Indicador etiqueta="Participación" valor={`${r.participacion}%`} />
        <Indicador etiqueta="Respuesta más seleccionada" valor={r.respuestaTop ?? "—"} />
        <Indicador
          etiqueta="Pregunta con más respuestas"
          valor={r.preguntaTop == null ? "—" : `Pregunta ${r.preguntaTop + 1}`}
        />
      </dl>
      {e.participantes === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Aún nadie responde. Los resultados aparecen aquí a medida que lleguen las respuestas.
        </p>
      ) : (
        <ol className="space-y-5">
          {e.preguntas.map((p, i) => (
            <li key={p.id}>
              <ResultadoPregunta numero={i + 1} pregunta={p} />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border px-3 py-2 text-center shadow-xs">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="truncate text-lg font-bold text-foreground/70">{valor}</dd>
    </div>
  )
}

function ResultadoPregunta({ numero, pregunta: p }: { numero: number; pregunta: PreguntaEncuesta }) {
  return (
    <article>
      <h4 className="mb-1.5 font-medium">
        {numero}. {p.texto}
      </h4>
      {p.tipo === "REDACCION" ? (
        <div className="text-sm">
          <p className="mb-1 text-muted-foreground">
            Respuestas destacadas ({p.totalRespuestas} en total):
          </p>
          {p.respuestas.length > 0 ? (
            <ul className="space-y-0.5">
              {p.respuestas.map((t) => (
                <li key={t}>“{t}”</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Sin respuestas todavía.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-1 text-sm">
          {p.opciones.map((o, j) => {
            const pct = porcentaje(o.votos, p.totalRespuestas)
            return (
              <li
                key={o.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(8rem,13rem)_1fr_auto]"
              >
                <span className="truncate">{o.texto}</span>
                <div
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${o.texto}: ${pct}%`}
                  className="order-last col-span-2 h-3 max-w-72 overflow-hidden rounded-sm bg-[repeating-linear-gradient(135deg,var(--muted)_0_2px,transparent_2px_5px)] sm:order-none sm:col-span-1"
                >
                  <div
                    className={cn(
                      "h-full rounded-sm transition-[width] duration-500 motion-reduce:transition-none",
                      COLORES[j % COLORES.length],
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {pct}% ({o.votos})
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
