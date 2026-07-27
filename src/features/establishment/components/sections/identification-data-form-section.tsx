import {
    Attachment,
    AttachmentMedia,
    AttachmentActions,
    AttachmentAction,
} from "@/components/ui/attachment"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectGroup,
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

    return (
        <>
            <h3 className="text-base font-semibold">
                Datos de identificación
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="row-span-2">
                    <Attachment orientation="vertical" size="sm" className="w-28">
                        <AttachmentMedia variant="image">
                            <div className="flex h-full w-full items-center justify-center bg-muted">
                                <Avatar>
                                    <AvatarFallback>Foto</AvatarFallback>
                                </Avatar>
                            </div>
                        </AttachmentMedia>
                        <AttachmentActions>
                            <AttachmentAction aria-label="Subir foto" />
                        </AttachmentActions>
                    </Attachment>
                </div>
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("basicInfo.name") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-name">Nombre del establecimiento*</FieldLabel>
                    <Input
                        id="establishment-name"
                        placeholder="I.E. San Francisco de Asís"
                        value={value.name}
                        aria-invalid={isInvalid("basicInfo.name")}
                        onChange={(event) => onChange({ ...value, name: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("basicInfo.dane") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
                    <Input
                        id="establishment-dane"
                        placeholder="0000000000001"
                        value={value.dane}
                        aria-invalid={isInvalid("basicInfo.dane")}
                        onChange={(event) => onChange({ ...value, dane: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full" data-invalid={isInvalid("basicInfo.nit") ? "true" : undefined}>
                    <FieldLabel htmlFor="establishment-nit">Nit*</FieldLabel>
                    <Input
                        id="establishment-nit"
                        placeholder="000000000-1"
                        value={value.nit}
                        aria-invalid={isInvalid("basicInfo.nit")}
                        onChange={(event) => onChange({ ...value, nit: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" data-invalid={isInvalid("basicInfo.ownershipType") ? "true" : undefined}>
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
                    >
                        <SelectTrigger aria-invalid={isInvalid("basicInfo.ownershipType")}>
                            <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectGroup>
                                {legalTypes?.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
            </div>
        </>
    )
}