import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
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
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-name">Nombre de la sede *</FieldLabel>
        <Input
          id="campus-name"
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="I.E. San Francisco de Asís"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-dane">Código DANE antiguo de la sede *</FieldLabel>
        <Input
          id="campus-dane"
          value={value.dane}
          onChange={(event) => onChange({ ...value, dane: event.target.value })}
          placeholder="27921853"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-zone">Zona *</FieldLabel>
        <Select
          value={value.zone.id}
          onValueChange={(selectedValue) => {
            const option = zones.find((item) => item.id === selectedValue)
            onChange({
              ...value,
              zone: option ?? { id: selectedValue, code: selectedValue, name: selectedValue },
            })
          }}
        >
          <SelectTrigger id="campus-zone">
            <SelectValue placeholder="Seleccione zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {zones.map((zone) => (
                <SelectItem key={zone.id} value={zone.id}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-neighborhood">Barrio</FieldLabel>
        <Input
          id="campus-neighborhood"
          value={value.neighborhood}
          onChange={(event) => onChange({ ...value, neighborhood: event.target.value })}
          placeholder="Villa Tita"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-commune">Comuna</FieldLabel>
        <Input
          id="campus-commune"
          value={value.commune}
          onChange={(event) => onChange({ ...value, commune: event.target.value })}
          placeholder="20"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-address">Dirección de la sede</FieldLabel>
        <Input
          id="campus-address"
          value={value.address}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          placeholder="Calle 56 No. 16 - 18"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-phone">Teléfono de la sede</FieldLabel>
        <Input
          id="campus-phone"
          value={value.phone}
          onChange={(event) => onChange({ ...value, phone: event.target.value })}
          placeholder="6042690520"
        />
      </Field>

      <Field orientation="vertical" className="w-full">
        <FieldLabel htmlFor="campus-approval-resolution">Resolución de aprobación</FieldLabel>
        <Input
          id="campus-approval-resolution"
          value={value.approvalResolution}
          onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
          placeholder="0035"
        />
      </Field>
    </div>
  )
}