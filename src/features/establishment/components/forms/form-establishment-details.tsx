import { IdentificationDataFormSection } from "../sections/identification-data-form-section"
import { DomicilioDataFormSection } from "../sections/domicilio-data-form-section"
import { ContactDataFormSection } from "../sections/contact-data-form-section"
import type { EstablishmentDetails } from "../../api/types/establishment"

interface EstablishmentDetailsFormProps {
    value: EstablishmentDetails
    onChange: (next: EstablishmentDetails) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo (`basicInfo.name`, …). */
    errors?: Record<string, string>
    showValidation?: boolean
}

/**
 * Identificación, domicilio y contacto: los tres datos que describen al
 * establecimiento en sí, así que van juntos en una sola card. La información
 * complementaria es un bloque aparte —la monta la página en su propia card,
 * igual que rector y secretaria— y por eso no se arma acá.
 */
export function EstablishmentDetailsForm({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: EstablishmentDetailsFormProps) {
    // Dos escalas: dentro de una sección las filas van a `gap-2`, y entre
    // secciones el salto es `gap-6`, para que cada encabezado se lea como el
    // arranque de un bloque nuevo y no como una fila más.
    return (
        <div className="grid grid-cols-1 gap-6">
            <IdentificationDataFormSection
                value={value.basicInfo}
                onChange={(basicInfo) => onChange({ ...value, basicInfo })}
                invalidFields={invalidFields}
                errors={errors}
                showValidation={showValidation}
            />
            <DomicilioDataFormSection
                value={value.address}
                onChange={(address) => onChange({ ...value, address })}
                invalidFields={invalidFields}
                errors={errors}
                showValidation={showValidation}
            />
            <ContactDataFormSection
                value={value.contact}
                onChange={(contact) => onChange({ ...value, contact })}
                invalidFields={invalidFields}
                errors={errors}
                showValidation={showValidation}
            />
        </div>
    )
}
