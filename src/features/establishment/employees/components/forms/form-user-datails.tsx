import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { FormSectionHeading } from "@/components/form-section-heading"
import { ImageUploadField } from "@/components/image-upload-field"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
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
import { DATE_VALUE_FORMAT, parseDateValue } from "@/lib/date-time-value"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { findPersonByDocument } from "@/features/establishment/employees/api/query/use-user-by-document"
import type { Person } from "@/features/establishment/employees/api/types/person"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

interface UserFormProps {
    role?: EmployeeRoleCode
    fieldPrefix?: string
    value: Person | null
    onChange: (person: Person | null) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
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
        documentType: null,
        identification: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        gender: null,
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
    invalidFields = [], errors = {},
    showValidation = false,
    confirmPassword: confirmPasswordProp,
    onConfirmPasswordChange,
}: UserFormProps) {
    // El encabezado solo nombra el rol de la persona (Rector, Secretaria). Sin
    // `role` no hay nada que anunciar y el contenedor ya pone su propio título
    // —en el diálogo de usuario lo duplicaba—, así que se omite.
    const roleName = EMPLOYEE_ROLES.find((item) => item.code === role)?.name ?? null

    const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
    const documentTypeLabels = Object.fromEntries(documentTypes.map((item) => [item.id, item.name]))
    const genderLabels = Object.fromEntries(genders.map((item) => [item.id, item.name]))
    const person = value ?? createEmptyPerson()

    const isConfirmControlled = confirmPasswordProp !== undefined
    // El form puede correr en dos modos:
    // - **Controlado**: el padre pasa `confirmPassword` y `onConfirmPasswordChange`
    //   (necesita el valor para su propia validación, ver
    //   `validate-establishment-form.ts`). El form es un espejo.
    // - **No controlado**: el form guarda el valor localmente. Como `confirmPassword`
    //   no es parte del modelo `Person`, queda acá hasta el submit.
    const [internalConfirmPassword, setInternalConfirmPassword] = useState(
        () => person.password,
    )
    const confirmPassword = isConfirmControlled ? confirmPasswordProp : internalConfirmPassword

    // Foto del usuario: estado puramente UI. Hoy no se persiste en el
    // modelo `Person`, así que solo mantenemos el archivo vivo mientras
    // el diálogo está montado.
    const [photo, setPhoto] = useState<File | null>(null)

    // Sincroniza la confirmación cuando el padre **carga otra persona** (no
    // solo edita la actual). El `useEffect` original re-sincronizaba cada vez
    // que el confirm quedaba vacío, pisando la edición del usuario sin razón.
    // Ahora solo dispara cuando cambia el `id` — la "primera vez" + cada
    // carga de un registro distinto.
    const lastSeenId = useRef(person.id)
    useEffect(() => {
        if (isConfirmControlled) return
        if (lastSeenId.current === person.id) return
        lastSeenId.current = person.id
        setInternalConfirmPassword(person.password)
    }, [isConfirmControlled, person.id, person.password])

    const setConfirmPassword = (next: string) => {
        if (isConfirmControlled) {
            onConfirmPasswordChange?.(next)
            return
        }
        setInternalConfirmPassword(next)
    }

    const passwordsMatch = person.password === confirmPassword
    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)

    const emitChange = (patch: Partial<Person>) => {
        onChange({ ...person, ...patch })
    }

    // Autocompletado: cuando hay tipo + número de documento, busca un
    // TUSUARIO existente y vuelca sus datos sobre el form (nunca pisa
    // `password`, que no existe en TUSUARIO). Debounced para no pegarle al
    // backend en cada tecla; se ignora la respuesta si el documento
    // cambió mientras la búsqueda estaba en vuelo (evita pisar el form con
    // datos de una búsqueda vieja).
    const documentTypeId = person.documentType?.id ?? null
    const identification = person.identification
    useEffect(() => {
        if (!documentTypeId || !identification.trim()) return

        let cancelled = false
        const timer = setTimeout(() => {
            findPersonByDocument(documentTypeId, identification)
                .then((found) => {
                    if (cancelled || !found) return
                    emitChange(found)
                })
                .catch(() => {
                    // Búsqueda opcional: si falla, el usuario sigue
                    // llenando el form a mano — no se interrumpe con un
                    // toast por algo que no bloquea el flujo.
                })
        }, 500)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe
        // re-disparar cuando cambia el documento, no en cada cambio de `person`
        // (si no, el autofill de esta misma búsqueda la volvería a disparar).
    }, [documentTypeId, identification])

    return (
        <div className="grid grid-cols-1 gap-2">

            {roleName ? <FormSectionHeading>{roleName}</FormSectionHeading> : null}
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                {/* Foto */}
                {/*
                    `row-span-3` porque al lado van seis campos en dos columnas:
                    con menos filas, los últimos se salían del bloque de la
                    derecha y caían debajo de la foto, en la primera columna.
                    El campo no aporta altura propia (ver `ImageUploadField`),
                    así que esas tres filas las siguen midiendo solo los inputs.
                */}
                <ImageUploadField
                    value={photo}
                    onValueChange={setPhoto}
                    description="para cargar la foto del usuario"
                    deleteLabel="Eliminar foto"
                    className="md:row-span-3"
                />
                {/* Formulario */}

                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.documentType`) ? "true" : undefined}>
                    <FieldLabel htmlFor="document-type">
                        Tipo de documento*
                    </FieldLabel>

                    <Select
                        id="document-type"
                        items={documentTypeLabels}
                        aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}
                        value={person.documentType?.id ?? null}
                        onValueChange={(selectedValue) => {
                            const option = documentTypes.find((item) => item.id === selectedValue)
                            if (option) emitChange({ documentType: option })
                        }}
                    >
                        <SelectTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            {documentTypes.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError>{errorFor(`${fieldPrefix}.documentType`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.identification`) ? "true" : undefined}>
                    <FieldLabel htmlFor="document-number">Número de documento*</FieldLabel>
                    <Input
                        id="document-number"
                        size="sm"
                        placeholder="Agregar"
                        value={person.identification}
                        aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
                        onChange={(event) => emitChange({ identification: event.target.value })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.identification`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.firstName`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-name">Primer Nombre*</FieldLabel>
                    <Input
                        id="user-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.firstName}
                        aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
                        onChange={(event) => emitChange({ firstName: event.target.value })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.firstName`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-second-name">Segundo Nombre</FieldLabel>
                    <Input
                        id="user-second-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.middleName ?? ""}
                        onChange={(event) => emitChange({ middleName: event.target.value })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.lastName`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-last-name">Primer Apellido*</FieldLabel>
                    <Input
                        id="user-last-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.lastName}
                        aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
                        onChange={(event) => emitChange({ lastName: event.target.value })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.lastName`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full">
                    <FieldLabel htmlFor="user-second-last-name">Segundo Apellido</FieldLabel>
                    <Input
                        id="user-second-last-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.secondLastName ?? ""}
                        onChange={(event) => emitChange({ secondLastName: event.target.value })}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-email">Correo Electrónico</FieldLabel>
                    <Input
                        id="user-email"
                        size="sm"
                        placeholder="Agregar"
                        value={person.email}
                        aria-invalid={isInvalid(`${fieldPrefix}.email`)}
                        onChange={(event) => emitChange({ email: event.target.value })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.email`)}</FieldError>
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.password`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-password">Contraseña</FieldLabel>
                    <Input
                        id="user-password"
                        size="sm"
                        placeholder="Agregar"
                        type="password"
                        value={person.password}
                        aria-invalid={isInvalid(`${fieldPrefix}.password`)}
                        onChange={(event) => emitChange({ password: event.target.value })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.password`)}</FieldError>
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.confirmPassword`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-confirm-password">Confirmar Contraseña</FieldLabel>
                    <Input
                        id="user-confirm-password"
                        size="sm"
                        placeholder="Agregar"
                        type="password"
                        value={confirmPassword}
                        aria-invalid={isInvalid(`${fieldPrefix}.confirmPassword`)}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.confirmPassword`)}</FieldError>
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.birthDate`) ? "true" : undefined}>
                    <FieldLabel htmlFor="birth-date">
                        Fecha de nacimiento
                    </FieldLabel>
                    <DatePicker
                        id="birth-date"
                        mode="date"
                        size="sm"
                        value={parseDateValue(person.birthDate)}
                        aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
                        onChange={(date) => emitChange({ birthDate: date ? format(date, DATE_VALUE_FORMAT) : "" })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.birthDate`)}</FieldError>
                </Field>
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}>
                    <FieldLabel htmlFor="gender-user">
                        Género
                    </FieldLabel>
                    <Select
                        id="gender-user"
                        items={genderLabels}
                        aria-invalid={isInvalid(`${fieldPrefix}.gender`)}
                        value={person.gender?.id ?? null}
                        onValueChange={(selectedValue) => {
                            const option = genders.find((item) => item.id === selectedValue)
                            if (option) emitChange({ gender: option })
                        }}
                    >
                        <SelectTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.gender`)}>
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            {genders.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldError>{errorFor(`${fieldPrefix}.gender`)}</FieldError>
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
                    <Input
                        id="user-phone"
                        size="sm"
                        placeholder="Agregar"
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
