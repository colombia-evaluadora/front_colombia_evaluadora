import { Attachment, AttachmentMedia, AttachmentActions, AttachmentAction } from "@/components/ui/attachment"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
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
import type { CatalogItem } from "../../api/types/catalog"
import { useCatalogQuery } from "../../api/query/use-catalogs"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

interface UserFormProps {
    role?: EmployeeRoleCode
}

export function UserDetailsForm({ role }: UserFormProps) {
    const roleName =
        EMPLOYEE_ROLES.find((item) => item.code === role)?.name ??
        "Agregar usuario"

    const {data: documentTypes = []} = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const {data: genders = []} = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)

    return (
        <div className="grid grid-cols-1 gap-6">

            <h3 className="text-base font-semibold">
                {roleName}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Foto */}
                <div className="row-span-2">
                    <Attachment
                        orientation="vertical"
                        size="sm"
                        className="w-28"
                    >
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
                {/* Formulario */}

                <Field orientation="vertical">
                    <FieldLabel htmlFor="document-type">
                        Tipo de documento
                    </FieldLabel>

                    <Select id="document-type">
                        <SelectTrigger>
                            <SelectValue placeholder="CC cedula de ciudadanía" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {documentTypes.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="document-number">Número de documento</FieldLabel>
                    <Input id="document-number" placeholder="925557829" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-name">Primer Nombre</FieldLabel>
                    <Input id="user-name" placeholder="Fernney" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-second-name">Segundo Nombre</FieldLabel>
                    <Input id="user-second-name" placeholder="Antonio" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-last-name">Primer Apellido</FieldLabel>
                    <Input id="user-last-name" placeholder="Jaramillo" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-second-last-name">Segundo Apellido</FieldLabel>
                    <Input id="user-second-last-name" placeholder="Gomez" />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-email">Correo Electrónico</FieldLabel>
                    <Input id="user-email" placeholder="luis.diaz@gmail.com" />
                </Field>
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-password">Contraseña</FieldLabel>
                    <Input id="user-password" placeholder="••••••••" type="password" />
                </Field>
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-confirm-password">Confirmar Contraseña</FieldLabel>
                    <Input id="user-confirm-password" placeholder="••••••••" type="password" />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical">
                    <FieldLabel htmlFor="birth-date">
                        Fecha de nacimiento
                    </FieldLabel>
                    <Input
                        id=""
                        type="date"
                    />
                </Field>
                <Field orientation="vertical">
                    <FieldLabel htmlFor="gender-user">
                        Género
                    </FieldLabel>
                    <Select id="gender-user">
                        <SelectTrigger>
                            <SelectValue placeholder="Masculino" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {genders.map(item => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
                    <Input id="user-phone" placeholder="3323868" type="tel" />
                </Field>
            </div>
        </div>
    )
}