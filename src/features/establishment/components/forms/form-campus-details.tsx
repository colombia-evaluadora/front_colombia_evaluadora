import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CatalogItem } from "../../api/types/catalog"
import type { Campus } from "../../api/types/campus"

interface CampusDetailsFormProps {
  value: Campus
  zones: CatalogItem[]
  onChange: (next: Campus) => void
}

export function CampusDetailsForm({ value, zones, onChange }: CampusDetailsFormProps) {
  const zoneItems = zones.map((zone) => ({ value: zone.id, label: zone.name }))

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-name">Nombre de la sede *</FieldLabel>
        <Input
          id="campus-name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-dane">Código DANE antiguo de la sede *</FieldLabel>
        <Input
          id="campus-dane"
          value={value.dane}
          onChange={(event) => onChange({ ...value, dane: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-zone">Zona *</FieldLabel>
        <Select
          value={value.zone.id}
          onValueChange={(selectedValue) => {
            const option = zones.find((item) => item.id === selectedValue)
            onChange({
              ...value,
              zone: option ?? {
                id: selectedValue ?? "",
                code: selectedValue ?? "",
                name: selectedValue ?? "",
              },
            })
          }}
          items={zoneItems}
        >
          <SelectTrigger id="campus-zone">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {zoneItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-neighborhood">Barrio</FieldLabel>
        <Input
          id="campus-neighborhood"
          value={value.neighborhood}
          onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-commune">Comuna</FieldLabel>
        <Input
          id="campus-commune"
          value={value.commune}
          onChange={(event) => onChange({ ...value, commune: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-address">Dirección de la sede</FieldLabel>
        <Input
          id="campus-address"
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-phone">Teléfono de la sede</FieldLabel>
        <Input
          id="campus-phone"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
          placeholder="Agregar"
        />
      </Field>

      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="campus-approval-resolution">Resolución de aprobación</FieldLabel>
        <Input
          id="campus-approval-resolution"
          value={value.approvalResolution}
          onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
          placeholder="Agregar"
        />
      </Field>
    </div>
  )
}