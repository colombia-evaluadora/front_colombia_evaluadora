import { useState } from "react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarBlankIcon,
  CaretDownFillIcon,
  CaretUpFillIcon,
  CheckCircleFillIcon,
  CheckIcon,
  CheckSquareIcon,
  ClockIcon,
  XIcon,
} from "@/components/ui/icons"
import { Pagination } from "@/components/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TableSortableHeader,
  sortBySortKey,
  type TableSort,
} from "@/components/table-sort-header"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { toDigitsOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"
import type {
  EntregaEvaluacion,
  Evaluacion,
  PreguntaEvaluacion,
  RespuestaEntrega,
} from "@/features/comunicaciones/chat/api/types"
import { useEntregasQuery } from "@/features/comunicaciones/chat/api/query/use-evaluacion-query"
import { useCalificarEntrega } from "@/features/comunicaciones/chat/api/mutations/use-acciones-evaluacion"
import { estadoEleccion } from "@/features/comunicaciones/chat/lib/eleccion"
import {
  aprobo,
  esAutomatica,
  esCorrecta,
  formatoIntentos,
  formatoTiempo,
  notaEntrega,
} from "@/features/comunicaciones/chat/lib/evaluacion"

const ETIQUETA_ESTADO = { PROGRAMADA: "Programada", ACTIVA: "Activa", FINALIZADA: "Finalizada" }

export function EvaluacionEstado({ evaluacion: e }: { evaluacion: Evaluacion }) {
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
      <span className="flex items-center gap-1">
        <ClockIcon aria-hidden className="size-4" />
        {formatoTiempo(e.tiempoLimiteMin)}
      </span>
      <span>Puntaje total: {e.puntajeTotal}</span>
      <span>Intentos permitidos: {formatoIntentos(e.intentos)}</span>
    </div>
  )
}

type ClaveOrden = "estudiante" | "estado"

