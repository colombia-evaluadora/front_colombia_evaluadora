import { useEffect, useState } from "react"
import { format } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { FormSectionHeading } from "@/components/form-section-heading"
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
import { UserCircleIcon } from "@/components/ui/icons"
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
import { DATE_VALUE_FORMAT, parseDateValue } from "@/lib/date-time-value"
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
    /**
     * Estado UI para la confirmación de contraseña. Vive fuera de la entidad
     * `Person` porque es un dato de formulario, no un atributo de negocio.
     * Si se provee, el form se vuelve controlado en ese campo; si no, lo
     * maneja internamente.
     */
    confirmPassword?: string
    onConfirmPasswordChange?: (value: string) => void
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
    }
}

export function UserDetailsForm({
    role,
    fieldPrefix = "principal",
    value,
    onChange,
    invalidFields = [],
    showValidation = false,
    confirmPassword: confirmPasswordProp,
    onConfirmPasswordChange,
}: UserFormProps) {
    const roleName =
        EMPLOYEE_ROLES.find((item) => item.code === role)?.name ??
        "Agregar usuario"

    const {data: documentTypes = []} = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const {data: genders = []} = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
    const person = value ?? createEmptyPerson()

    const isConfirmControlled = confirmPasswordProp !== undefined
    const [internalConfirmPassword, setInternalConfirmPassword] = useState("")
    const confirmPassword = isConfirmControlled ? confirmPasswordProp : internalConfirmPassword

    // Foto del usuario: estado puramente UI. Hoy no se persiste en el
    // modelo `Person`, así que solo mantenemos el archivo vivo mientras
    // el diálogo está montado.
    const [photo, setPhoto] = useState<File | null>(null)

    // Al cargar un registro existente, sincroniza la confirmación con la
    // contraseña persistida solo si el usuario aún no la ha tocado.
    useEffect(() => {
        if (isConfirmControlled) {
            return
        }

        if (internalConfirmPassword === "" && person.password !== "") {
            setInternalConfirmPassword(person.password)
        }
    }, [isConfirmControlled, internalConfirmPassword, person.password])

    const setConfirmPassword = (next: string) => {
        if (isConfirmControlled) {
            onConfirmPasswordChange?.(next)
            return
        }
        setInternalConfirmPassword(next)
    }

    const passwordsMatch = person.password === confirmPassword
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)

    const emitChange = (patch: Partial<Person>) => {
        onChange({ ...person, ...patch })
    }

    return (
        <div className="grid grid-cols-1 gap-6">

            <FormSectionHeading>
                {roleName}
            </FormSectionHeading>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Foto */}
                <div className="row-span-2">
                    <FileUpload
                        value={photo ? [photo] : []}
                        onValueChange={(files) => setPhoto(files[0] ?? null)}
                        accept="image/*"
                        maxFiles={1}
                        className="w-40"
                    >
                        {photo ? (
                            <FileUploadList orientation="vertical">
                                <FileUploadItem value={photo} orientation="vertical" size="sm" className="w-40">
                                    <FileUploadItemPreview className="aspect-square w-full" />
                                    <FileUploadItemMetadata size="sm" />
                                    <FileUploadItemDelete
                                        aria-label="Eliminar foto"
                                        onClick={(event) => {
                                            // El handler interno ya borra el
                                            // archivo, pero dejamos el prevent
                                            // default para que no se propague
                                            // al row de la tabla.
                                            event.stopPropagation()
                                        }}
                                    />
                                </FileUploadItem>
                            </FileUploadList>
                        ) : (
                            <FileUploadDropzone className="aspect-square w-40 p-2">
                                <Avatar className="size-12">
                                    <AvatarFallback>
                                        <UserCircleIcon />
                                    </AvatarFallback>
                                </Avatar>
                                <FileUploadTrigger
                                    render={
                                        <Button variant="outline" color="muted" size="xs">
                                            Subir foto
                                        </Button>
                                    }
                                />
                            </FileUploadDropzone>
                        )}
                    </FileUpload>
                </div>
                {/* Formulario */}

                <Field orientation="vertical" variant="outlined">
                    <FieldLabel htmlFor="document-type">
                        Tipo de documento*
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

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="document-number">Número de documento*</FieldLabel>
                    <Input
                        id="document-number"
                        placeholder="925557829"
                        value={person.identification}
                        aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
                        onChange={(event) => emitChange({ identification: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-name">Primer Nombre*</FieldLabel>
                    <Input
                        id="user-name"
                        placeholder="Fernney"
                        value={person.firstName}
                        aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
                        onChange={(event) => emitChange({ firstName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-second-name">Segundo Nombre</FieldLabel>
                    <Input
                        id="user-second-name"
                        placeholder="Antonio"
                        value={person.middleName ?? ""}
                        onChange={(event) => emitChange({ middleName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-last-name">Primer Apellido*</FieldLabel>
                    <Input
                        id="user-last-name"
                        placeholder="Jaramillo"
                        value={person.lastName}
                        aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
                        onChange={(event) => emitChange({ lastName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-second-last-name">Segundo Apellido</FieldLabel>
                    <Input
                        id="user-second-last-name"
                        placeholder="Gomez"
                        value={person.secondLastName ?? ""}
                        onChange={(event) => emitChange({ secondLastName: event.target.value })}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-email">Correo Electrónico</FieldLabel>
                    <Input
                        id="user-email"
                        placeholder="luis.diaz@gmail.com"
                        value={person.email}
                        aria-invalid={isInvalid(`${fieldPrefix}.email`)}
                        onChange={(event) => emitChange({ email: event.target.value })}
                    />
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.password`) ? "true" : undefined}>
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
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.confirmPassword`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-confirm-password">Confirmar Contraseña</FieldLabel>
                    <Input
                        id="user-confirm-password"
                        placeholder="••••••••"
                        type="password"
                        value={confirmPassword}
                        aria-invalid={isInvalid(`${fieldPrefix}.confirmPassword`)}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.birthDate`) ? "true" : undefined}>
                    <FieldLabel htmlFor="birth-date">
                        Fecha de nacimiento
                    </FieldLabel>
                    <DatePicker
                        id="birth-date"
                        mode="date"
                        value={parseDateValue(person.birthDate)}
                        aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
                        onChange={(date) => emitChange({ birthDate: date ? format(date, DATE_VALUE_FORMAT) : "" })}
                    />
                </Field>
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}>
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
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}>
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
            {!passwordsMatch && person.password.length > 0 && confirmPassword.length > 0 ? (
                <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
            ) : null}
        </div>
    )
}