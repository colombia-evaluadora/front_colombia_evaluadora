import * as React from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import {
  ListaAgregableField,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import {
  METODO_CALCULO_INFO,
  METODO_CALCULO_OPTIONS,
} from "@/features/planeador/components/forms/form-unidad-info-general"
import { PlusCircleIcon, SpinnerIcon } from "@/components/ui/icons"
import type { MetodoCalculo } from "@/features/planeador/api/types/unidad-tematica"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"

/** Botón "+" junto al `Select` de unidad: popover para crear una unidad en el momento. */
export function CrearUnidadPopover({
  onCreate,
  className,
  instrumentoLabel = UNIDAD_TAB_FALLBACK,
  gradoId,
  asignaturaId,
  disabled = false,
}: {
  onCreate: (data: {
    nombre: string
    contenidos: string[]
    objetivos: string[]
    descripcion: string
    enunciadosDba: { id: number; text: string }[]
    metodoCalculo: MetodoCalculo
  }) => Promise<void>
  /** Clases para encadenarlo con un control adyacente (split-button). */
  className?: string
  /** Rótulo real del instrumento ("Proyecto pedagógico" en Preescolar). */
  instrumentoLabel?: string
  /** Grado/Asignatura de la actividad: la unidad nueva nace con ellos. */
  gradoId: number | undefined
  asignaturaId: number | undefined
  /** `true` mientras la actividad no tenga Grado/Asignatura. */
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [nombre, setNombre] = React.useState("")
  const [contenidos, setContenidos] = React.useState<string[]>([])
  const [objetivos, setObjetivos] = React.useState<string[]>([])
  const [descripcion, setDescripcion] = React.useState("")
  const [enunciadosDba, setEnunciadosDba] = React.useState<{ id: number; text: string }[]>([])
  const [metodoCalculo, setMetodoCalculo] = React.useState<MetodoCalculo>("Ponderado")
  const [isSaving, setIsSaving] = React.useState(false)
  const { notify } = useNotify()
  // Sin "nuevo/nueva": el rótulo varía y no se concuerda el género.
  const crearLabel = `Crear ${instrumentoLabel.toLowerCase()}`

  const {
    enunciados: enunciadosDisponibles,
    nombre: referenteNombre,
    descripcion: referenteDescripcion,
    nivel1Etiqueta,
    isPending: isPendingEnunciados,
  } = useEnunciadosDbaQuery(gradoId, asignaturaId)

  // Una unidad formativa no tiene "Método de cálculo".
  const { data: referenteDeGradoAsignatura } = useReferenteCurricularQuery(gradoId, asignaturaId)
  const esFormativa = referenteDeGradoAsignatura?.esFormativo ?? false

  const hasGradoAsignatura = gradoId != null && asignaturaId != null

  const reset = () => {
    setNombre("")
    setContenidos([])
    setObjetivos([])
    setDescripcion("")
    setEnunciadosDba([])
    setMetodoCalculo("Ponderado")
  }

  // Si falla se avisa acá y el popover queda abierto con lo tipeado.
  const guardar = async () => {
    if (!nombre.trim() || !hasGradoAsignatura || isSaving) return
    setIsSaving(true)
    try {
      await onCreate({ nombre: nombre.trim(), contenidos, objetivos, descripcion, enunciadosDba, metodoCalculo })
      reset()
      setOpen(false)
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) reset()
    }}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="fill"
                  color="primary"
                  size="icon-sm"
                  aria-label={crearLabel}
                  // Deshabilitado sin Grado/Asignatura: adentro no se podría guardar nada.
                  disabled={disabled || !hasGradoAsignatura}
                  // `size-11` iguala la altura del `SelectTrigger`; `className` va al final para ganar.
                  className={cn("size-11 shrink-0 rounded-md", className)}
                />
              }
            />
          }
        >
          <PlusCircleIcon />
        </TooltipTrigger>
        <TooltipContent>
          {hasGradoAsignatura ? crearLabel : "Elegí Grado/Grupo y Asignatura de la actividad primero."}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        // `gap-0`: título y footer fijos, solo el cuerpo scrollea.
        className="w-96 gap-0 p-0"
      >
        {/* `line-clamp-2`: el rótulo admite 400 caracteres. */}
        <h3 className="line-clamp-2 border-b px-4 py-3 text-base font-semibold" title={crearLabel}>
          {crearLabel}
        </h3>

        <div className="scrollbar-slim flex max-h-[60vh] flex-col gap-5 overflow-y-auto p-4">
          <Field variant="outlined">
            <FieldLabel>Nombre</FieldLabel>
            <Input
              placeholder="Agregar"
              maxLength={50}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>

          <Field variant="outlined">
            <FieldLabel>Descripción breve</FieldLabel>
            <Textarea
              rows={3}
              placeholder="Propósito pedagógico y dinámica general"
              maxLength={500}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={TEXTAREA_OUTLINED}
            />
          </Field>

          <div className="flex flex-col gap-4 border-t pt-4">
            <ListaAgregableField
              label="Objetivos específicos relacionados"
              items={objetivos}
              onChange={setObjetivos}
            />

            <ListaAgregableField
              label="Contenidos temáticos vinculados"
              items={contenidos}
              onChange={setContenidos}
            />
          </div>

          <div className="border-t pt-4">
            <ListaAgregableCajaSelect
              title={referenteNombre ?? "Derechos Básicos de Aprendizaje"}
              description={referenteDescripcion ?? "Selecciona los enunciados asociados."}
              // Nunca "Enunciados" fijo: en Preescolar el nivel 1 es "Propósito".
              columnLabel={`${nivel1Etiqueta}s`}
              items={enunciadosDba}
              options={enunciadosDisponibles}
              onChange={setEnunciadosDba}
              disabled={!hasGradoAsignatura}
              isPending={isPendingEnunciados}
            />
          </div>

          {!esFormativa && (
            <Field variant="outlined" className="border-t pt-4">
              <FieldLabel>Método de cálculo</FieldLabel>
              <Select
                value={metodoCalculo}
                onValueChange={(v) => v && setMetodoCalculo(v as MetodoCalculo)}
              >
                <SelectTrigger>
                  <SelectValue>{(v) => METODO_CALCULO_INFO[v as MetodoCalculo]?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {METODO_CALCULO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {METODO_CALCULO_INFO[option].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <div className="flex justify-end border-t p-4">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            type="button"
            onClick={guardar}
            disabled={!nombre.trim() || isSaving}
          >
            {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            {isSaving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
