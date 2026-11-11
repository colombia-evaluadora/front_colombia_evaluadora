import { useMemo } from "react"

import { DatePicker } from "@/components/date-picker"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useOpcionesEstudiantesObservacionQuery } from "@/features/gestion-estudiantil/observaciones/api/query/use-opciones-observacion-query"
import type {
  DestinatarioObservacion,
  ObservacionDetalle,
  OpcionGrupoObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"
import { CampoEstudiantes } from "@/features/gestion-estudiantil/observaciones/components/form/campo-estudiantes"
import { CampoGrupos } from "@/features/gestion-estudiantil/observaciones/components/form/campo-grupos"
import type { useObservacionForm } from "@/features/gestion-estudiantil/observaciones/hooks/use-observacion-form"
import {
  OBSERVACION_MAX,
  TITULO_MAX,
  textoPeriodo,
} from "@/features/gestion-estudiantil/observaciones/utils/formularios"

interface Props {
  form: ReturnType<typeof useObservacionForm>
  /** Grupos que el usuario dirige (selector Grado/Grupo). */
  grupos: OpcionGrupoObservacion[]
  /** La observación que se modifica: grupo, destinatario y estudiante quedan fijos. */
  detalle?: ObservacionDetalle
  /** Etiquetas de la lista «Destinatarios de la observación», por código. */
  etiquetas: Record<DestinatarioObservacion, string>
}

function SoloLectura({ id, label, valor }: { id: string; label: string; valor: string }) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} readOnly value={valor} />
    </Field>
  )
}

/**
 * Campos de la observación (G.7.NUE.1): Grado/Grupo | Dirigida a; Estudiantes a todo el ancho; Fecha |
 * Título; Observación. Una columna en pantallas angostas. Al modificar, el destino va en solo lectura.
 */
export function FormularioObservacion({ form, grupos, detalle, etiquetas }: Props) {
  const { valores: v, set, errores, intento, gruposEfectivos } = form
  const err = (c: keyof typeof errores) => (intento ? errores[c] : undefined)
  const esNuevo = !detalle
  const especificos = v.destinatario === "ESTUDIANTES_ESPECIFICOS"

  const estudiantes = useOpcionesEstudiantesObservacionQuery(gruposEfectivos, esNuevo && especificos)
  const gruposElegidos = useMemo(
    () => grupos.filter((g) => gruposEfectivos.includes(g.fk_tgrupo)),
    [grupos, gruposEfectivos],
  )

  // El período de la fecha lo dice el backend; si la fecha no sirve, el error ocupa su lugar.
  const errorFecha = err("fecha") ?? (v.fecha ? errores.fecha : undefined)
  const periodo = textoPeriodo(form.resumen)

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        {esNuevo ? (
          <CampoGrupos
            id="observacion-grupos"
            grupos={grupos}
            value={gruposEfectivos}
            error={err("grupos")}
            onChange={(next) =>
              form.setGrupos(next, (grupo) =>
                (estudiantes.data ?? []).filter((e) => e.fk_tgrupo === grupo).map((e) => e.fk_tmatricula),
              )
            }
          />
        ) : (
          <SoloLectura id="observacion-grupo" label="Grado/Grupo" valor={detalle.grado_grupo} />
        )}
      </div>
      <div className="sm:col-span-3">
        {esNuevo ? (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm">
              Dirigida a<span className="text-red"> *</span>
            </legend>
            <RadioGroup
              className="flex flex-wrap gap-x-6 gap-y-2"
              value={v.destinatario}
              onValueChange={(valor) => set("destinatario", valor as DestinatarioObservacion)}
            >
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="TODO_EL_GRUPO" />
                {etiquetas.TODO_EL_GRUPO}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <RadioGroupItem value="ESTUDIANTES_ESPECIFICOS" />
                {etiquetas.ESTUDIANTES_ESPECIFICOS}
              </label>
            </RadioGroup>
          </fieldset>
        ) : (
          <SoloLectura id="observacion-dirigida" label="Dirigida a" valor={detalle.dirigida_a} />
        )}
      </div>

      {esNuevo && especificos && (
        <div className="sm:col-span-6">
          <CampoEstudiantes
            id="observacion-estudiantes"
            grupos={gruposElegidos}
            estudiantes={estudiantes.data ?? []}
            cargando={estudiantes.isFetching}
            value={v.estudiantes}
            error={err("estudiantes")}
            onChange={(m) => set("estudiantes", m)}
          />
        </div>
      )}
      {esNuevo && !especificos && err("estudiantes") && (
        <p role="alert" className="text-xs text-red sm:col-span-6">
          {err("estudiantes")}
        </p>
      )}

      <div className="sm:col-span-2">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errorFecha) || undefined}>
          <FieldLabel htmlFor="observacion-fecha">Fecha*</FieldLabel>
          <DatePicker
            id="observacion-fecha"
            value={v.fecha}
            aria-invalid={Boolean(errorFecha) || undefined}
            onChange={(d) => set("fecha", d)}
          />
          {errorFecha ? (
            <FieldError>{errorFecha}</FieldError>
          ) : (
            <FieldDescription>{periodo ?? "Determina el boletín en que sale."}</FieldDescription>
          )}
        </Field>
      </div>
      <div className="sm:col-span-4">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("titulo")) || undefined}>
          <FieldLabel htmlFor="observacion-titulo">Título</FieldLabel>
          <Input
            id="observacion-titulo"
            maxLength={TITULO_MAX}
            placeholder="P. ej. Actividades de refuerzo para vacaciones"
            value={v.titulo}
            aria-invalid={Boolean(err("titulo")) || undefined}
            onChange={(e) => set("titulo", e.target.value)}
          />
          <div className="flex justify-between">
            {err("titulo") ? <FieldError>{err("titulo")}</FieldError> : <span />}
            <CharacterCounter value={v.titulo} max={TITULO_MAX} />
          </div>
        </Field>
      </div>

      <div className="sm:col-span-6">
        <TextoLargo
          id="observacion-texto"
          label="Observación"
          required
          rows={5}
          max={OBSERVACION_MAX}
          value={v.observacion}
          error={err("observacion")}
          onChange={(texto) => set("observacion", texto)}
        />
      </div>
    </div>
  )
}
