import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { FormSectionHeading } from "@/components/form-section-heading"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
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
import { DATE_VALUE_FORMAT, parseDateValue } from "@/lib/date-time-value"
import { toDigitsOnly, toEmailInput } from "@/lib/text-input"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { findPersonByDocument } from "@/features/establishment/employees/api/query/use-user-by-document"
import type { Person } from "@/features/establishment/employees/api/types/person"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

// Sin campos de contraseña: el alta de funcionario (y de rector/secretaria)
// ya no la pide. `POST /auth/register/{app}/funcionario` crea la cuenta
// pendiente de activación y le manda al correo el enlace "Activa tu cuenta"
// (vigencia 7 días), donde la persona define su propia contraseña. Al
// editar nunca se mandó (ver `update.ts`).

function getMaxBirthDate(): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return date
}

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
     * ¿Los 4 mínimos (tipo/número de documento, primer nombre, primer
     * apellido) llevan asterisco? `true` por defecto — el único caso hoy
     * donde la persona entera es opcional (puede no existir) es la
     * secretaria del establecimiento, que pasa `false` acá.
     */
    required?: boolean
    /**
     * Foto recién elegida, todavía sin subir. Igual que el escudo del
     * establecimiento, vive en el padre: es él quien la manda como
     * `fkTarchivoFoto` del multipart al registrar o actualizar. Sin estas dos
     * props el campo sigue funcionando, pero la foto no se persiste.
     */
    photo?: File | null
    onPhotoChange?: (file: File | null) => void
    onRemovePhoto?: () => void
    /**
     * La foto que ACABA de subirse al crear el funcionario. Al guardar, el
     * `File` se limpia —ya se subió, y dejarlo marcaría el formulario como
     * sucio para siempre— pero el alta no devuelve el `pk_tarchivo`, así que
     * `photoArchivoId` sigue en `null` y la vista previa se quedaba vacía:
     * parecía que la foto no se había guardado. Se muestra esta hasta que el
     * diálogo se reabra en edición y llegue la de verdad.
     */
    uploadedPhoto?: File | null
    /**
     * Se dispara con el patch crudo que devolvió `findPersonByDocument`
     * cada vez que el
     * autocompletado encuentra o pierde una coincidencia — `null` cuando el
     * documento cambia y se resetea el match anterior. El padre lo usa para
     * dos cosas que este form no puede decidir por sí solo: (1) si el match
     * ya trae `id` (ya es funcionario activo), tratar el alta como edición
     * de ese `id` desde ya; (2) si no trae `id` (solo existe la cuenta),
     * guardar el snapshot para poder detectar más tarde si el usuario editó
     * algún campo antes de guardar y encadenar un PATCH además del alta
     * (ver `personDataChangedSinceMatch`, `person.ts`).
     */
    onMatched?: (found: Partial<Person> | null) => void
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
    }
}

/**
 * Vista previa de un `File` que ya está subido: el mismo object URL que hace
 * `ImageUploadField` para el archivo elegido, pero para el hueco de la foto
 * ya existente. Se revoca al cambiar de archivo o al desmontar.
 */
function LocalImage({ file, alt }: { file: File; alt: string }) {
    const [url, setUrl] = useState<string | null>(null)

    useEffect(() => {
        const next = URL.createObjectURL(file)
        setUrl(next)
        return () => URL.revokeObjectURL(next)
    }, [file])

    if (!url) return null
    return <img src={url} alt={alt} className="size-full object-cover" />
}

