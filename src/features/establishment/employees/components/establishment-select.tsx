import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EstablishmentSelectProps {
  establishments: { id: number; name: string }[]
  value: number | null
  onChange: (id: number) => void
}

/** Solo para quien tiene varios establecimientos: los funcionarios se ven desde uno. */
export function EstablishmentSelect({ establishments, value, onChange }: EstablishmentSelectProps) {
  return (
    <Field orientation="vertical" variant="outlined" className="w-full max-w-sm gap-2 md:w-80">
      <FieldLabel htmlFor="funcionarios-establecimiento">Establecimiento</FieldLabel>
      <Select
        items={Object.fromEntries(establishments.map((e) => [String(e.id), e.name]))}
        value={value != null ? String(value) : null}
        onValueChange={(next) => {
          if (next) onChange(Number(next))
        }}
      >
        <SelectTrigger id="funcionarios-establecimiento" variant="outlined" size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {establishments.map((establishment) => (
            <SelectItem key={establishment.id} value={String(establishment.id)}>
              {establishment.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
