import { IdentificationDataFormSection } from "../sections/identification-data-form-section"
import { DomicilioDataFormSection } from "../sections/domicilio-data-form-section"
import { ContactDataFormSection } from "../sections/contact-data-form-section"
import { ComplementaryDataFormSection } from "../sections/complementary-data-form-section"

export function EstablishmentDetailsForm() {
    return (
        <div className="grid grid-cols-1 gap-6">
            <IdentificationDataFormSection />
            <DomicilioDataFormSection />
            <ContactDataFormSection />
            <ComplementaryDataFormSection />
        </div>
    )
}
