import { useSelector } from "@tanstack/react-form"
import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUnidadDetalleQuery } from "@/features/planeador/api/query/use-unidades-query"
import { useUnidadCriteriosQuery } from "@/features/planeador/api/query/use-unidad-criterios-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import {
  instrumentoLabelFromReferente,
  resolveInstrumentoLabel,
  useUnidadesTabsQuery,
} from "@/features/planeador/api/query/use-unidades-tabs-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import {
  CriteriosUnidadChecklist,
  EnunciadosEvidenciasChecklist,
  UnidadFicha,
} from "@/features/planeador/components/unidad-evidencias-section"
import type { MetodoCalculo, UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import { useSoloLecturaActividad } from "@/features/planeador/components/forms/form-editar-actividad/context"
import { SoloEdicion } from "@/features/planeador/components/forms/form-editar-actividad/solo-edicion"
import { CrearUnidadPopover } from "@/features/planeador/components/forms/form-editar-actividad/crear-unidad-popover"

/** "Unidad temática asociada" depende de Grado + Asignatura: va después en el grid. */
export function UnidadAsociadaSection({
  form,
  unidades,
  onCrearUnidad,
  disabled,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  disabled: boolean
  onCrearUnidad: (data: {
    nombre: string
    contenidos: string[]
    objetivos: string[]
    descripcion: string
    enunciadosDba: { id: number; text: string }[]
    metodoCalculo: MetodoCalculo
    gradoId: number | undefined
    grado: string
    asignaturaId: number | undefined
    asignatura: string
  }) => Promise<UnidadTematica>
}) {
  const soloLectura = useSoloLecturaActividad()
  // El rótulo depende del nivel educativo del Grado elegido ("Proyecto pedagógico" en
  // Preescolar); con Grado elegido hay a lo sumo un instrumento en `unidadTabs`.
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // El enfoque formativo lo decide el referente de Grado + Asignatura, no
  // `UnidadTematica.enfoquePedagogico` (siempre llega "Evaluativo").
  const gradoIdSel = useSelector(form.store, (state) => state.values.gradoId)
  const asignaturaIdSel = useSelector(form.store, (state) => state.values.asignaturaId)
  const { data: referenteActual } = useReferenteCurricularQuery(gradoIdSel, asignaturaIdSel)

  return (
    <>
        <form.Subscribe
          selector={(state) => `${state.values.grado}/${state.values.asignatura}/${state.values.gradoId}`}
        >
          {() => {
            // Depende de Grado + Asignatura, no del grupo: una unidad se identifica por (asignatura, grado).
            const grado = form.getFieldValue("grado")
            const asignatura = form.getFieldValue("asignatura")
            // Se chequean los ids (como `CrearUnidadPopover`), no los labels: el detalle real
            // puede traer labels sin ids.
            const gradoId = form.getFieldValue("gradoId")
            const asignaturaId = form.getFieldValue("asignaturaId")
            const hasGradoAsignatura = gradoId != null && asignaturaId != null
            const unidadesDelGrado = hasGradoAsignatura
              ? unidades.filter((u) => u.grado === grado && u.asignatura === asignatura)
              : []

            const instrumentoLabel = resolveInstrumentoLabel(gradoId, unidadTabs, UNIDAD_TAB_FALLBACK)

            return (
              <form.Field name="unidad">
                {(field) => (
                  // `gap-0` y bordes/redondeados anulados: select + botón se leen como un split-button.
                  <div className="flex items-end gap-0">
                    <Field
                      variant="outlined"
                      // En solo lectura el "+" no se renderiza y el select recupera sus esquinas.
                      className={cn(
                        "min-w-0 flex-1",
                        !soloLectura && "[&_[data-slot=select-trigger]]:rounded-r-none [&_[data-slot=select-trigger]]:border-r-0",
                      )}
                    >
                      <FieldLabel htmlFor={field.name} className="truncate" title={instrumentoLabel}>
                        {instrumentoLabel}
                      </FieldLabel>
                      <Select
                        // `0` es el sentinel de "sin unidad" (ningún PK real es 0).
                        value={field.state.value.id === 0 ? "__none__" : String(field.state.value.id)}
                        disabled={disabled || !hasGradoAsignatura}
                        onValueChange={(value) => {
                          // `__none__` ("Seleccione") se maneja aparte para poder vaciar el campo;
                          // se guarda `0` como "sin unidad".
                          if (value === "__none__") {
                            field.handleChange({ id: 0, nombre: "" })
                            form.setFieldValue("ponderacion", 0)
                            form.setFieldValue("notaMaxima", undefined)
                            return
                          }
                          const next = unidadesDelGrado.find((u) => String(u.id) === value)
                          if (!next) return
                          field.handleChange({ id: next.id, nombre: next.nombre })
                          // Regla: una unidad de enfoque formativo no admite actividades sumativas, así que se
                          // apaga `esEvaluativa` de inmediato. Usa `referenteActual`, no `next.enfoquePedagogico`.
                          if (referenteActual?.esFormativo) {
                            form.setFieldValue("esEvaluativa", false)
                          }
                          // `ponderacion`/`notaMaxima` dependen del `metodoCalculo` de la unidad: se limpian
                          // para no mandar un valor de la unidad anterior.
                          if (next.metodoCalculo !== "Ponderado") form.setFieldValue("ponderacion", 0)
                          if (next.metodoCalculo !== "Suma de puntos") form.setFieldValue("notaMaxima", undefined)
                        }}
                      >
                        <SelectTrigger id={field.name}>
                          <SelectValue
                            placeholder={hasGradoAsignatura ? "Seleccione" : "Elegí grado/asignatura primero"}
                          >
                            {(value) =>
                              unidadesDelGrado.find((u) => String(u.id) === value)?.nombre ?? "Seleccione"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Seleccione</SelectItem>
                          {unidadesDelGrado.map((u) => (
                            <SelectItem key={u.id} value={String(u.id)}>
                              {u.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <SoloEdicion>
                    <CrearUnidadPopover
                      className="rounded-l-none border-l-0"
                      instrumentoLabel={instrumentoLabel}
                      gradoId={form.getFieldValue("gradoId")}
                      asignaturaId={form.getFieldValue("asignaturaId")}
                      disabled={disabled || !hasGradoAsignatura}
                      onCreate={async (data) => {
                        // La unidad ya existe con id real cuando se asigna; hereda Grado/Asignatura de la actividad.
                        const nueva = await onCrearUnidad({
                          ...data,
                          gradoId: form.getFieldValue("gradoId"),
                          grado,
                          asignaturaId: form.getFieldValue("asignaturaId"),
                          asignatura,
                        })
                        field.handleChange({ id: nueva.id, nombre: nueva.nombre })
                      }}
                    />
                    </SoloEdicion>
                  </div>
                )}
              </form.Field>
            )
          }}
        </form.Subscribe>
    </>
  )
}

/**
 * Ficha de la unidad elegida + checkboxes de evidencias de sus enunciados. Lee la unidad
 * vía `form.Subscribe`; objetivos/contenidos salen del detalle (el listado puede no traerlos).
 */
export function UnidadSection({
  form,
  unidades,
  readOnly = false,
}: {
  form: FormActividad
  unidades: UnidadTematica[]
  readOnly?: boolean
}) {
  return (
    <form.Subscribe selector={(state) => state.values.unidad}>
      {(unidad) => {
        const seleccionada = unidades.find((u) => u.id === unidad.id)
        if (!seleccionada) return null
        return (
          <form.Field name="evidenciasIds">
            {(evidenciasField) => (
              <form.Field name="criteriosUnidadIds">
                {(criteriosField) => (
                  <UnidadFichaYEvidencias
                    unidadId={seleccionada.id}
                    nombreFallback={seleccionada.nombre}
                    seleccionadas={evidenciasField.state.value}
                    onToggle={(evidenciaId) => {
                      if (readOnly) return
                      const actual = evidenciasField.state.value
                      evidenciasField.handleChange(
                        actual.includes(evidenciaId)
                          ? actual.filter((id) => id !== evidenciaId)
                          : [...actual, evidenciaId],
                      )
                    }}
                    disabled={readOnly}
                    criteriosSeleccionados={criteriosField.state.value}
                    onToggleCriterio={(criterioId) => {
                      if (readOnly) return
                      const actual = criteriosField.state.value
                      criteriosField.handleChange(
                        actual.includes(criterioId)
                          ? actual.filter((id) => id !== criterioId)
                          : [...actual, criterioId],
                      )
                    }}
                  />
                )}
              </form.Field>
            )}
          </form.Field>
        )
      }}
    </form.Subscribe>
  )
}

/** Separado de `UnidadSection` para llamar sus hooks de forma incondicional. */
function UnidadFichaYEvidencias({
  unidadId,
  nombreFallback,
  seleccionadas,
  onToggle,
  criteriosSeleccionados,
  onToggleCriterio,
  disabled = false,
}: {
  disabled?: boolean
  unidadId: number
  nombreFallback: string
  seleccionadas: number[]
  onToggle: (evidenciaId: number) => void
  criteriosSeleccionados: number[]
  onToggleCriterio: (criterioId: number) => void
}) {
  const { data: unidad } = useUnidadDetalleQuery(unidadId)
  // `unidad.criterios` llega vacío del backend real: se piden aparte.
  const { data: criterios = [] } = useUnidadCriteriosQuery(unidadId)
  // Árbol de enunciados + evidencias ya acotado a los relacionados con esta unidad.
  const { data: referente } = useUnidadReferenteQuery(unidadId)
  const { data: unidadTabs } = useUnidadesTabsQuery()
  // Por `referente.id`, no por `gradoId`: el título debe coincidir con las etiquetas de este referente.
  const instrumentoLabel = instrumentoLabelFromReferente(referente?.id ?? undefined, unidadTabs, UNIDAD_TAB_FALLBACK)

  return (
    <div className="flex flex-col gap-4">
      <UnidadFicha
        instrumentoLabel={instrumentoLabel}
        nombre={unidad?.nombre ?? nombreFallback}
        descripcion={unidad?.descripcion ?? ""}
        objetivos={unidad?.objetivos ?? []}
        contenidos={unidad?.contenidos ?? []}
      />
      {referente && referente.enunciados.length > 0 && (
        <EnunciadosEvidenciasChecklist
          instrumentoLabel={instrumentoLabel}
          nivel1Etiqueta={referente.nivel1Etiqueta}
          nivel2Etiqueta={referente.nivel2Etiqueta}
          enunciados={referente.enunciados}
          seleccionadas={seleccionadas}
          onToggle={onToggle}
          disabled={disabled}
        />
      )}
      {criterios.length > 0 && (
        <CriteriosUnidadChecklist
          criterios={criterios}
          seleccionados={criteriosSeleccionados}
          onToggle={onToggleCriterio}
          disabled={disabled}
        />
      )}
    </div>
  )
}
