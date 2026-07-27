import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
            <h3 className="text-base font-semibold">
                Datos de contacto
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("contact.email") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
                    <Input
                        id="establishment-email"
                        placeholder="iesfa@sanfrancisco.com"
                        value={value.email}
                        aria-invalid={isInvalid("contact.email")}
                        onChange={(event) => onChange({ ...value, email: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
                    <Input
                        id="establishment-website"
                        placeholder="www.sanfrancisco.com"
                        value={value.website}
                        onChange={(event) => onChange({ ...value, website: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("contact.phone") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
                    <Input
                        id="establishment-phone"
                        placeholder="3160474000"
                        value={value.phone}
                        aria-invalid={isInvalid("contact.phone")}
                        onChange={(event) => onChange({ ...value, phone: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-fax">fax</FieldLabel>
                    <Input
                        id="establishment-fax"
                        placeholder="3323879"
                        value={value.fax ?? ""}
                        onChange={(event) => onChange({ ...value, fax: event.target.value })}
                    />
                </Field>

            </div>
        </>
    )
}