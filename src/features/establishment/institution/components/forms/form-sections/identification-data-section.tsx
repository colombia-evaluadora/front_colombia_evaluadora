import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions, withSeleccione } from "@/lib/catalog-options"
import { toDigitsOnly } from "@/lib/text-input"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import { toTextoInput } from "@/features/establishment/shared/text-field-rules"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

// TESTABLECIMIENTO.NOMBRE es VARCHAR(130).
const NOMBRE_MAX = 130

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

/** "900123456-7" → número y dígito de verificación, para los dos inputs del NIT. */
function partirNit(nit: string): [string, string] {
    const [numero = "", dv = ""] = nit.split("-")
    return [numero, dv]
}

export function IdentificationDataFormSection({ value, onChange, invalidFields = [], errors = {}, showValidation = false, shield, onShieldChange }: IdentificationDataFormSectionProps) {
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const { data: legalTypes = [] } = useOwnershipTypesQuery()
    const legalTypeItems = withSeleccione(toSelectOptions(legalTypes))
    const { data: modalities = [] } = useCatalogQuery<CatalogItem>(CATALOGS.MODALIDADES_PRESTACION)
    const modalityItems = withSeleccione(toSelectOptions(modalities))

    // El detalle trae la naturaleza solo con su id: el sector sale del catálogo.
    const sector = legalTypes.find((item) => item.id === value.ownershipType?.id)?.sector ?? ""
    const [nitNumero, nitDv] = partirNit(value.nit)
    const setNit = (numero: string, dv: string) => onChange({ ...value, nit: dv ? `${numero}-${dv}` : numero })

    return (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-3">
            {/* El escudo ocupa la primera columna a lo alto de las tres filas de campos. */}
            <div className="flex flex-col gap-1.5 md:row-span-3">
                <span className="text-xs text-muted-foreground">Escudo o logo del establecimiento</span>
                <ImageUploadField
                    value={shield}
                    onValueChange={onShieldChange}
                    title="Arrastre la imagen o haga clic"
                    description={null}
                    hint="JPG, PNG o SVG · máximo 2 MB"
                    deleteLabel="Eliminar escudo"
                    error={errorFor("basicInfo.logo")}
                    className="min-h-36 flex-1"
                    existingPreview={
                        value.logoArchivoId == null ? undefined : (
                            <ArchivoImage archivoId={value.logoArchivoId} alt="Escudo del establecimiento" />
                        )
                    }
                />
            </div>

            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.name") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-name">Nombre del establecimiento*</FieldLabel>
                <div className="relative">
                    <Input
                        id="establishment-name"
                        placeholder="Agregar"
                        maxLength={NOMBRE_MAX}
                        className="pr-16"
                        value={value.name}
                        aria-invalid={isInvalid("basicInfo.name")}
                        onChange={(event) => onChange({ ...value, name: toTextoInput(event.target.value, NOMBRE_MAX) })}
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
                        {value.name.length} / {NOMBRE_MAX}
                    </span>
                </div>
                <FieldError>{errorFor("basicInfo.name")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.dane") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
                <Input
                    id="establishment-dane"
                    placeholder="Agregar"
                    inputMode="numeric"
                    maxLength={12}
                    value={value.dane}
                    aria-invalid={isInvalid("basicInfo.dane")}
                    onChange={(event) => onChange({ ...value, dane: toDigitsOnly(event.target.value, 12) })}
                />
                <FieldError>{errorFor("basicInfo.dane")}</FieldError>
            </Field>

            {/* El NIT se escribe en dos partes; se guarda junto ("900123456-7"). */}
            <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid("basicInfo.nit") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-nit">NIT*</FieldLabel>
                <div className="flex items-stretch gap-0">
                    <Input
                        id="establishment-nit"
                        placeholder="Agregar"
                        inputMode="numeric"
                        maxLength={9}
                        className="flex-1 rounded-r-none"
                        value={nitNumero}
                        aria-invalid={isInvalid("basicInfo.nit")}
                        onChange={(event) => setNit(toDigitsOnly(event.target.value, 9), nitDv)}
                    />
                    <span className="flex items-center border-y border-input px-2 text-muted-foreground">-</span>
                    <Input
                        aria-label="Dígito de verificación del NIT"
                        inputMode="numeric"
                        maxLength={1}
                        className="w-12 rounded-l-none text-center"
                        value={nitDv}
                        aria-invalid={isInvalid("basicInfo.nit")}
                        onChange={(event) => setNit(nitNumero, toDigitsOnly(event.target.value, 1))}
                    />
                </div>
                {errorFor("basicInfo.nit") ? (
                    <FieldError>{errorFor("basicInfo.nit")}</FieldError>
                ) : (
                    <FieldDescription>Número y dígito de verificación (DV)</FieldDescription>
                )}
            </Field>

            <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("basicInfo.ownershipType") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-legal-type">Naturaleza jurídica*</FieldLabel>
                <ComboboxField
                    id="establishment-legal-type"
                    aria-invalid={isInvalid("basicInfo.ownershipType")}
                    value={value.ownershipType?.id ?? null}
                    onValueChange={(selectedValue) => {
                        const option = legalTypes.find((item) => item.id === selectedValue)
                        onChange({ ...value, ownershipType: option ?? null })
                    }}
                    items={toSelectItemsMap(legalTypeItems)}
                >
                    <ComboboxFieldTrigger aria-invalid={isInvalid("basicInfo.ownershipType")}>
                        <ComboboxFieldValue placeholder="Seleccione" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                        {legalTypeItems.map((item) => (
                            <ComboboxFieldItem key={item.value} value={item.value}>
                                {item.label}
                            </ComboboxFieldItem>
                        ))}
                    </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{errorFor("basicInfo.ownershipType")}</FieldError>
            </Field>

            <Field orientation="vertical" variant="outlined" className="w-full">
                <FieldLabel htmlFor="establishment-sector">Sector</FieldLabel>
                <Input id="establishment-sector" readOnly disabled placeholder="—" value={sector} />
                <FieldDescription>Se deriva de la Naturaleza jurídica.</FieldDescription>
            </Field>

            <Field orientation="vertical" variant="outlined" data-invalid={isInvalid("basicInfo.serviceModality") ? "true" : undefined}>
                <FieldLabel htmlFor="establishment-service-modality">Modalidad de prestación del servicio*</FieldLabel>
                <ComboboxField
                    id="establishment-service-modality"
                    aria-invalid={isInvalid("basicInfo.serviceModality")}
                    value={value.serviceModality?.id ?? null}
                    onValueChange={(selectedValue) => {
                        const option = modalities.find((item) => item.id === selectedValue)
                        onChange({ ...value, serviceModality: option ?? null })
                    }}
                    items={toSelectItemsMap(modalityItems)}
                >
                    <ComboboxFieldTrigger aria-invalid={isInvalid("basicInfo.serviceModality")}>
                        <ComboboxFieldValue placeholder="Seleccione" />
                    </ComboboxFieldTrigger>
                    <ComboboxFieldContent>
                        {modalityItems.map((item) => (
                            <ComboboxFieldItem key={item.value} value={item.value}>
                                {item.label}
                            </ComboboxFieldItem>
                        ))}
                    </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{errorFor("basicInfo.serviceModality")}</FieldError>
            </Field>
        </div>
    )
}
