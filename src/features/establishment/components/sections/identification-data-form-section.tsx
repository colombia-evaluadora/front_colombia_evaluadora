import { useState } from "react"

import { FormSectionHeading } from "@/components/form-section-heading"
import { ImageUploadField } from "@/components/image-upload-field"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CATALOGS } from "@/lib/catalogs"
import { useCatalogQuery } from "../../api/query/use-catalogs"
import type { CatalogItem } from "../../api/types/catalog"
import type { EstablishmentDetails } from "../../api/types/establishment"

interface IdentificationDataFormSectionProps {
    value: EstablishmentDetails["basicInfo"]
    onChange: (value: EstablishmentDetails["basicInfo"]) => void
    invalidFields?: string[]
    showValidation?: boolean
}

export function IdentificationDataFormSection({ value, onChange, invalidFields = [], showValidation = false }: IdentificationDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    const { data: legalTypes = []} = useCatalogQuery<CatalogItem>(CATALOGS.LEGAL_TYPES)
    const legalTypeItems = legalTypes.map(item => ({ value: item.id, label: item.name }))

    // Escudo del establecimiento: estado puramente UI, análogo a la foto
    // de la persona. No se persiste todavía en el modelo `basicInfo`, así
    // que solo mantenemos el archivo vivo mientras la sección está montada.
    const [shield, setShield] = useState<File | null>(null)

    return (
        <>
            <FormSectionHeading>
                Datos de identificación
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/*
                    El escudo ocupa una sola columna y se estira a lo alto de las
                    dos filas de campos que tiene al lado, de ahí el `row-span-2`
                    más el `h-full` que lo propaga hasta el dropzone.
                */}
                {/*
                    En `md` el contenido va absoluto: así la celda no aporta
                    altura propia y las dos filas del grid las miden solo los
                    campos. El escudo se estira a ese alto exacto en vez de
                    empujar las filas y abrir hueco entre los inputs.
                */}
                <div className="relative md:row-span-2">
                    <div className="md:absolute md:inset-0">
                        <ImageUploadField
                            value={shield}
                            onValueChange={setShield}
                            description="para cargar el escudo o logo del establecimiento"
                            deleteLabel="Eliminar escudo"
                        />
                    </div>
                </div>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.name") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-name">Nombre del establecimiento*</FieldLabel>
                    <Input
                        id="establishment-name"
                        placeholder="I.E. San Francisco de Asís"
                        value={value.name}
                        aria-invalid={isInvalid("basicInfo.name")}
                        onChange={(event) => onChange({ ...value, name: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.dane") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
                    <Input
                        id="establishment-dane"
                        placeholder="0000000000001"
                        value={value.dane}
                        aria-invalid={isInvalid("basicInfo.dane")}
                        onChange={(event) => onChange({ ...value, dane: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.nit") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-nit">Nit*</FieldLabel>
                    <Input
                        id="establishment-nit"
                        placeholder="000000000-1"
                        value={value.nit}
                        aria-invalid={isInvalid("basicInfo.nit")}
                        onChange={(event) => onChange({ ...value, nit: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("basicInfo.ownershipType") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-legal-type">
                        Propiedad jurídica*
                    </FieldLabel>
                    <Select
                        id="establishment-legal-type"
                        aria-invalid={isInvalid("basicInfo.ownershipType")}
                        value={value.ownershipType.id}
                        onValueChange={(selectedValue) => {
                            const option = legalTypes.find((item) => item.id === selectedValue)
                            onChange({
                                ...value,
                                ownershipType: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" },
                            })
                        }}
                        items={legalTypeItems}
                    >
                        <SelectTrigger aria-invalid={isInvalid("basicInfo.ownershipType")}>
                            <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>

                        <SelectContent>
                            {legalTypeItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>
            </div>
        </>
    )
}