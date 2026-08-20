import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CampusDraft, EstablishmentOption } from "@/features/establishment/campuses/api/types/campus"

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
}

export function CampusDetailsForm({
  value,
  zones,
  onChange,
  errors = {},
  establishmentPicker,
}: CampusDetailsFormProps) {
  const zoneLabels = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]))
  const establishmentLabels = establishmentPicker
    ? Object.fromEntries(establishmentPicker.establishments.map((item) => [item.id, item.name]))
    : {}

  return (
    // `gap-x-4 gap-y-2`: mismo ritmo que los formularios de establecimiento —
    // aire entre columnas, filas pegadas.
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
          value={value.name}
          aria-invalid={Boolean(errors["name"])}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
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
          value={value.dane}
          aria-invalid={Boolean(errors["dane"])}
          onChange={(event) => onChange({ ...value, dane: event.target.value })}
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

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-neighborhood">Barrio</FieldLabel>
        <Input
          id="campus-neighborhood"
          size="sm"
          value={value.neighborhood}
          onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-commune">Comuna</FieldLabel>
        <Input
          id="campus-commune"
          size="sm"
          value={value.commune}
          onChange={(event) => onChange({ ...value, commune: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-address">Dirección de la sede</FieldLabel>
        <Input
          id="campus-address"
          size="sm"
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-phone">Teléfono de la sede</FieldLabel>
        <Input
          id="campus-phone"
          size="sm"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
          placeholder="Agregar"
        />
      </Field>
    </div>
  )
}
