import { FormSectionHeading } from "@/components/form-section-heading"
import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface IdentificationDataFormSectionProps {
    value: EstablishmentDetails["basicInfo"]
    onChange: (value: EstablishmentDetails["basicInfo"]) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
    /**
     * Escudo recién elegido, todavía sin subir. Vive en la página porque es
     * ella la que lo manda como el archivo `logo` del multipart al guardar.
     */
    shield: File | null
    onShieldChange: (file: File | null) => void
}

export function IdentificationDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false, shield, onShieldChange }: IdentificationDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const { data: legalTypes = []} = useOwnershipTypesQuery()
    const legalTypeItems = toSelectOptions(legalTypes)


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
                    El contenido va absoluto en todos los tamaños: así la celda
                    nunca aporta altura propia —ni siquiera con una imagen
                    grande cargada— y las dos filas del grid las miden solo los
                    campos. El alto lo pone la celda (`min-h` en móvil, las dos
                    filas en `md`) y el escudo se estira a ese alto exacto en
                    vez de empujar las filas y abrir hueco entre los inputs.
                */}
                <div className="relative min-h-28 md:row-span-2">
                    <div className="absolute inset-0">
                        <ImageUploadField
                            value={shield}
                            onValueChange={onShieldChange}
                            description="para cargar el escudo o logo del establecimiento"
                            deleteLabel="Eliminar escudo"
                            existingPreview={
                                value.logoArchivoId == null ? undefined : (
                                    <ArchivoImage
                                        archivoId={value.logoArchivoId}
                                        alt="Escudo del establecimiento"
                                    />
                                )
                            }
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
                        value={value.ownershipType?.id ?? null}
                        onValueChange={(selectedValue) => {
                            const option = legalTypes.find((item) => item.id === selectedValue)
                            if (option) onChange({ ...value, ownershipType: option })
                        }}
                        items={toSelectItemsMap(legalTypeItems)}
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