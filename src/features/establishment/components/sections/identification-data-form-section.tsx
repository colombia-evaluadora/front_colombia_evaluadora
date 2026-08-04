import { useEffect, useState } from "react"

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentContent,
    AttachmentDescription,
    AttachmentMedia,
    AttachmentTitle,
} from "@/components/ui/attachment"
import { FileUpload, FileUploadDropzone } from "@/components/ui/file-upload"
import { ImageIcon, XIcon } from "@/components/ui/icons"
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

// Formatos y tamaño del escudo: van juntos acá porque el texto de ayuda del
// dropzone ("JPG, PNG o SVG · Máximo 2 MB") tiene que decir lo mismo que valida
// `FileUpload`.
const SHIELD_ACCEPT = "image/jpeg,image/png,image/svg+xml"
const SHIELD_MAX_SIZE = 2 * 1024 * 1024

// "PNG · 820 KB". El formato sale del MIME type y no de la extensión del
// nombre, que el usuario puede haber escrito en minúsculas o cambiado.
function describeShield(file: File) {
    const format = (file.type.split("/")[1] ?? "").replace("svg+xml", "svg").toUpperCase()
    const size =
        file.size < 1024 * 1024
            ? `${Math.round(file.size / 1024)} KB`
            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`

    return format ? `${format} · ${size}` : size
}

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

    // La vista previa necesita una URL: se revoca al cambiar de archivo o al
    // desmontar para no filtrar el blob.
    const [shieldPreview, setShieldPreview] = useState<string | null>(null)
    useEffect(() => {
        if (!shield) {
            setShieldPreview(null)
            return
        }

        const url = URL.createObjectURL(shield)
        setShieldPreview(url)

        return () => URL.revokeObjectURL(url)
    }, [shield])

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
                <div className="md:row-span-2">
                    <FileUpload
                        value={shield ? [shield] : []}
                        onValueChange={(files) => setShield(files[0] ?? null)}
                        accept={SHIELD_ACCEPT}
                        maxFiles={1}
                        maxSize={SHIELD_MAX_SIZE}
                        className="h-full w-full"
                    >
                        {shield ? (
                            // La tarjeta llena la misma caja que ocupaba el dropzone en
                            // vez de quedar en el ancho fijo de `orientation="vertical"`
                            // (`w-30`), de ahí los `w-full` —incluido el del `has-*`, que
                            // gana por especificidad si no se lo pisa explícitamente.
                            <Attachment
                                orientation="vertical"
                                // `flex-nowrap` porque la variante trae `flex-wrap`, y en
                                // columna con alto fijo eso parte el contenido en dos.
                                className="h-full min-h-40 w-full flex-nowrap has-data-[slot=attachment-content]:w-full"
                            >
                                {/*
                                    El alto lo pone la fila, no la imagen: se saca el
                                    `aspect-square` y el medio se estira con `flex-1`.
                                    `object-contain` porque un escudo recortado pierde
                                    sentido, a diferencia de una foto.
                                */}
                                <AttachmentMedia
                                    variant="image"
                                    className="aspect-auto min-h-0 w-full flex-1 *:[img]:aspect-auto *:[img]:h-full *:[img]:object-contain"
                                >
                                    {shieldPreview ? (
                                        <img src={shieldPreview} alt={`Escudo: ${shield.name}`} />
                                    ) : null}
                                </AttachmentMedia>
                                <AttachmentContent>
                                    <AttachmentTitle>{shield.name}</AttachmentTitle>
                                    <AttachmentDescription>
                                        {describeShield(shield)}
                                    </AttachmentDescription>
                                </AttachmentContent>
                                <AttachmentActions>
                                    <AttachmentAction
                                        aria-label="Eliminar escudo"
                                        onClick={() => setShield(null)}
                                    >
                                        <XIcon />
                                    </AttachmentAction>
                                </AttachmentActions>
                            </Attachment>
                        ) : (
                            // El área completa dispara el selector de archivos (el propio
                            // `FileUploadDropzone` maneja click, drop y Enter/Espacio), así
                            // que acá no va un botón aparte: el "clic aquí" del título es
                            // solo la señal visual de esa afordancia.
                            <FileUploadDropzone className="h-full min-h-40 w-full gap-3 rounded-lg bg-muted/20 px-4 py-6">
                                <ImageIcon className="size-10 shrink-0 text-muted-foreground" />
                                {/*
                                    Los tres textos van en un bloque propio: el `gap`
                                    del dropzone separa el ícono del texto, y acá
                                    adentro el interlineado es apretado para que se
                                    lean como un solo párrafo centrado.
                                */}
                                <div className="space-y-1">
                                    <p className="text-sm leading-snug font-semibold text-balance">
                                        Arrastra y suelta o <span className="text-primary">haz clic aquí</span>
                                    </p>
                                    <p className="text-xs leading-snug font-medium text-balance">
                                        para cargar el escudo o logo del establecimiento
                                    </p>
                                    <p className="text-[11px] leading-snug text-muted-foreground">
                                        JPG, PNG o SVG · Máximo 2 MB
                                    </p>
                                </div>
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