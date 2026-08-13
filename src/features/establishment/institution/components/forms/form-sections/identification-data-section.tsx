import { useState } from "react"

import { FormSectionHeading } from "@/components/form-section-heading"
import { ImageUploadField } from "@/components/image-upload-field"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { CATALOGS } from "@/lib/catalogs"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface IdentificationDataFormSectionProps {
    value: EstablishmentDetails["basicInfo"]
    onChange: (value: EstablishmentDetails["basicInfo"]) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
}

export function IdentificationDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false }: IdentificationDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const { data: legalTypes = []} = useCatalogQuery<CatalogItem>(CATALOGS.LEGAL_TYPES)
    const legalTypeItems = legalTypes.map(item => ({ value: item.id, label: item.name }))

    // Escudo del establecimiento: estado puramente UI, análogo a la foto
    // de la persona. No se persiste todavía en el modelo `basicInfo`, así
    // que solo mantenemos el archivo vivo mientras la sección está montada.
    const [shield, setShield] = useState<File | null>(null)

    // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
    // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
    return (
        <div className="grid gap-2">
            <FormSectionHeading>
                Datos de identificación
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
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
                        placeholder="Agregar"
                        value={value.name}
                        aria-invalid={isInvalid("basicInfo.name")}
                        onChange={(event) => onChange({ ...value, name: event.target.value })}
                    />
                    <FieldError>{errorFor("basicInfo.name")}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.dane") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
                    <Input
                        id="establishment-dane"
                        placeholder="Agregar"
                        value={value.dane}
                        aria-invalid={isInvalid("basicInfo.dane")}
                        onChange={(event) => onChange({ ...value, dane: event.target.value })}
                    />
                    <FieldError>{errorFor("basicInfo.dane")}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.nit") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-nit">Nit*</FieldLabel>
                    <Input
                        id="establishment-nit"
                        placeholder="Agregar"
                        value={value.nit}
                        aria-invalid={isInvalid("basicInfo.nit")}
                        onChange={(event) => onChange({ ...value, nit: event.target.value })}
                    />
                    <FieldError>{errorFor("basicInfo.nit")}</FieldError>
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
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>

                        <SelectContent>
                            {legalTypeItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError>{errorFor("basicInfo.ownershipType")}</FieldError>
                </Field>
            </div>
        </div>
    )
}