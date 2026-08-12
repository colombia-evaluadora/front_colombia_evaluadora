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
    return(
        <>
            <FormSectionHeading>
                Datos de contacto
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.email") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
                    <Input
                        id="establishment-email"
                        placeholder="Ingresar correo electrónico"
                        value={value.email}
                        aria-invalid={isInvalid("contact.email")}
                        onChange={(event) => onChange({ ...value, email: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
                    <Input
                        id="establishment-website"
                        placeholder="Ingresar página web"
                        value={value.website}
                        onChange={(event) => onChange({ ...value, website: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.phone") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
                    <Input
                        id="establishment-phone"
                        placeholder="Ingresar teléfono"
                        value={value.phone}
                        aria-invalid={isInvalid("contact.phone")}
                        onChange={(event) => onChange({ ...value, phone: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="establishment-fax">fax</FieldLabel>
                    <Input
                        id="establishment-fax"
                        placeholder="Ingresar fax"
                        value={value.fax ?? ""}
                        onChange={(event) => onChange({ ...value, fax: event.target.value })}
                    />
                </Field>

            </div>
        </>
    )
}