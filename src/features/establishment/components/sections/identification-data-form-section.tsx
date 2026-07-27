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

export function IdentificationDataFormSection() {
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
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-name">Nombre del establecimiento*</FieldLabel>
                    <Input id="establishment-name" placeholder="I.E. San Francisco de Asís" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
                    <Input id="establishment-dane" placeholder="0000000000001" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="establishment-nit">Nit*</FieldLabel>
                    <Input id="establishment-nit" placeholder="000000000-1" />
                </Field>
                <Field orientation="vertical">
                    <FieldLabel htmlFor="establishment-legal-type">
                        Propiedad jurídica*
                    </FieldLabel>
                    <Select id="establishment-legal-type">
                        <SelectTrigger>
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