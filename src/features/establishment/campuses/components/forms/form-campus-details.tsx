import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { CampusDraft } from "@/features/establishment/campuses/api/types/campus"

interface CampusDetailsFormProps {
  value: CampusDraft
  zones: CatalogItem[]
  onChange: (next: CampusDraft) => void
  /** Mensaje de error por ruta de campo; lo llena el diálogo al guardar. */
  errors?: Record<string, string>
}

export function CampusDetailsForm({ value, zones, onChange, errors = {} }: CampusDetailsFormProps) {
  const zoneLabels = Object.fromEntries(zones.map((zone) => [zone.id, zone.name]))

  return (
    // `gap-x-4 gap-y-2`: mismo ritmo que los formularios de establecimiento —
    // aire entre columnas, filas pegadas.
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
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
        <Select
          items={zoneLabels}
          value={value.zone?.id ?? null}
          onValueChange={(selectedValue) => {
            const option = zones.find((item) => item.id === selectedValue)
            if (option) onChange({ ...value, zone: option })
          }}
        >
          <SelectTrigger id="campus-zone" size="sm" aria-invalid={Boolean(errors["zone"])}>
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-approval-resolution">Resolución de aprobación</FieldLabel>
        <Input
          id="campus-approval-resolution"
          size="sm"
          value={value.approvalResolution}
          onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
          placeholder="Agregar"
        />
      </Field>
    </div>
  )
}