export function UserDetailsForm({
    role,
    fieldPrefix = "principal",
    value,
    onChange,
    invalidFields = [], errors = {},
    showValidation = false,
    required = true,
    photo: photoProp,
    onPhotoChange,
    onRemovePhoto,
    uploadedPhoto,
    onMatched,
}: UserFormProps) {
    // El encabezado solo nombra el rol de la persona (Rector, Secretaria). Sin
    // `role` no hay nada que anunciar y el contenedor ya pone su propio título
    // —en el diálogo de usuario lo duplicaba—, así que se omite.
    const roleName = EMPLOYEE_ROLES.find((item) => item.code === role)?.name ?? null

    // Local a esta instancia (no el `notify()` compartido de la página):
    // rector y secretaria son dos `UserDetailsForm` separados en la misma
    // pantalla, así que el aviso de "cuenta encontrada" tiene que quedar
    // pegado a la sección que lo disparó, no a un outlet único compartido.
    const [accountNotice, setAccountNotice] = useState<{ id: number; message: string } | null>(
        null,
    )
    const accountNoticeIdRef = useRef(0)

    const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
    const documentTypeLabels = Object.fromEntries(documentTypes.map((item) => [item.id, item.name]))
    const genderLabels = Object.fromEntries(genders.map((item) => [item.id, item.name]))
    const person = value ?? createEmptyPerson()

    // Foto del usuario, en dos modos: si el padre pasa `photo`/`onPhotoChange`
    // la manda él al backend; si no, queda acá y solo vive mientras el form
    // está montado.
    // No es parte de `Person` porque el modelo guarda el `pk_tarchivo` que
    // devuelve el backend, no el `File` que el usuario acaba de elegir.
    const isPhotoControlled = photoProp !== undefined
    const [internalPhoto, setInternalPhoto] = useState<File | null>(null)
    const photo = isPhotoControlled ? photoProp : internalPhoto
    const setPhoto = (next: File | null) => {
        if (isPhotoControlled) {
            onPhotoChange?.(next)
            return
        }
        setInternalPhoto(next)
    }

    const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
    // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    // Alta de una cuenta nueva (sin `id` ni cuenta encontrada por documento):
    // el correo es a donde llega la invitación de activación.
    const isNewAccount = !person.id && !person.accountExists

    const emitChange = (patch: Partial<Person>) => {
        onChange({ ...person, ...patch })
    }

    // Autocompletado: cuando hay tipo + número de documento, busca un
    // TUSUARIO existente y vuelca sus datos sobre el form. Debounced
    // para no pegarle al backend en cada tecla; se ignora la respuesta si
    // el documento cambió mientras la búsqueda estaba en vuelo (evita
    // pisar el form con datos de una búsqueda vieja).
    const documentTypeId = person.documentType?.id ?? null
    const identification = person.identification
    // Solo gobierna el toast, NO si la búsqueda corre: la búsqueda tiene que
    // correr también al abrir "editar" (para marcar `accountExists` si la
    // persona ya tiene cuenta, igual que en alta) — lo que no queremos ahí
    // es el aviso de "cuenta encontrada",
    // porque nadie tecleó nada, solo se cargó un registro que ya la tenía.
    const isUserEditingDocument = useRef(false)
    useEffect(() => {
        if (!documentTypeId || !identification.trim()) return
        if (person.accountExists && !isUserEditingDocument.current) return

        if (person.accountExists) {
            emitChange({
                accountExists: false,
                id: undefined,
                photoArchivoId: null,
            })
            onMatched?.(null)
            setAccountNotice(null)
        }

        let cancelled = false
        const timer = setTimeout(() => {
            findPersonByDocument(documentTypeId, identification)
                .then((found) => {
                    if (cancelled || !found) return
                    // `found.accountExists` ya viene en `true` (ver
                    // use-user-by-document.ts). El padre recibe el patch
                    // crudo tal cual vino del backend.
                    onMatched?.(found)
                    emitChange(found)
                    if (isUserEditingDocument.current) {
                        accountNoticeIdRef.current += 1
                        setAccountNotice({
                            id: accountNoticeIdRef.current,
                            message:
                                "Ya existe una cuenta con este documento: se completaron sus datos automáticamente.",
                        })
                    }
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

            <NoticeBanner
                notice={accountNotice}
                onClose={() => setAccountNotice(null)}
                variant="success"
                autoCloseMs={7000}
            />
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
                    error={errorFor(`${fieldPrefix}.photo`)}
                    className="md:row-span-3"
                    existingPreview={
                        person.photoArchivoId != null ? (
                            <ArchivoImage
                                archivoId={person.photoArchivoId}
                                alt="Foto de perfil"
                            />
                        ) : uploadedPhoto ? (
                            <LocalImage file={uploadedPhoto} alt="Foto de perfil" />
                        ) : undefined
                    }
                    onRemoveExisting={
                        person.photoArchivoId == null && !uploadedPhoto
                            ? undefined
                            : () => {
                                  emitChange({ photoArchivoId: null })
                                  onRemovePhoto?.()
                              }
                    }
                />
                {/* Formulario */}

                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.documentType`) ? "true" : undefined}>
                    <FieldLabel htmlFor="document-type">
                        Tipo de documento{required ? "*" : ""}
                    </FieldLabel>

                    <ComboboxField
                        id="document-type"
                        items={documentTypeLabels}
                        aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}
                        value={person.documentType?.id ?? null}
                        onValueChange={(selectedValue) => {
                            isUserEditingDocument.current = true
                            if (selectedValue === null) {
                                emitChange({ documentType: null })
                                return
                            }
                            const option = documentTypes.find((item) => item.id === selectedValue)
                            if (option) {
                                emitChange({ documentType: option })
                            }
                        }}
                    >
                        <ComboboxFieldTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}>
                            <ComboboxFieldValue placeholder="Seleccionar" />
                        </ComboboxFieldTrigger>
                        <ComboboxFieldContent>
                            <ComboboxFieldItem value={null}>Ninguno</ComboboxFieldItem>
                            {documentTypes.map((item) => (
                                <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                                    {item.name}
                                </ComboboxFieldItem>
                            ))}
                        </ComboboxFieldContent>
                    </ComboboxField>
                    <FieldError>{errorFor(`${fieldPrefix}.documentType`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.identification`) ? "true" : undefined}>
                    <FieldLabel htmlFor="document-number">Número de documento{required ? "*" : ""}</FieldLabel>
                    <Input
                        id="document-number"
                        size="sm"
                        placeholder="Agregar"
                        // TUSUARIO.IDENTIFICACION es VARCHAR(30) puramente
                        // numérico (RegisterUsuarioRequest la valida igual,
                        // @Size(max=30)) — solo dígitos, sin letras. Acotado
                        // a 15 acá.
                        inputMode="numeric"
                        maxLength={15}
                        value={person.identification}
                        aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
                        onChange={(event) => {
                            isUserEditingDocument.current = true
                            emitChange({ identification: toDigitsOnly(event.target.value, 15) })
                        }}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.identification`)}</FieldError>
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.firstName`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-name">Primer Nombre{required ? "*" : ""}</FieldLabel>
                    <Input
                        id="user-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.firstName}
                        aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
                        onChange={(event) => emitChange({ firstName: event.target.value.toUpperCase() })}
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
                        onChange={(event) => emitChange({ middleName: event.target.value.toUpperCase() })}
                    />
                </Field>

                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.lastName`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-last-name">Primer Apellido{required ? "*" : ""}</FieldLabel>
                    <Input
                        id="user-last-name"
                        size="sm"
                        placeholder="Agregar"
                        value={person.lastName}
                        aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
                        onChange={(event) => emitChange({ lastName: event.target.value.toUpperCase() })}
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
                        onChange={(event) => emitChange({ secondLastName: event.target.value.toUpperCase() })}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                <Field orientation="vertical" variant="outlined" className="w-full md:col-span-2" data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-email">Correo Electrónico{required ? "*" : ""}</FieldLabel>
                    <Input
                        id="user-email"
                        size="sm"
                        placeholder="Agregar"
                        value={person.email}
                        aria-invalid={isInvalid(`${fieldPrefix}.email`)}
                        onChange={(event) => emitChange({ email: toEmailInput(event.target.value) })}
                    />
                    {errorFor(`${fieldPrefix}.email`) ? (
                        <FieldError>{errorFor(`${fieldPrefix}.email`)}</FieldError>
                    ) : isNewAccount ? (
                        <FieldDescription>
                            A este correo llegará el enlace para activar la cuenta y crear la contraseña.
                        </FieldDescription>
                    ) : null}
                </Field>
                <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}>
                    <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
                    <Input
                        id="user-phone"
                        size="sm"
                        placeholder="Agregar"
                        type="tel"
                        // La columna aguanta VARCHAR(30), pero solo se opera
                        // en Colombia y un teléfono de acá —fijo o celular—
                        // no pasa de 10 dígitos. Mismo trato que el teléfono
                        // de contacto del establecimiento, que ya recortaba
                        // acá: la regla compartida los valida con el mismo
                        // patrón y no tiene sentido dejar escribir algo que
                        // el submit va a rechazar.
                        inputMode="numeric"
                        maxLength={10}
                        value={person.phone}
                        aria-invalid={isInvalid(`${fieldPrefix}.phone`)}
                        onChange={(event) =>
                            emitChange({ phone: toDigitsOnly(event.target.value, 10) })
                        }
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.phone`)}</FieldError>
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
                        maxDate={getMaxBirthDate()}
                        value={parseDateValue(person.birthDate)}
                        aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
                        onChange={(date) => emitChange({ birthDate: date ? format(date, DATE_VALUE_FORMAT) : "" })}
                    />
                    <FieldError>{errorFor(`${fieldPrefix}.birthDate`)}</FieldError>
                </Field>
                <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}>
                    <FieldLabel htmlFor="gender-user">
                        Género{required ? "*" : ""}
                    </FieldLabel>
                    <ComboboxField
                        id="gender-user"
                        items={genderLabels}
                        aria-invalid={isInvalid(`${fieldPrefix}.gender`)}
                        value={person.gender?.id ?? null}
                        onValueChange={(selectedValue) => {
                            const option = genders.find((item) => item.id === selectedValue)
                            if (option) emitChange({ gender: option })
                        }}
                    >
                        <ComboboxFieldTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.gender`)}>
                            <ComboboxFieldValue placeholder="Seleccionar" />
                        </ComboboxFieldTrigger>
                        <ComboboxFieldContent>
                            {genders.map((item) => (
                                <ComboboxFieldItem key={item.id} value={item.id}>
                                    {item.name}
                                </ComboboxFieldItem>
                            ))}
                        </ComboboxFieldContent>
                    </ComboboxField>
                    <FieldError>{errorFor(`${fieldPrefix}.gender`)}</FieldError>
                </Field>
            </div>
        </div>
    )
}