// Entregas de los estudiantes; el docente abre cada una para calificarla.
export function EvaluacionEntregas({
  evaluacion: e,
  isPending,
}: {
  evaluacion: Evaluacion | null | undefined
  isPending: boolean
}) {
  const entregas = useEntregasQuery(e?.conversacionId)
  const [orden, setOrden] = useState<TableSort<ClaveOrden>>(null)
  const [pagina, setPagina] = useState(0)
  const [tamano, setTamano] = useState(10)
  const [abierta, setAbierta] = useState<EntregaEvaluacion | null>(null)

  if (isPending || entregas.isPending) return <Skeleton className="mb-4 h-64 w-full" />
  if (!e) return null
  if (!e.esCreador) return null

  if (entregas.isError) {
    return (
      <p className="mb-4 rounded-xl border px-4 py-6 text-center text-sm text-muted-foreground">
        No se pudieron cargar las entregas.{" "}
        <button type="button" onClick={() => void entregas.refetch()} className="font-medium text-primary underline">
          Reintentar
        </button>
      </p>
    )
  }

  const filas = sortBySortKey(entregas.data ?? [], orden)
  const total = filas.length
  const paginas = Math.max(1, Math.ceil(total / tamano))
  const visibles = filas.slice(pagina * tamano, (pagina + 1) * tamano)

  return (
    <section aria-label={`Entregas de ${e.nombre}`} className="mb-4 overflow-hidden rounded-xl border bg-card">
      {total === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          Aún no hay entregas. Aparecen aquí cuando los estudiantes envían la evaluación.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <TableSortableHeader title="Nombre" sortKey="estudiante" sort={orden} onSortChange={setOrden} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <TableSortableHeader title="Estado" sortKey="estado" sort={orden} onSortChange={setOrden} />
                  </th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Nota y calificar</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((en) => {
                  const nota = notaEntrega(e, en)
                  const ok = aprobo(nota, e.puntajeTotal)
                  const Flecha = ok ? CaretUpFillIcon : CaretDownFillIcon
                  return (
                    <tr key={en.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{en.estudiante}</td>
                      <td className="px-4 py-3">
                        {en.estado === "PENDIENTE" ? (
                          <Badge variant="soft" color="orange">
                            Pendiente por calificar
                          </Badge>
                        ) : (
                          <Badge variant="soft" color="success">
                            Calificada
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <span
                            className={cn("flex items-center tabular-nums", ok ? "text-green" : "text-red")}
                            title={en.estado === "PENDIENTE" ? "Nota parcial: falta calificar la redacción" : undefined}
                          >
                            <Flecha aria-hidden className="size-5" />
                            {nota}
                            <span className="sr-only">
                              {" "}de {e.puntajeTotal}, {ok ? "aprobado" : "no aprobado"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setAbierta(en)}
                            aria-label={`Calificar a ${en.estudiante}`}
                            title="Calificar"
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                          >
                            <CheckSquareIcon className="size-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t px-2">
            <Pagination
              pageIndex={pagina}
              pageCount={paginas}
              canPrev={pagina > 0}
              canNext={pagina < paginas - 1}
              totalCount={total}
              pageSize={tamano}
              onPageChange={setPagina}
              onPageSizeChange={(t) => {
                setTamano(t)
                setPagina(0)
              }}
            />
          </div>
        </>
      )}

      {abierta && (
        <CalificarDialog
          key={abierta.id}
          evaluacion={e}
          entrega={abierta}
          onClose={() => setAbierta(null)}
        />
      )}
    </section>
  )
}

function CalificarDialog({
  evaluacion: e,
  entrega,
  onClose,
}: {
  evaluacion: Evaluacion
  entrega: EntregaEvaluacion
  onClose: () => void
}) {
  const { notify } = useNotify()
  const calificar = useCalificarEntrega(e.conversacionId)
  const respuestas = new Map(entrega.respuestas.map((r) => [r.preguntaId, r]))
  const abiertas = e.preguntas.filter((p) => !esAutomatica(p))
  const [puntos, setPuntos] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      abiertas.map((p) => [p.id, respuestas.get(p.id)?.puntos?.toString() ?? ""]),
    ),
  )
  const faltan = abiertas.some((p) => puntos[p.id] === "")

  const finalizar = () =>
    calificar.mutate(
      {
        entregaId: entrega.id,
        puntos: Object.fromEntries(abiertas.map((p) => [p.id, Number(puntos[p.id])])),
      },
      {
        onSuccess: () => {
          notify(`Se calificó la evaluación de ${entrega.estudiante}.`)
          onClose()
        },
      },
    )

  return (
    <Dialog open onOpenChange={(o) => !o && !calificar.isPending && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{entrega.estudiante}</DialogTitle>
        </DialogHeader>
        <ol className="-mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
          {e.preguntas.map((p, i) => (
            <li key={p.id}>
              <RespuestaPregunta
                numero={i + 1}
                pregunta={p}
                respuesta={respuestas.get(p.id)}
                puntos={puntos[p.id]}
                onPuntos={(v) => setPuntos((s) => ({ ...s, [p.id]: v }))}
              />
            </li>
          ))}
        </ol>
        {calificar.isError && (
          <p role="alert" className="text-sm text-red">
            {getErrorMessage(calificar.error)}
          </p>
        )}
        <DialogFooter className="items-center">
          {faltan && (
            <p className="mr-auto text-xs text-muted-foreground">
              Asigna la puntuación de las preguntas de redacción.
            </p>
          )}
          <Button
            type="button"
            onClick={finalizar}
            disabled={faltan || calificar.isPending}
            aria-busy={calificar.isPending}
          >
            {entrega.estado === "PENDIENTE" ? "Finalizar la calificación" : "Guardar calificación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RespuestaPregunta({
  numero,
  pregunta: p,
  respuesta: r,
  puntos,
  onPuntos,
}: {
  numero: number
  pregunta: PreguntaEvaluacion
  respuesta: RespuestaEntrega | undefined
  puntos: string | undefined
  onPuntos: (v: string) => void
}) {
  const automatica = esAutomatica(p)
  const correcta = automatica && esCorrecta(p, r)

  return (
    <article>
      <header className="mb-1.5 flex items-start gap-3">
        <h3 className="flex-1 font-medium">
          {numero}. {p.texto}
        </h3>
        <div className="flex shrink-0 items-center gap-1.5 text-xs">
          <span>Puntuación</span>
          {automatica ? (
            <span className="grid h-7 min-w-8 place-items-center rounded-md border px-1.5 text-sm tabular-nums">
              {correcta ? p.puntos : 0}
            </span>
          ) : (
            <>
              <input
                inputMode="numeric"
                aria-label={`Puntuación de la pregunta ${numero}, máximo ${p.puntos}`}
                value={puntos ?? ""}
                onChange={(ev) => {
                  const v = toDigitsOnly(ev.target.value, 3)
                  onPuntos(v === "" ? "" : String(Math.min(Number(v), p.puntos)))
                }}
                className="h-7 w-10 rounded-md border bg-background text-center text-sm tabular-nums focus-visible:border-primary focus-visible:outline-none"
              />
              <button
                type="button"
                aria-label="Puntuación completa"
                title={`Puntuación completa (${p.puntos})`}
                onClick={() => onPuntos(String(p.puntos))}
                className="grid size-7 place-items-center rounded-md text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <CheckIcon className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Sin puntuación"
                title="Sin puntuación (0)"
                onClick={() => onPuntos("0")}
                className="grid size-7 place-items-center rounded-md text-red hover:bg-red-22 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <XIcon className="size-5" />
              </button>
            </>
          )}
        </div>
      </header>

      {automatica ? (
        <ul className="text-sm">
          {p.opciones.map((o) => {
            const marcada = r?.opcionIds.includes(o.id) ?? false
            const bien = marcada && o.correcta
            return (
              <li
                key={o.id}
                className={cn(
                  "flex items-center gap-2 px-1 py-0.5",
                  marcada && "border-b",
                  marcada && (bien ? "border-primary" : "border-red"),
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "grid size-4 shrink-0 place-items-center border",
                    p.tipo === "MULTIPLE" ? "rounded-sm" : "rounded-full",
                    marcada && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {marcada && p.tipo === "MULTIPLE" && <CheckIcon className="size-3" />}
                </span>
                <span className="flex-1">{o.texto}</span>
                {marcada && (
                  <span className={bien ? "text-primary" : "text-red"}>
                    {bien ? <CheckIcon aria-hidden className="size-5" /> : <XIcon aria-hidden className="size-5" />}
                    <span className="sr-only">
                      {bien ? "Respuesta correcta" : "Respuesta incorrecta"}
                    </span>
                  </span>
                )}
                {!marcada && o.correcta && (
                  <span className="text-xs text-muted-foreground">Correcta</span>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="min-h-16 rounded-lg border px-3 py-2 text-sm whitespace-pre-line">
          {r?.texto || <span className="text-muted-foreground">Sin respuesta.</span>}
        </p>
      )}
    </article>
  )
}
