import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DotsSixVerticalIcon, InfoIcon, PlusIcon, TrashIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { MatriculaSelectField, MatriculaTextField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type { PeriodoOpcionCupo } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import {
  DOCUMENTO_HERMANO,
  establecimientosDe,
  gradosDe,
  hermanoValido,
  jornadasDe,
  modalidadesDe,
  pideModalidad,
  sedesDe,
  opcionVacia,
  type Hermano,
  type OpcionCupo,
} from "@/features/publico/inscribir/utils"

interface PasoOpcionesProps {
  /** Períodos que reciben inscripciones (cascada del backend). */
  periodos: PeriodoOpcionCupo[]
  maxOpciones: number
  grado: string
  onGradoChange: (grado: string) => void
  opciones: OpcionCupo[]
  onOpcionesChange: (opciones: OpcionCupo[]) => void
  hermano: Hermano
  onHermanoChange: (hermano: Hermano) => void
  /** Ya se intentó avanzar: marca los obligatorios vacíos. */
  intentado: boolean
}

/** Paso 4 · Grado y opciones de cupo (hasta 3, en orden de preferencia; se reordenan arrastrando). */
export function PasoOpciones({ periodos, maxOpciones, grado, onGradoChange, opciones, onOpcionesChange, hermano, onHermanoChange, intentado }: PasoOpcionesProps) {
  const [arrastrando, setArrastrando] = useState<number | null>(null)
  const setOpcion = (i: number, patch: Partial<OpcionCupo>) =>
    onOpcionesChange(opciones.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  function soltarEn(destino: number) {
    if (arrastrando == null || arrastrando === destino) return
    const nuevas = [...opciones]
    const [movida] = nuevas.splice(arrastrando, 1)
    nuevas.splice(destino, 0, movida)
    onOpcionesChange(nuevas)
    setArrastrando(null)
  }

  const errorHermano = hermano.tiene === true && hermano.documento !== "" && !DOCUMENTO_HERMANO.test(hermano.documento)

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-60">
        <MatriculaSelectField
          id="inscripcion-grado"
          label="Grado"
          required
          value={grado}
          options={gradosDe(periodos)}
          onChange={(g) => {
            onGradoChange(g)
            // Otro grado cambia la cascada: las opciones se eligen de nuevo.
            onOpcionesChange([opcionVacia()])
          }}
          invalid={intentado && !grado}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          Opciones de cupo <span data-required-mark="">*</span>
          <Tooltip>
            <TooltipTrigger render={<span className="text-muted-foreground inline-flex cursor-help" />}>
              <InfoIcon className="size-4" aria-label="Ayuda" />
            </TooltipTrigger>
            <TooltipContent>
              Hasta {maxOpciones} opciones, de uno o de varios establecimientos. Arrástrelas para cambiar el orden de preferencia.
            </TooltipContent>
          </Tooltip>
        </h3>

        {opciones.map((o, i) => {
          const modalidad = pideModalidad(periodos, grado, o)
          return (
            <div
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltarEn(i)}
              className={cn(
                // Fondo blanco (el gris se leía como bloqueado); todo centrado en la fila.
                "group/opcion bg-card hover:border-primary-stroke flex flex-col gap-4 rounded-lg border p-4 transition-colors md:flex-row md:items-center",
                arrastrando === i && "opacity-50",
              )}
            >
              <div className="flex items-center gap-1 md:w-24 md:shrink-0">
                <span
                  draggable={opciones.length > 1}
                  onDragStart={() => setArrastrando(i)}
                  onDragEnd={() => setArrastrando(null)}
                  aria-label={`Arrastrar la opción ${i + 1} para reordenar`}
                  className={cn("text-muted-foreground", opciones.length > 1 && "cursor-grab")}
                >
                  <DotsSixVerticalIcon className="size-5" aria-hidden />
                </span>
                <span className="text-sm font-semibold">Opción {i + 1}</span>
              </div>
              {/* En pantalla ancha los campos se reparten todo el ancho (3 o 4, según si pide modalidad). */}
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:*:min-w-0 lg:*:flex-1">
                <MatriculaSelectField
                  id={`opcion-${i}-establecimiento`}
                  label="Establecimiento"
                  required
                  value={o.establecimiento}
                  options={establecimientosDe(periodos, grado)}
                  disabled={!grado}
                  onChange={(establecimiento) => setOpcion(i, { establecimiento, sede: "", jornada: "", modalidad: "" })}
                  invalid={intentado && !o.establecimiento}
                />
                <MatriculaSelectField
                  id={`opcion-${i}-sede`}
                  label="Sede"
                  required
                  value={o.sede}
                  options={sedesDe(periodos, grado, o.establecimiento)}
                  disabled={!o.establecimiento}
                  onChange={(sede) => setOpcion(i, { sede, jornada: "", modalidad: "" })}
                  invalid={intentado && !o.sede}
                />
                <MatriculaSelectField
                  id={`opcion-${i}-jornada`}
                  label="Jornada"
                  required
                  value={o.jornada}
                  options={jornadasDe(periodos, grado, o.establecimiento, o.sede)}
                  disabled={!o.sede}
                  onChange={(jornada) => setOpcion(i, { jornada, modalidad: "" })}
                  invalid={intentado && !o.jornada}
                />
                {modalidad && (
                  <MatriculaSelectField
                    id={`opcion-${i}-modalidad`}
                    label="Modalidad de matrícula"
                    required
                    value={o.modalidad}
                    options={modalidadesDe(periodos, grado, o)}
                    onChange={(m) => setOpcion(i, { modalidad: m })}
                    invalid={intentado && !o.modalidad}
                    description="Esta sede y jornada tienen el grado en dos períodos."
                  />
                )}
              </div>
              {/* Como las acciones de las tablas: solo ícono, visible al pasar el mouse o
                  al llegar con el teclado (en celular, siempre visible). */}
              {opciones.length > 1 && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        color="destructive"
                        size="icon-sm"
                        aria-label={`Eliminar la opción ${i + 1}`}
                        className="shrink-0 self-end transition-opacity md:self-center md:opacity-0 md:group-hover/opcion:opacity-100 md:focus-visible:opacity-100"
                        onClick={() => onOpcionesChange(opciones.filter((_, j) => j !== i))}
                      />
                    }
                  >
                    <TrashIcon />
                  </TooltipTrigger>
                  <TooltipContent>Eliminar</TooltipContent>
                </Tooltip>
              )}
            </div>
          )
        })}

        {opciones.length < maxOpciones && (
          <Button
            type="button"
            variant="outline"
            color="neutral"
            className="w-fit border-dashed"
            onClick={() => onOpcionesChange([...opciones, opcionVacia()])}
          >
            <PlusIcon data-icon="inline-start" />
            Agregar otra opción
          </Button>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium">
            ¿Tiene hermano en algún establecimiento de las opciones? <span data-required-mark="">*</span>
          </legend>
          <RadioGroup
            className="flex flex-wrap gap-6"
            value={hermano.tiene == null ? "" : hermano.tiene ? "S" : "N"}
            onValueChange={(v) => onHermanoChange({ tiene: v === "S", documento: v === "S" ? hermano.documento : "" })}
            aria-invalid={intentado && hermano.tiene == null}
          >
            {[
              ["S", "Sí"],
              ["N", "No"],
            ].map(([v, label]) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value={v} />
                {label}
              </label>
            ))}
          </RadioGroup>
          {intentado && hermano.tiene == null && <p className="text-red text-xs">Seleccione una respuesta.</p>}
        </fieldset>

        {hermano.tiene && (
          <div className="flex flex-col gap-1.5">
            <MatriculaTextField
              id="documento-hermano"
              label="Documento del hermano"
              required
              maxLength={20}
              value={hermano.documento}
              onChange={(documento) => onHermanoChange({ ...hermano, documento: documento.replace(/[^A-Za-z0-9]/g, "") })}
              invalid={errorHermano || (intentado && !hermanoValido(hermano))}
            />
            <p className={cn("text-xs", errorHermano || (intentado && !hermanoValido(hermano)) ? "text-red" : "text-muted-foreground")}>
              Entre 5 y 20 letras o dígitos, sin puntos ni espacios. Se verifica en los establecimientos de las opciones.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
