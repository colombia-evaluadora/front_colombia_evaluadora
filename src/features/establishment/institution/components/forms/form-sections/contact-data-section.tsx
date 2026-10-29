import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { toDigitsOnly, toEmailInput } from "@/lib/text-input"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface ContactDataFormSectionProps {
    value: EstablishmentDetails["contact"]
    onChange: (value: EstablishmentDetails["contact"]) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

/** Teléfono, correo y página web. El fax ya no se muestra: el valor guardado se conserva. */
export function ContactDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: ContactDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)

    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.phone") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
                <Input
                    id="establishment-phone"
                    placeholder="Ej.: 6076543210"
                    // Un teléfono colombiano (fijo o celular) no supera los 10 dígitos.
                    inputMode="numeric"
                    maxLength={10}
                    value={value.phone}
                    aria-invalid={isInvalid("contact.phone")}
                    onChange={(event) => onChange({ ...value, phone: toDigitsOnly(event.target.value, 10) })}
                />
                <FieldError>{errorFor("contact.phone")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.email") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
                <Input
                    id="establishment-email"
                    placeholder="Ej.: contacto@iecentral.edu.co"
                    type="email"
                    // TESTABLECIMIENTO.CORREO_ELECTRONICO es VARCHAR(130).
                    maxLength={130}
                    value={value.email}
                    aria-invalid={isInvalid("contact.email")}
                    onChange={(event) => onChange({ ...value, email: toEmailInput(event.target.value) })}
                />
                <FieldError>{errorFor("contact.email")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("contact.website") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
                <Input
                    id="establishment-website"
                    placeholder="Ej.: www.iecentral.edu.co"
                    // TESTABLECIMIENTO.PAGINA_WEB es VARCHAR(130).
                    maxLength={130}
                    value={value.website}
                    aria-invalid={isInvalid("contact.website")}
                    onChange={(event) => onChange({ ...value, website: event.target.value.trim() })}
                />
                <FieldError>{errorFor("contact.website")}</FieldError>
            </Field>
        </div>
    )
}
