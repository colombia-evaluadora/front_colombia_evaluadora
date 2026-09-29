import { useMemo, useRef, useState } from "react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeftIcon,
  ClipboardAddIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { ArchivoImage } from "@/features/files/components/archivo-image"
import { useObservarEstudianteMutation } from "@/features/planeador/api/mutations/use-observar-estudiante"
import {
  useAgregarObservacionSoporteMutation,
  useQuitarObservacionSoporteMutation,
} from "@/features/planeador/api/mutations/use-observacion-soporte"
import {
  OBSERVACION_EVIDENCIAS_MAX,
  OBSERVACION_EVIDENCIA_MAX_BYTES,
  OBSERVACION_EVIDENCIA_MAX_MB,
  OBSERVACION_MAX_CARACTERES,
} from "@/features/planeador/lib/observacion"
import { celdaDe, fechaParaGuardar } from "@/features/planeador/components/planilla/planilla-grid"
import type { CeldaEvidencia, PlanillaColumna, PlanillaFila } from "@/features/planeador/api/types/planilla"

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

interface FilaObservable {
  pkTactividadEstudiante: number
  nombreEstudiante: string
  fecha: string | null
  observacionActual: string | null
  evidencias: CeldaEvidencia[]
}

interface ObservarActividadCardsProps {
  columna: PlanillaColumna
  filas: PlanillaFila[]
  onVolver: () => void
}

/** "Momento": sin endpoint todavía (`PUT .../observar` no lo acepta), queda
 *  como borrador local sin persistir hasta que el backend lo soporte. */
interface BorradorTarjeta {
  texto: string
  momento: string
}

/** Tarjeta expandible por estudiante de una actividad formativa; cada una
 *  guarda su propio texto de forma independiente, sin pisar a las demás. */
