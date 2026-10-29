import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { IdentificationDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/identification-data-section"
import { DomicilioDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/domicilio-data-section"
import { ContactDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/contact-data-section"
import { ComplementaryDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/complementary-data-section"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"

interface EstablishmentDetailsFormProps {
    value: EstablishmentDetails
    onChange: (next: EstablishmentDetails) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo (`basicInfo.name`, …). */
    errors?: Record<string, string>
    showValidation?: boolean
    /** Escudo elegido y todavía sin subir; lo manda la página al guardar. */
    shield: File | null
    onShieldChange: (file: File | null) => void
}

const SECCIONES = ["identificacion", "domicilio", "contacto", "complementaria"]

/** Caret a la izquierda del título, como el acordeón de afuera. */
const triggerClassName =
  "flex-row-reverse justify-end items-center gap-2 py-3 text-base **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-4"

/**
 * Los cuatro bloques del establecimiento, cada uno en su acordeón y todos
 * abiertos al entrar. `keepMounted`: cerrar uno no desmonta sus campos, así que
 * no pierden lo escrito ni el foco de validación.
 */
export function EstablishmentDetailsForm({ value, onChange, invalidFields = [], errors = {}, showValidation = false, shield, onShieldChange }: EstablishmentDetailsFormProps) {
    const comunes = { invalidFields, errors, showValidation }
    // El detalle trae la naturaleza solo con su id: el sector sale del catálogo.
    const { data: legalTypes = [] } = useOwnershipTypesQuery()
    const sector = legalTypes.find((item) => item.id === value.basicInfo.ownershipType?.id)?.sector ?? ""
    const secciones = [
        {
            key: "identificacion",
            titulo: "Datos de identificación",
            contenido: (
                <IdentificationDataFormSection
                    {...comunes}
                    value={value.basicInfo}
                    onChange={(basicInfo) => onChange({ ...value, basicInfo })}
                    shield={shield}
                    onShieldChange={onShieldChange}
                />
            ),
        },
        {
            key: "domicilio",
            titulo: "Domicilio",
            contenido: (
                <DomicilioDataFormSection {...comunes} value={value.address} onChange={(address) => onChange({ ...value, address })} />
            ),
        },
        {
            key: "contacto",
            titulo: "Datos de contacto",
            contenido: (
                <ContactDataFormSection {...comunes} value={value.contact} onChange={(contact) => onChange({ ...value, contact })} />
            ),
        },
        {
            key: "complementaria",
            titulo: "Información complementaria",
            contenido: (
                <ComplementaryDataFormSection
                    {...comunes}
                    value={value.additionalInfo}
                    sector={sector}
                    onChange={(additionalInfo) => onChange({ ...value, additionalInfo })}
                />
            ),
        },
    ]

    return (
        <Accordion multiple defaultValue={SECCIONES} keepMounted className="gap-4">
            {secciones.map((seccion) => (
                <AccordionItem key={seccion.key} value={seccion.key} className="rounded-lg border border-border bg-card not-last:border-b">
                    <AccordionTrigger className={triggerClassName}>{seccion.titulo}</AccordionTrigger>
                    <AccordionContent>
                        <div className="-mx-4 border-t border-border px-4 pt-4">{seccion.contenido}</div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    )
}
