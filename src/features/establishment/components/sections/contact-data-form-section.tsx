import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormSectionHeading } from "@/components/form-section-heading";
import type { EstablishmentDetails } from "../../api/types/establishment"

interface ContactDataFormSectionProps {
    value: EstablishmentDetails["contact"]
    onChange: (value: EstablishmentDetails["contact"]) => void
    invalidFields?: string[]
    showValidation?: boolean
}

export function ContactDataFormSection({ value, onChange, invalidFields = [], showValidation = false }: ContactDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // `gap-2`: el mismo ritmo vertical que usa el formulario entre secciones,
    // así el encabezado, las filas y la sección siguiente van todos al mismo paso.
    return(
        <div className="grid gap-2">
            <FormSectionHeading>
                Datos de contacto
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.email") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
                    <Input
                        id="establishment-email"
                        placeholder="Agregar"
                        value={value.email}
                        aria-invalid={isInvalid("contact.email")}
                        onChange={(event) => onChange({ ...value, email: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
                    <Input
                        id="establishment-website"
                        placeholder="Agregar"
                        value={value.website}
                        onChange={(event) => onChange({ ...value, website: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.phone") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
                    <Input
                        id="establishment-phone"
                        placeholder="Agregar"
                        value={value.phone}
                        aria-invalid={isInvalid("contact.phone")}
                        onChange={(event) => onChange({ ...value, phone: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-fax">fax</FieldLabel>
                    <Input
                        id="establishment-fax"
                        placeholder="Agregar"
                        value={value.fax ?? ""}
                        onChange={(event) => onChange({ ...value, fax: event.target.value })}
                    />
                </Field>

            </div>
        </div>
    )
}