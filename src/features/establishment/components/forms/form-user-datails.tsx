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
import type { Person } from "../../api/types/person"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

interface UserFormProps {
    role?: EmployeeRoleCode
    fieldPrefix?: string
    value: Person | null
    onChange: (person: Person | null) => void
    invalidFields?: string[]
    showValidation?: boolean
}

function createEmptyPerson(): Person {
    return {
        id: "",
        documentType: { id: "", code: "", name: "" },
        identification: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        gender: { id: "", code: "", name: "" },
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
    }
}

export function UserDetailsForm({ role, fieldPrefix = "principal", value, onChange, invalidFields = [], showValidation = false }: UserFormProps) {
    const roleName =
        EMPLOYEE_ROLES.find((item) => item.code === role)?.name ??
        "Agregar usuario"

    const {data: documentTypes = []} = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const {data: genders = []} = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
    const person = value ?? createEmptyPerson()
    const passwordsMatch = person.password === person.confirmPassword
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)

    const emitChange = (patch: Partial<Person>) => {
        onChange({ ...person, ...patch })
    }

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

                    <Select
                        id="document-type"
                        aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}
                        value={person.documentType.id}
                        onValueChange={(selectedValue) => {
                            const option = documentTypes.find((item) => item.id === selectedValue)
                            emitChange({ documentType: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                        }}
                    >
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
                    <Input
                        id="document-number"
                        placeholder="925557829"
                        value={person.identification}
                        aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
                        onChange={(event) => emitChange({ identification: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-name">Primer Nombre</FieldLabel>
                    <Input
                        id="user-name"
                        placeholder="Fernney"
                        value={person.firstName}
                        aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
                        onChange={(event) => emitChange({ firstName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-second-name">Segundo Nombre</FieldLabel>
                    <Input id="user-second-name" placeholder="Antonio" />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-last-name">Primer Apellido</FieldLabel>
                    <Input
                        id="user-last-name"
                        placeholder="Jaramillo"
                        value={person.lastName}
                        aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
                        onChange={(event) => emitChange({ lastName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" className="w-full">
                    <FieldLabel htmlFor="user-second-last-name">Segundo Apellido</FieldLabel>
                    <Input id="user-second-last-name" placeholder="Gomez" />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-email">Correo Electrónico</FieldLabel>
                    <Input
                        id="user-email"
                        placeholder="luis.diaz@gmail.com"
                        value={person.email}
                        aria-invalid={isInvalid(`${fieldPrefix}.email`)}
                        onChange={(event) => emitChange({ email: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.password`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-password">Contraseña</FieldLabel>
                    <Input
                        id="user-password"
                        placeholder="••••••••"
                        type="password"
                        value={person.password}
                        aria-invalid={isInvalid(`${fieldPrefix}.password`)}
                        onChange={(event) => emitChange({ password: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.confirmPassword`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-confirm-password">Confirmar Contraseña</FieldLabel>
                    <Input
                        id="user-confirm-password"
                        placeholder="••••••••"
                        type="password"
                        value={person.confirmPassword}
                        aria-invalid={isInvalid(`${fieldPrefix}.confirmPassword`)}
                        onChange={(event) => emitChange({ confirmPassword: event.target.value })}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" data-invalid={isInvalid(`${fieldPrefix}.birthDate`) ? "true" : undefined}>
                    <FieldLabel htmlFor="birth-date">
                        Fecha de nacimiento
                    </FieldLabel>
                    <Input
                        id="birth-date"
                        type="date"
                        value={person.birthDate}
                        aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
                        onChange={(event) => emitChange({ birthDate: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}>
                    <FieldLabel htmlFor="gender-user">
                        Género
                    </FieldLabel>
                    <Select
                        id="gender-user"
                        aria-invalid={isInvalid(`${fieldPrefix}.gender`)}
                        value={person.gender.id}
                        onValueChange={(selectedValue) => {
                            const option = genders.find((item) => item.id === selectedValue)
                            emitChange({ gender: option ?? { id: selectedValue ?? "", code: selectedValue ?? "", name: selectedValue ?? "" } })
                        }}
                    >
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
                <Field orientation="vertical" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
                    <Input
                        id="user-phone"
                        placeholder="3323868"
                        type="tel"
                        value={person.phone}
                        aria-invalid={isInvalid(`${fieldPrefix}.phone`)}
                        onChange={(event) => emitChange({ phone: event.target.value })}
                    />
                </Field>
            </div>
            {!passwordsMatch && person.password.length > 0 && person.confirmPassword.length > 0 ? (
                <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
            ) : null}
        </div>
    )
}