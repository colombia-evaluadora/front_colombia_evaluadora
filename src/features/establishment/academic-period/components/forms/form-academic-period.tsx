import { useEffect, useRef } from "react"
import { addDays } from "date-fns"
import { useSelector } from "@tanstack/react-form"
import { isFieldInvalid, useAppForm, FormDisabledProvider } from "@/lib/forms"

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { FormSection } from "@/features/establishment/academic-period/components/fields/form-section"
import {
  asScheduleForm,
  JornadaScheduleFields,
} from "@/features/establishment/academic-period/components/fields/jornada-schedule-fields"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import {
  useAcademicPeriodStatusesQuery,
  useJornadasQuery,
} from "@/features/establishment/academic-period/api/query/catalogos-lista-valor"
import { usePredeterminadoQuery } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import {
  academicPeriodFormSchema,
  ENROLLMENT_MODALITIES,
  getModalityCycles,
  type AcademicPeriodFormInput,
  type AcademicPeriodFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { parseDateValue } from "@/lib/date-value"
import { aNumero, resolverOpcion } from "@/features/assistant/lib/campos-ui"
import { useFormularioTanstackAsistente } from "@/features/assistant/lib/formulario-tanstack"

interface AcademicPeriodFormProps {
  id: string
  defaultValues?: Partial<AcademicPeriodFormInput>
  onSubmit: (values: AcademicPeriodFormValues) => void
  onDirtyChange?: (isDirty: boolean) => void
  onValidChange?: (isValid: boolean) => void
  savedToken?: number
  /** Id del periodo en edición; sin él el formulario está creando. */
  currentPeriodId?: number
  /** Período Cerrado o en "Ver": todo el formulario en solo lectura (Regla 16). */
  readOnly?: boolean
  /** Período reabierto: el Fin no se cambia, su estado lo rige "Cerrar de nuevo el". */
  lockEndDate?: boolean
}

const EMPTY_VALUES: AcademicPeriodFormInput = {
  startDate: "",
  endDate: "",
  enrollmentDeadline: "",
  sedeId: "",
  previousPeriodId: null,
  statusId: 0,
  jornadaId: 0,
  enrollmentModality: "ANUAL",
  cycle: 1,
  reservationEnabled: false,
  defaultBlocksCount: null,
  scheduleStartTime: "",
  scheduleEndTime: "",
  breaks: [],
}

const MODALITY_OPTIONS = ENROLLMENT_MODALITIES.map((m) => ({ value: m.value, label: m.label }))

/** Bloque plegable del formulario. `keepMounted`: los campos cerrados siguen validando. */
export function AcademicPeriodForm({
  id,
  defaultValues,
  onSubmit,
  onDirtyChange,
  onValidChange,
  savedToken = 0,
  currentPeriodId,
  readOnly = false,
  lockEndDate = false,
}: AcademicPeriodFormProps) {
  const initialValues = {
    ...EMPTY_VALUES,
    ...defaultValues,
  } satisfies AcademicPeriodFormInput

  const { data: sedes = [] } = useSedeOptionsQuery()
  const { data: jornadas = [] } = useJornadasQuery()
  const { data: statusOptions = [] } = useAcademicPeriodStatusesQuery()
  const isCreating = currentPeriodId == null

  const form = useAppForm({
    defaultValues: initialValues,
    validators: {
      onChange: academicPeriodFormSchema,
      onSubmit: academicPeriodFormSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(academicPeriodFormSchema.parse(value))
    },
  })

  // UI asistida: el agente lee y rellena estos campos (nunca guarda). Estado
  // y periodo anterior quedan fuera: los calcula el sistema.
  useFormularioTanstackAsistente(form, {
    codigo: "periodo_academico",
    entidad: currentPeriodId,
    bloqueado: readOnly ? "El período está en solo lectura (cerrado o abierto en Ver)." : null,
    campos: [
      { nombre: "startDate", etiqueta: "Inicio del período académico", tipo: "date", obligatorio: true },
      {
        nombre: "endDate",
        etiqueta: "Fin del período académico",
        tipo: "date",
        obligatorio: true,
        soloLectura: lockEndDate,
      },
      { nombre: "enrollmentDeadline", etiqueta: "Fecha límite de matrícula", tipo: "date", obligatorio: true },
      {
        nombre: "sedeId",
        etiqueta: "Sede",
        tipo: "select",
        obligatorio: true,
        opciones: sedes.map((s) => ({ valor: String(s.pk_sede), etiqueta: s.nombre })),
      },
      {
        nombre: "jornadaId",
        etiqueta: "Jornada",
        tipo: "select",
        obligatorio: true,
        opciones: jornadas.map((j) => ({ valor: String(j.id), etiqueta: j.name })),
        aAgente: (v) => (v ? String(v) : ""),
        aModelo: (v) => {
          const id = resolverOpcion(
            jornadas.map((j) => ({ valor: String(j.id), etiqueta: j.name })),
            v,
          )
          return id ? Number(id) : undefined
        },
      },
      {
        nombre: "enrollmentModality",
        etiqueta: "Modalidad de matrícula",
        tipo: "select",
        obligatorio: true,
        opciones: MODALITY_OPTIONS.map((m) => ({ valor: m.value, etiqueta: m.label })),
      },
      {
        nombre: "cycle",
        etiqueta: "Ciclo (1 si la modalidad es anual)",
        tipo: "number",
        obligatorio: true,
        aModelo: (v) => {
          const n = aNumero(v)
          return n != null && Number.isInteger(n) && n >= 1 ? n : undefined
        },
      },
      { nombre: "reservationEnabled", etiqueta: "Habilitar reserva de cupos", tipo: "checkbox" },
    ],
  })

  const isDefaultValue = useSelector(form.store, (state) => state.isDefaultValue)
  const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts)

  useEffect(() => {
    onDirtyChange?.(!isDefaultValue)
  }, [isDefaultValue, onDirtyChange])

  // El estado lo calcula el sistema con las fechas (Regla 15); al crear se
  // manda "Inscripciones" para que el backend actual lo acepte.
  useEffect(() => {
    if (!isCreating || form.state.values.statusId) return
    const inscripciones = statusOptions.find((o) => o.key === "I")
    if (inscripciones) form.setFieldValue("statusId", inscripciones.id)
  }, [isCreating, statusOptions, form])

  // Al crear, jornada arranca en el predeterminado de Listas valor (si hay).
  const { data: jornadaPredeterminada } = usePredeterminadoQuery("JORNADA")
  useEffect(() => {
    if (!isCreating || !jornadaPredeterminada || form.state.values.jornadaId) return
    form.setFieldValue("jornadaId", jornadaPredeterminada.pk_lista_valor)
  }, [isCreating, jornadaPredeterminada, form])

  const isFormValid = useSelector(
    form.store,
    (state) => academicPeriodFormSchema.safeParse(state.values).success,
  )

  useEffect(() => {
    onValidChange?.(isFormValid)
  }, [isFormValid, onValidChange])

  const lastSavedToken = useRef(savedToken)
  useEffect(() => {
    if (lastSavedToken.current === savedToken) return
    lastSavedToken.current = savedToken
    form.reset(form.state.values)
  }, [form, savedToken])

  return (
    <form
      id={id}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <FormDisabledProvider disabled={readOnly}>
        <FormSection title="Datos generales">
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <form.AppField name="startDate">
              {(field) => <field.DateField label="Inicio del período académico" required />}
            </form.AppField>

            <form.Subscribe selector={(state) => state.values.startDate}>
              {(startDate) => (
                <form.AppField name="endDate">
                  {(field) => (
                    <field.DateField
                      label="Fin del período académico"
                      required
                      disabled={lockEndDate}
                      description={
                        lockEndDate ? "No se cambia mientras el período está reabierto." : undefined
                      }
                      minDate={
                        startDate ? addDays(parseDateValue(startDate) as Date, 1) : undefined
                      }
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>

            <form.Subscribe selector={(state) => state.values.endDate}>
              {(endDate) => (
                <form.AppField name="enrollmentDeadline">
                  {(field) => (
                    <field.DateField
                      label="Fecha límite de matrícula"
                      required
                      maxDate={parseDateValue(endDate)}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </div>

          <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_7rem]">
            <form.Field name="sedeId">
              {(field) => {
                const isInvalid = isFieldInvalid(field, submissionAttempts)
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Sede*</FieldLabel>
                    <ComboboxField
                      disabled={readOnly}
                      value={field.state.value || ""}
                      onValueChange={(value) => value && field.handleChange(value)}
                    >
                      <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                        <ComboboxFieldValue>
                          {(value) =>
                            sedes.find((s) => String(s.pk_sede) === value)?.nombre ?? "Seleccionar"
                          }
                        </ComboboxFieldValue>
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {sedes.map((sede) => (
                            <ComboboxFieldItem
                              key={sede.pk_sede}
                              value={String(sede.pk_sede)}
                              title={sede.nombre}
                            >
                              {sede.nombre}
                            </ComboboxFieldItem>
                          ))}
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            <form.Field name="jornadaId">
              {(field) => {
                const isInvalid = isFieldInvalid(field, submissionAttempts)
                return (
                  <Field variant="outlined" data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>Jornada*</FieldLabel>
                    <ComboboxField
                      disabled={readOnly}
                      value={field.state.value ? String(field.state.value) : ""}
                      onValueChange={(value) => value && field.handleChange(Number(value))}
                    >
                      <ComboboxFieldTrigger id={field.name} aria-invalid={isInvalid}>
                        <ComboboxFieldValue>
                          {(value) =>
                            jornadas.find((j) => String(j.id) === value)?.name ?? "Seleccionar"
                          }
                        </ComboboxFieldValue>
                      </ComboboxFieldTrigger>
                      <ComboboxFieldContent>
                        <ComboboxGroup>
                          {jornadas.map((jornada) => (
                            <ComboboxFieldItem key={jornada.id} value={String(jornada.id)}>
                              {jornada.name}
                            </ComboboxFieldItem>
                          ))}
                        </ComboboxGroup>
                      </ComboboxFieldContent>
                    </ComboboxField>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <FieldDescription>Jornadas de la sede elegida.</FieldDescription>
                    )}
                  </Field>
                )
              }}
            </form.Field>

            <form.AppField
              name="enrollmentModality"
              listeners={{
                // Con menos ciclos, el ciclo elegido puede quedar fuera de rango.
                onChange: ({ value }) => {
                  if (form.state.values.cycle > getModalityCycles(value)) {
                    form.setFieldValue("cycle", 1)
                  }
                },
              }}
            >
              {(field) => (
                <field.SelectField
                  label="Modalidad de matrícula"
                  required
                  options={MODALITY_OPTIONS}
                />
              )}
            </form.AppField>

            <form.Subscribe selector={(state) => state.values.enrollmentModality}>
              {(modality) => {
                const cycles = getModalityCycles(modality)
                const options = Array.from({ length: cycles }, (_, i) => ({
                  value: i + 1,
                  label: String(i + 1),
                }))
                return (
                  <form.AppField name="cycle">
                    {(field) => (
                      // Con Anual el ciclo siempre es 1.
                      <field.SelectField
                        label="Ciclo"
                        required
                        options={options}
                        disabled={cycles === 1}
                      />
                    )}
                  </form.AppField>
                )
              }}
            </form.Subscribe>
          </div>
        </FormSection>

        <FormSection title="Horario de la jornada">
          <JornadaScheduleFields
            form={asScheduleForm(form)}
            blocksLabel="Número de bloques de la jornada"
          />
        </FormSection>

        <FormSection title="Reserva de cupos">
          <form.Field name="reservationEnabled">
            {(field) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={field.name}
                  className="flex w-fit cursor-pointer items-center gap-3"
                >
                  <Switch
                    id={field.name}
                    checked={field.state.value}
                    disabled={readOnly}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                    className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                  />
                  <span className="text-sm">Habilitar reserva de cupos</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  Se puede activar cuando el período tenga al menos un grado con grupos y cupos.
                </p>
              </div>
            )}
          </form.Field>
        </FormSection>
      </FormDisabledProvider>
    </form>
  )
}
