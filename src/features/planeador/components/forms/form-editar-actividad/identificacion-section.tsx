import { useSelector } from "@tanstack/react-form"
import { deArticuloRotulo } from "@/features/planeador/lib/rotulo-gramatica"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnFrase,
  useRotuloActividadQuery,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import type { ActividadTab } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { useTipoActividadCatalogQuery } from "@/features/planeador/api/query/catalogos-lista-valor"
import type { Actividad } from "@/features/planeador/api/types/actividad"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import {
  useErrorObligatorio,
  ERROR_OBLIGATORIO,
} from "@/features/planeador/components/forms/form-editar-actividad/hooks"

export function IdentificacionSection({
  form,
  disabled,
  bloqueadoPorRecuperacion,
  tab,
}: {
  form: FormActividad
  disabled: boolean
  /** Ver `useRecuperacionBloqueaCampos`: "Nombre" queda bloqueado mientras sea `true`. */
  bloqueadoPorRecuperacion: boolean
  tab?: ActividadTab
}) {
  const { data: tiposActividad = [] } = useTipoActividadCatalogQuery()
  const nombreInvalido = useErrorObligatorio(form, !useSelector(form.store, (state) => state.values.nombre?.trim()))
  const tipoInvalido = useErrorObligatorio(form, !useSelector(form.store, (state) => state.values.tipo))
  // Rótulo real (Regla 13): nunca "actividad" fijo.
  const gradoIdSel = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaIdSel = useSelector(form.store, (state) => state.values.asignaturaId)
  const { data: rotuloActividad } = useRotuloActividadQuery(gradoIdSel, asignaturaIdSel)
  const rotuloLower = rotuloEnFrase(rotuloActividad?.rotulo ?? tab?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK)

  return (
    <>
        <form.Field name="nombre">
          {(field) => (
            <Field variant="outlined" data-invalid={nombreInvalido}>
              <FieldLabel htmlFor={field.name}>Nombre {deArticuloRotulo(rotuloLower)} {rotuloLower} *</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Agregar"
                maxLength={150}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                disabled={disabled || bloqueadoPorRecuperacion}
                aria-invalid={nombreInvalido}
              />
              {nombreInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        <form.Field name="tipo">
          {(field) => (
            <Field variant="outlined" data-invalid={tipoInvalido}>
              <FieldLabel htmlFor={field.name}>Tipo de {rotuloLower} *</FieldLabel>
              <Select
                // `__none__` es el sentinel de "sin elegir".
                value={field.state.value || "__none__"}
                onValueChange={(value) =>
                  field.handleChange(!value || value === "__none__" ? "" : (value as Actividad["tipo"]))
                }
                disabled={disabled}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue placeholder="Seleccione">
                    {(value) => (value === "__none__" ? "Seleccione" : (value as string))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  {tiposActividad.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tipoInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        <form.Field name="descripcion">
          {(field) => (
            <Field variant="outlined" className="sm:col-span-2">
              <FieldLabel htmlFor={field.name}>Descripción</FieldLabel>
              <Textarea className={TEXTAREA_OUTLINED}
                id={field.name}
                name={field.name}
                placeholder="Agregar"
                maxLength={500}
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                disabled={disabled}
              />
              <CharacterCounter value={field.state.value ?? ""} max={500} />
            </Field>
          )}
        </form.Field>

        {/* "Requiere validación del coordinador" es de la actividad entera, por eso va acá
        y no en "Seguimiento". */}
        <form.Field name="requiereValidacion">
          {(field) => (
            <Field variant="outlined">
              <FieldLabel htmlFor={field.name}>¿Requiere validación del coordinador?</FieldLabel>
              <Select
                value={field.state.value ? "si" : "no"}
                onValueChange={(value) => field.handleChange(value === "si")}
                disabled={disabled}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue>{(value) => (value === "si" ? "Sí" : "No")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
    </>
  )
}
