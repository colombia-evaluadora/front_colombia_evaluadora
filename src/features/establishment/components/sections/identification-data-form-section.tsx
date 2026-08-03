import { useState } from "react"

import {
    FileUpload,
    FileUploadDropzone,
    FileUploadItem,
    FileUploadItemDelete,
    FileUploadItemMetadata,
    FileUploadItemPreview,
    FileUploadList,
    FileUploadTrigger,
} from "@/components/ui/file-upload"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ShieldIcon } from "@/components/ui/icons"
import { FormSectionHeading } from "@/components/form-section-heading"
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
                <div className="row-span-2">
                    <FileUpload
                        value={shield ? [shield] : []}
                        onValueChange={(files) => setShield(files[0] ?? null)}
                        accept="image/*"
                        maxFiles={1}
                        className="w-full"
                    >
                        {shield ? (
                            <FileUploadList orientation="vertical">
                                <FileUploadItem value={shield} orientation="horizontal" size="sm" className="w-full">
                                    <FileUploadItemPreview className="size-16 shrink-0" />
                                    <FileUploadItemMetadata size="sm" />
                                    <FileUploadItemDelete
                                        aria-label="Eliminar escudo"
                                        onClick={(event) => event.stopPropagation()}
                                    />
                                </FileUploadItem>
                            </FileUploadList>
                        ) : (
                            <FileUploadDropzone className="h-32 w-full p-2">
                                <Avatar className="size-12">
                                    <AvatarFallback>
                                        <ShieldIcon />
                                    </AvatarFallback>
                                </Avatar>
                                <FileUploadTrigger
                                    render={
                                        <Button variant="outline" color="muted" size="xs">
                                            Subir escudo
                                        </Button>
                                    }
                                />
                            </FileUploadDropzone>
                        )}
                    </FileUpload>
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