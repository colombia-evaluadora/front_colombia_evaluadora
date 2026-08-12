import { IdentificationDataFormSection } from "../sections/identification-data-form-section"
import { DomicilioDataFormSection } from "../sections/domicilio-data-form-section"
import { ContactDataFormSection } from "../sections/contact-data-form-section"
import type { EstablishmentDetails } from "../../api/types/establishment"

interface EstablishmentDetailsFormProps {
    value: EstablishmentDetails
    onChange: (next: EstablishmentDetails) => void
    invalidFields?: string[]
    showValidation?: boolean
}

/**
 * Identificación, domicilio y contacto: los tres datos que describen al
 * establecimiento en sí, así que van juntos en una sola card. La información
 * complementaria es un bloque aparte —la monta la página en su propia card,
 * igual que rector y secretaria— y por eso no se arma acá.
 */
export function EstablishmentDetailsForm({ value, onChange, invalidFields = [], showValidation = false }: EstablishmentDetailsFormProps) {
    return (
        <div className="grid grid-cols-1 gap-6">
            <IdentificationDataFormSection
                value={value.basicInfo}
                onChange={(basicInfo) => onChange({ ...value, basicInfo })}
                invalidFields={invalidFields}
                showValidation={showValidation}
            />
            <DomicilioDataFormSection
                value={value.address}
                onChange={(address) => onChange({ ...value, address })}
                invalidFields={invalidFields}
                showValidation={showValidation}
            />
            <ContactDataFormSection
                value={value.contact}
                onChange={(contact) => onChange({ ...value, contact })}
                invalidFields={invalidFields}
                showValidation={showValidation}
            />
        </div>
    )
}
