import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { toDigitsOnly } from "@/lib/text-input"
import { toTelefonoInput } from "@/features/establishment/shared/person-field-rules"
import {
  toDireccionInput,
  toTextoInput,
  toUbicacionInput,
} from "@/features/establishment/shared/text-field-rules"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type {
  CampusDetailInfo,
  CampusDraft,
  EstablishmentOption,
} from "@/features/establishment/campuses/api/types/campus"

interface CampusDetailsFormProps {
  value: CampusDraft
  zones: CatalogItem[]
  onChange: (next: CampusDraft) => void
  /** Mensaje de error por ruta de campo; lo llena el diálogo al guardar. */
  errors?: Record<string, string>
  /**
   * `FK_TESTABLECIMIENTO` es obligatorio al crear e inmutable después — el
   * selector solo tiene sentido en alta, así que el diálogo no lo pasa en
   * edición.
   */
  establishmentPicker?: {
    establishments: EstablishmentOption[]
  }
  /** Solo en edición: lo que se muestra sin dejar editar (EE, consecutivo, calculados). */
  info?: CampusDetailInfo
}

/** Campo que se ve pero no se edita: mismo aspecto que el resto, deshabilitado. */
function ReadOnlyField({
  id,
  label,
  value,
  description,
}: {
  id: string
  label: string
  value: string
  description?: string
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="w-full">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} size="sm" value={value} disabled readOnly />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

export function CampusDetailsForm({
  value,
  zones,
  onChange,
  errors = {},
  establishmentPicker,
  info,
}: CampusDetailsFormProps) {
  const zoneLabels = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]))
  const establishmentLabels = establishmentPicker
    ? Object.fromEntries(establishmentPicker.establishments.map((item) => [item.id, item.name]))
    : {}

  /** Campo de texto opcional con su mensaje de error. */
  const textField = (
    key: "locality" | "commune" | "neighborhood" | "address" | "phone" | "georeference",
    id: string,
    label: string,
    props: {
      maxLength: number
      clean: (raw: string) => string
      inputMode?: "numeric" | "decimal" | "tel"
      description?: string
      placeholder?: string
    },
  ) => (
    <Field
      orientation="vertical"
      variant="outlined"
      className="w-full"
      data-invalid={errors[key] ? "true" : undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        size="sm"
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        value={value[key] ?? ""}
        aria-invalid={Boolean(errors[key])}
        onChange={(event) => onChange({ ...value, [key]: props.clean(event.target.value) })}
        placeholder={props.placeholder ?? "Agregar"}
      />
      {errors[key] ? (
        <FieldError>{errors[key]}</FieldError>
      ) : props.description ? (
        <FieldDescription>{props.description}</FieldDescription>
      ) : null}
    </Field>
  )

  return (
    <div className="grid gap-4">
      {/* `gap-x-4 gap-y-2`: mismo ritmo que los formularios de establecimiento —
          aire entre columnas, filas pegadas. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        {establishmentPicker && (
          <Field
            orientation="vertical"
            variant="outlined"
            className="w-full"
            data-invalid={errors["establishmentId"] ? "true" : undefined}
          >
            <FieldLabel htmlFor="campus-establishment">Establecimiento educativo *</FieldLabel>
            <ComboboxField
              items={establishmentLabels}
              value={value.establishmentId}
              onValueChange={(selectedValue) => onChange({ ...value, establishmentId: selectedValue ?? null })}
            >
              <ComboboxFieldTrigger id="campus-establishment" size="sm" aria-invalid={Boolean(errors["establishmentId"])}>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {establishmentPicker.establishments.map((item) => (
                  <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                    {item.name}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{errors["establishmentId"]}</FieldError>
          </Field>
        )}

        {/* En edición el EE y el consecutivo se ven pero no cambian: el EE es
            inmutable y el consecutivo lo asigna el back al crear la sede. */}
        {info && (
          <>
            <ReadOnlyField id="campus-establishment-name" label="Establecimiento educativo" value={info.establishmentName} />
            <ReadOnlyField id="campus-consecutive" label="Consecutivo de la sede" value={info.consecutive} />
          </>
        )}

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["name"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="campus-name">Nombre de la sede *</FieldLabel>
          <Input
            id="campus-name"
            size="sm"
            // TSEDE.NOMBRE es VARCHAR(130).
            maxLength={130}
            value={value.name}
            aria-invalid={Boolean(errors["name"])}
            onChange={(event) => onChange({ ...value, name: toTextoInput(event.target.value).toUpperCase() })}
            placeholder="Agregar"
          />
          <FieldError>{errors["name"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["dane"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="campus-dane">Código DANE antiguo de la sede *</FieldLabel>
          <Input
            id="campus-dane"
            size="sm"
            // Mismo criterio que el DANE del establecimiento: solo números, sin
            // letras, máximo 12 caracteres.
            inputMode="numeric"
            maxLength={12}
            value={value.dane}
            aria-invalid={Boolean(errors["dane"])}
            onChange={(event) => onChange({ ...value, dane: toDigitsOnly(event.target.value, 12) })}
            placeholder="Agregar"
          />
          <FieldError>{errors["dane"]}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={errors["zone"] ? "true" : undefined}
        >
          <FieldLabel htmlFor="campus-zone">Zona *</FieldLabel>
          <ComboboxField
            items={zoneLabels}
            value={value.zone?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = zones.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, zone: option })
            }}
          >
            <ComboboxFieldTrigger id="campus-zone" size="sm" aria-invalid={Boolean(errors["zone"])}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {zones.map((item) => (
                <ComboboxFieldItem key={item.id} value={item.id}>
                  {item.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errors["zone"]}</FieldError>
        </Field>

        {/* TSEDE.LOCALIDAD, COMUNA, BARRIO y DIRECCION son VARCHAR(130). */}
        {textField("locality", "campus-locality", "Localidad", { maxLength: 130, clean: (v) => toTextoInput(v) })}
        {textField("commune", "campus-commune", "Comuna", { maxLength: 130, clean: (v) => toTextoInput(v) })}
        {textField("neighborhood", "campus-neighborhood", "Barrio", { maxLength: 130, clean: (v) => toTextoInput(v) })}
        {textField("address", "campus-address", "Dirección de la sede", { maxLength: 130, clean: (v) => toDireccionInput(v) })}
        {/* De 7 a 15 dígitos con + opcional, como el del establecimiento. */}
        {textField("phone", "campus-phone", "Teléfono de la sede", {
          maxLength: 16,
          inputMode: "tel",
          clean: toTelefonoInput,
        })}
        {textField("georeference", "campus-georeference", "Ubicación de la sede", {
          maxLength: 60,
          inputMode: "decimal",
          clean: (v) => toUbicacionInput(v),
          placeholder: "Latitud, longitud",
          description: "Coordenadas en grados decimales, ej. 4.7110, -74.0721.",
        })}
      </div>

      {info && (
        <div className="grid gap-2">
          <FormSectionHeading>Información calculada</FormSectionHeading>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
            <Field orientation="vertical" variant="outlined" className="w-full">
              <FieldLabel htmlFor="campus-work-schedules">Jornadas</FieldLabel>
              <Input
                id="campus-work-schedules"
                size="sm"
                value={info.workSchedules.length > 0 ? info.workSchedules.join(", ") : "Sin periodos académicos"}
                disabled
                readOnly
              />
              <FieldDescription>Se definen en Periodos académicos.</FieldDescription>
            </Field>
            <ReadOnlyField
              id="campus-attends-disability"
              label="Población con discapacidad"
              value={info.attendsDisability ? "Sí atiende" : "No atiende"}
              description="Con discapacidad, trastorno o condición."
            />
            <ReadOnlyField
              id="campus-attends-victims"
              label="Población víctima del conflicto"
              value={info.attendsConflictVictims ? "Sí atiende" : "No atiende"}
              description="Desplazada o desmovilizada del conflicto armado."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Calculado con las matrículas del año lectivo más reciente de la sede.
          </p>
        </div>
      )}
    </div>
  )
}
