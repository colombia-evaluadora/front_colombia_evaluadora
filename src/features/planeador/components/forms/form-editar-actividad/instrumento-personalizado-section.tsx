import { useSelector } from "@tanstack/react-form"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { InstrumentoPermitidoCampos, InstrumentoPersonalizado } from "@/features/planeador/api/types/actividad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import {
  TEXTAREA_OUTLINED,
  TIPO_EVIDENCIA_ESPERADA_LABELS,
  TIPO_EVIDENCIA_CHECKBOX_DEFAULT,
  TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT,
  METODO_VALORACION_CATALOGO_DEFAULT,
} from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { ERROR_OBLIGATORIO } from "@/features/planeador/components/forms/form-editar-actividad/hooks"
import { ListaCotejoSection } from "@/features/planeador/components/forms/form-editar-actividad/lista-cotejo-section"
import {
  EscalaValoracionSection,
} from "@/features/planeador/components/forms/form-editar-actividad/escala-valoracion-section"
import { RubricasSection } from "@/features/planeador/components/forms/form-editar-actividad/rubricas-section"

/**
 * Instrumento "Otro (personalizado)": ficha fija con evidencia, método y opciones de entrega.
 * El método monta la misma sección de definición que ese instrumento elegido directamente.
 */
export function InstrumentoPersonalizadoSection({
  form,
  unidades,
  tipoEvaluacion,
  camposOtro,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  tipoEvaluacion: string | null
  /**
   * Ficha dinámica de "Otro" (`instrumentosPermitidos[OTRO].campos`). `null` mientras no
   * resuelve: cae a un catálogo fijo.
   */
  camposOtro: InstrumentoPermitidoCampos | null
  disabled: boolean
}) {
  // Tras un intento de guardar, tipo de evidencia y método marcan en rojo aunque no se hayan
  // tocado: son los obligatorios de "Otro".
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)
  const tipoEvidenciaCatalogo =
    camposOtro?.tipoEvidencia.catalogo && camposOtro.tipoEvidencia.catalogo.length > 0
      ? camposOtro.tipoEvidencia.catalogo
      : TIPO_EVIDENCIA_ESPERADA_CATALOGO_DEFAULT
  const metodoValoracionCatalogo =
    camposOtro?.metodoValoracion.catalogo && camposOtro.metodoValoracion.catalogo.length > 0
      ? camposOtro.metodoValoracion.catalogo
      : METODO_VALORACION_CATALOGO_DEFAULT
  // Regla 41: tope de 200 (el endpoint reporta 4000), se acota con `min`.
  const descripcionMaxLength = Math.min(camposOtro?.descripcionInstrumento.maxLength ?? 200, 200)

  return (
    <Card className="gap-4 p-4">
      <h3 className="text-base font-semibold">Definición del instrumento personalizado</h3>

      <form.Field
        name="instrumentoPersonalizado"
        validators={{
          onChange: ({ value }) => {
            const v = value as InstrumentoPersonalizado
            // Mismo orden que el validador real.
            if (!v.tipoEvidenciaEsperada) {
              return { message: "Indique el tipo de evidencia esperada." }
            }
            if (!v.metodoValoracion) {
              return { message: "Indique el método de valoración." }
            }
            return undefined
          },
        }}
      >
        {(field) => {
          const value = field.state.value as InstrumentoPersonalizado
          // Regla 41: la opción de entrega que dicta el tipo queda marcada y deshabilitada; la otra libre.
          const entregaPorTipo = TIPO_EVIDENCIA_CHECKBOX_DEFAULT[value.tipoEvidenciaEsperada]
          function patch(next: Partial<InstrumentoPersonalizado>) {
            field.handleChange({ ...value, ...next })
          }
          // El validador es uno solo para el objeto: se recalcula qué select falta para marcar solo ese.
          const tocado = field.state.meta.isTouched || submissionAttempts > 0
          const tipoEvidenciaInvalido = tocado && !value.tipoEvidenciaEsperada
          const metodoValoracionInvalido = tocado && !value.metodoValoracion
          return (
            <>
              <Field variant="outlined">
                <FieldLabel htmlFor="instrumentoPersonalizado-descripcion">
                  Descripción del instrumento
                </FieldLabel>
                <Textarea
                  id="instrumentoPersonalizado-descripcion"
                  className={TEXTAREA_OUTLINED}
                  rows={3}
                  placeholder="Agregar descripción breve"
                  maxLength={descripcionMaxLength}
                  value={value.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                  disabled={disabled}
                />
                <CharacterCounter value={value.descripcion} max={descripcionMaxLength} />
              </Field>

              <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
                <Field variant="outlined" data-invalid={tipoEvidenciaInvalido}>
                  <FieldLabel htmlFor="instrumentoPersonalizado-tipo-evidencia">
                    Tipo de evidencia esperada *
                  </FieldLabel>
                  <Select
                    value={value.tipoEvidenciaEsperada}
                    onValueChange={(v) => {
                      if (!v) return
                      const defecto = TIPO_EVIDENCIA_CHECKBOX_DEFAULT[v]
                      patch({
                        tipoEvidenciaEsperada: v,
                        ...(defecto
                          ? {
                              requiereArchivo: defecto === "archivo",
                              requiereRespuestaTexto: defecto === "texto",
                            }
                          : {}),
                      })
                    }}
                    disabled={disabled}
                  >
                    <SelectTrigger id="instrumentoPersonalizado-tipo-evidencia" aria-invalid={tipoEvidenciaInvalido}>
                      <SelectValue placeholder="Seleccione">
                        {(v) =>
                          // `??` no sirve: sin selección `v` llega como `""`.
                          v ? (TIPO_EVIDENCIA_ESPERADA_LABELS[v as string] ?? (v as string)) : "Seleccione"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tipoEvidenciaCatalogo.map((opcion) => (
                        <SelectItem key={opcion.pk} value={opcion.nombre}>
                          {TIPO_EVIDENCIA_ESPERADA_LABELS[opcion.nombre] ?? opcion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {tipoEvidenciaInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                </Field>

                <Field variant="outlined" data-invalid={metodoValoracionInvalido}>
                  <FieldLabel htmlFor="instrumentoPersonalizado-metodo-valoracion">
                    Método de valoración *
                  </FieldLabel>
                  <Select
                    value={value.metodoValoracion}
                    onValueChange={(v) =>
                      v &&
                      patch({
                        metodoValoracion: v as InstrumentoPersonalizado["metodoValoracion"],
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger
                      id="instrumentoPersonalizado-metodo-valoracion"
                      aria-invalid={metodoValoracionInvalido}
                    >
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      {metodoValoracionCatalogo.map((opcion) => (
                        <SelectItem key={opcion.pk} value={opcion.nombre}>
                          {opcion.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {metodoValoracionInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
                </Field>
              </div>

              {/* El método elegido monta acá su definición, antes de las opciones de entrega. */}
              {value.metodoValoracion === "Rúbrica" ? (
                <RubricasSection form={form} unidades={unidades} disabled={disabled} />
              ) : value.metodoValoracion === "Lista de cotejo" ? (
                <ListaCotejoSection form={form} unidades={unidades} disabled={disabled} />
              ) : value.metodoValoracion === "Escala de valoración" ? (
                <EscalaValoracionSection
                  form={form}
                  unidades={unidades}
                  tipoEvaluacion={tipoEvaluacion}
                  disabled={disabled}
                />
              ) : null}

              <FieldSet>
                <FieldLegend variant="label">Opciones de entrega</FieldLegend>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={entregaPorTipo === "archivo" || value.requiereArchivo}
                      onCheckedChange={(next) => patch({ requiereArchivo: next === true })}
                      disabled={disabled || entregaPorTipo === "archivo"}
                    />
                    El estudiante debe adjuntar un archivo
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={entregaPorTipo === "texto" || value.requiereRespuestaTexto}
                      onCheckedChange={(next) => patch({ requiereRespuestaTexto: next === true })}
                      disabled={disabled || entregaPorTipo === "texto"}
                    />
                    El estudiante debe escribir una respuesta (texto)
                  </label>
                </div>
              </FieldSet>
            </>
          )
        }}
      </form.Field>
    </Card>
  )
}