export function ObservarActividadCards({ columna, filas, onVolver }: ObservarActividadCardsProps) {
  const { notify } = useNotify()
  const [filtro, setFiltro] = useState("")
  const [borradores, setBorradores] = useState<Record<number, BorradorTarjeta>>({})
  const [duplicarDesde, setDuplicarDesde] = useState<FilaObservable | null>(null)
  const inputsArchivoRef = useRef(new Map<number, HTMLInputElement>())

  const observables = useMemo<FilaObservable[]>(() => {
    return filas
      .map((fila) => {
        const celda = celdaDe(fila, columna)
        if (!celda) return null
        return {
          pkTactividadEstudiante: celda.pkTactividadEstudiante,
          nombreEstudiante: fila.nombreEstudiante,
          fecha: fechaParaGuardar(columna, celda),
          observacionActual: celda.observacion,
          evidencias: celda.evidencias,
        }
      })
      .filter((fila): fila is FilaObservable => fila != null)
  }, [filas, columna])

  const filtrados = useMemo(() => {
    const term = filtro.trim().toLowerCase()
    if (!term) return observables
    return observables.filter((fila) => fila.nombreEstudiante.toLowerCase().includes(term))
  }, [observables, filtro])

  function borradorInicial(id: number): BorradorTarjeta {
    const fila = observables.find((f) => f.pkTactividadEstudiante === id)
    return { texto: fila?.observacionActual ?? "", momento: "" }
  }

  function borradorDe(fila: FilaObservable): BorradorTarjeta {
    return borradores[fila.pkTactividadEstudiante] ?? borradorInicial(fila.pkTactividadEstudiante)
  }

  function actualizarBorrador(id: number, next: Partial<BorradorTarjeta>) {
    setBorradores((prev) => ({ ...prev, [id]: { ...(prev[id] ?? borradorInicial(id)), ...next } }))
  }

  const observar = useObservarEstudianteMutation({
    mutationConfig: {
      onSuccess: () => notify("Observación guardada."),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const agregarEvidencia = useAgregarObservacionSoporteMutation({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })
  const quitarEvidencia = useQuitarObservacionSoporteMutation({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })

  function guardar(fila: FilaObservable) {
    if (!fila.fecha) return
    const borrador = borradorDe(fila)
    observar.mutate({
      pkTactividadEstudiante: fila.pkTactividadEstudiante,
      observacion: borrador.texto.trim(),
      fecha: fila.fecha,
    })
  }

  function seleccionarArchivo(fila: FilaObservable, archivo: File | undefined) {
    if (!archivo || !fila.fecha) return
    if (archivo.size > OBSERVACION_EVIDENCIA_MAX_BYTES) {
      notify(`La imagen supera el máximo de ${OBSERVACION_EVIDENCIA_MAX_MB} MB.`, { variant: "error" })
      return
    }
    agregarEvidencia.mutate({ pkTactividadEstudiante: fila.pkTactividadEstudiante, archivo, fecha: fila.fecha })
  }

  function duplicarA(destino: FilaObservable) {
    if (!duplicarDesde) return
    const origen = borradorDe(duplicarDesde)
    actualizarBorrador(destino.pkTactividadEstudiante, { texto: origen.texto, momento: origen.momento })
    notify(`Texto de ${duplicarDesde.nombreEstudiante} copiado a ${destino.nombreEstudiante}.`)
    setDuplicarDesde(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 rounded-md border bg-card p-3">
      <div className="flex items-center gap-2 border-b pb-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                color="neutral"
                size="icon-sm"
                onClick={onVolver}
                aria-label="Volver a la planilla"
              />
            }
          >
            <ArrowLeftIcon className="size-6" />
          </TooltipTrigger>
          <TooltipContent>Volver a la planilla</TooltipContent>
        </Tooltip>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold">Registro narrativo: {columna.titulo}</h2>
          <p className="text-muted-foreground text-xs">Observación individual por estudiante</p>
        </div>
      </div>

      {duplicarDesde && (
        <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <span>
            Elige la tarjeta destino para copiar el texto de <strong>{duplicarDesde.nombreEstudiante}</strong>.
          </span>
          <Button size="icon-xs" variant="ghost" color="neutral" onClick={() => setDuplicarDesde(null)}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      <Field variant="outlined">
        <FieldLabel>Estudiantes</FieldLabel>
        <div className="relative">
          <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-9"
          />
        </div>
      </Field>

      <Accordion className="flex-1 overflow-y-auto rounded-md border" multiple>
        {filtrados.map((fila) => {
          const borrador = borradorDe(fila)
          const sinAsistencia = fila.fecha == null
          const limiteEvidenciasAlcanzado = fila.evidencias.length >= OBSERVACION_EVIDENCIAS_MAX
          const guardandoEsta = observar.isPending && observar.variables?.pkTactividadEstudiante === fila.pkTactividadEstudiante
          const esModoDuplicar = duplicarDesde != null

          return (
            <AccordionItem key={fila.pkTactividadEstudiante} value={String(fila.pkTactividadEstudiante)}>
              <AccordionTrigger>
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>{iniciales(fila.nombreEstudiante)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium normal-case">{fila.nombreEstudiante}</span>
                  {sinAsistencia && (
                    <span className="text-muted-foreground shrink-0 text-xs normal-case">Sin asistencia</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {esModoDuplicar ? (
                  duplicarDesde?.pkTactividadEstudiante !== fila.pkTactividadEstudiante && (
                    <Button size="sm" variant="outline" color="primary" onClick={() => duplicarA(fila)}>
                      Copiar acá
                    </Button>
                  )
                ) : (
                  <div className="flex flex-col gap-4">
                    <Field variant="outlined">
                      <FieldLabel htmlFor={`observacion-${fila.pkTactividadEstudiante}`}>Observación</FieldLabel>
                      <Textarea
                        id={`observacion-${fila.pkTactividadEstudiante}`}
                        value={borrador.texto}
                        maxLength={OBSERVACION_MAX_CARACTERES}
                        disabled={sinAsistencia}
                        onChange={(e) => actualizarBorrador(fila.pkTactividadEstudiante, { texto: e.target.value })}
                        placeholder="Escribe la observación de este estudiante…"
                        className={cn("min-h-28 resize-y", TEXTAREA_OUTLINED)}
                      />
                      <span className="self-end text-xs text-muted-foreground">
                        {borrador.texto.length}/{OBSERVACION_MAX_CARACTERES}
                      </span>
                    </Field>

                    <Field variant="outlined">
                      <FieldLabel htmlFor={`momento-${fila.pkTactividadEstudiante}`}>
                        Momento{" "}
                        <span className="text-muted-foreground font-normal normal-case">
                          (borrador — aún no se guarda)
                        </span>
                      </FieldLabel>
                      <Input
                        id={`momento-${fila.pkTactividadEstudiante}`}
                        value={borrador.momento}
                        maxLength={100}
                        disabled={sinAsistencia}
                        onChange={(e) => actualizarBorrador(fila.pkTactividadEstudiante, { momento: e.target.value })}
                        placeholder="Ej. Inicio, Desarrollo, Cierre…"
                      />
                    </Field>

                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold uppercase">Evidencias</p>
                      <div className="flex flex-wrap items-start gap-2">
                        {fila.evidencias.map((evidencia) => (
                          <div key={evidencia.pk} className="group relative">
                            <ArchivoImage
                              archivoId={evidencia.fkTarchivo}
                              alt={evidencia.nombre ?? `Evidencia de ${fila.nombreEstudiante}`}
                              className="size-16"
                            />
                            <Button
                              type="button"
                              variant="fill"
                              color="destructive"
                              size="icon-xs"
                              className="absolute -top-1.5 -right-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                              aria-label="Quitar esta evidencia"
                              disabled={!fila.fecha || quitarEvidencia.isPending}
                              onClick={() =>
                                fila.fecha &&
                                quitarEvidencia.mutate({
                                  pkTactividadSoporte: evidencia.pk,
                                  pkTactividadEstudiante: fila.pkTactividadEstudiante,
                                  fecha: fila.fecha,
                                })
                              }
                            >
                              <XIcon />
                            </Button>
                          </div>
                        ))}
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Button
                              type="button"
                              variant="outline"
                              color="neutral"
                              size="icon"
                              className="size-16 flex-col gap-1 text-xs"
                              disabled={sinAsistencia || agregarEvidencia.isPending || limiteEvidenciasAlcanzado}
                              onClick={() => inputsArchivoRef.current.get(fila.pkTactividadEstudiante)?.click()}
                            >
                              {agregarEvidencia.isPending &&
                              agregarEvidencia.variables?.pkTactividadEstudiante === fila.pkTactividadEstudiante ? (
                                <SpinnerIcon className="size-5 animate-spin" />
                              ) : (
                                <ImageIcon className="size-5" />
                              )}
                              Agregar
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {limiteEvidenciasAlcanzado
                              ? `Máximo ${OBSERVACION_EVIDENCIAS_MAX} evidencias por observación.`
                              : `Subir una foto (máx. ${OBSERVACION_EVIDENCIA_MAX_MB} MB) como evidencia.`}
                          </TooltipContent>
                        </Tooltip>
                        <input
                          ref={(el) => {
                            if (el) inputsArchivoRef.current.set(fila.pkTactividadEstudiante, el)
                            else inputsArchivoRef.current.delete(fila.pkTactividadEstudiante)
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const archivo = e.target.files?.[0]
                            e.target.value = ""
                            seleccionarArchivo(fila, archivo)
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>
                          <Button
                            type="button"
                            variant="outline"
                            color="neutral"
                            size="sm"
                            disabled={!borrador.texto.trim()}
                            onClick={() => setDuplicarDesde(fila)}
                          >
                            <ClipboardAddIcon data-icon="inline-start" />
                            Duplicar a otro estudiante
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Copia este texto como punto de partida para otro estudiante, sin perder lo que ya
                          tiene.
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        type="button"
                        color="primary"
                        size="sm"
                        disabled={sinAsistencia || guardandoEsta}
                        onClick={() => guardar(fila)}
                      >
                        {guardandoEsta && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
