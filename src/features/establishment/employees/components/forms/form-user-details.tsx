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
import { toEmailInput } from "@/lib/text-input"
import {
    DOCUMENTO_MAX,
    esDocumentoNumerico,
    fechaLimiteMayorDeEdad,
    fechaMinimaNacimiento,
    NOMBRE_MAX,
    toDocumentoInput,
    toNombreInput,
    toTelefonoInput,
} from "@/features/establishment/shared/person-field-rules"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { findPersonByDocument } from "@/features/establishment/employees/api/query/use-user-by-document"
import type { Person } from "@/features/establishment/employees/api/types/person"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

// Sin contraseña: la persona la define desde el correo de activación.


interface UserFormProps {
    role?: EmployeeRoleCode
    fieldPrefix?: string
    value: Person | null
    onChange: (person: Person | null) => void
    invalidFields?: string[]
    /** Mensaje de error por ruta de campo. */
    errors?: Record<string, string>
    showValidation?: boolean
    /** Marca los campos mínimos como obligatorios; la secretaria pasa `false`. */
    required?: boolean
    /** Solo lectura; Base UI ignora `<fieldset disabled>`. */
    disabled?: boolean
    /** Foto elegida sin subir; la envía el padre en el multipart. */
    photo?: File | null
    onPhotoChange?: (file: File | null) => void
    onRemovePhoto?: () => void
    /** Foto recién subida: el alta no devuelve `pk_tarchivo` para previsualizarla. */
    uploadedPhoto?: File | null
    /** Patch del autocompletado por documento; `null` al perder la coincidencia. */
    onMatched?: (found: Partial<Person> | null) => void
    /**
     * `two-columns`: foto a la izquierda y los campos de a dos (formulario del
     * establecimiento). Por defecto, la grilla de tres del modal de funcionarios.
     */
    layout?: "default" | "two-columns"
    /** Título del bloque; por defecto el nombre del rol (`role`). */
    title?: string
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

/** Vista previa de un `File` ya subido. */
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
    disabled = false,
    photo: photoProp,
    onPhotoChange,
    onRemovePhoto,
    uploadedPhoto,
    onMatched,
    layout = "default",
    title,
}: UserFormProps) {
    const roleName = title ?? EMPLOYEE_ROLES.find((item) => item.code === role)?.name ?? null
    const twoColumns = layout === "two-columns"

    // Aviso local: rector y secretaria comparten pantalla.
    const [accountNotice, setAccountNotice] = useState<{ id: number; message: string } | null>(
        null,
    )
    const accountNoticeIdRef = useRef(0)

    const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
    const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
    const documentTypeLabels = Object.fromEntries(documentTypes.map((item) => [item.id, item.name]))
    const genderLabels = Object.fromEntries(genders.map((item) => [item.id, item.name]))
    const person = value ?? createEmptyPerson()

    // Foto controlada por el padre o local al form.
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
    const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
    const isNewAccount = !person.id && !person.accountExists

    const documentTypeCode =
        documentTypes.find((item) => item.id === person.documentType?.id)?.code ?? person.documentType?.code

    const emitChange = (patch: Partial<Person>) => {
        onChange({ ...person, ...patch })
    }

    // Autocompletado por documento (debounced).
    const documentTypeId = person.documentType?.id ?? null
    const identification = person.identification
    // Solo decide si se muestra el aviso, no si corre la búsqueda.
    const isUserEditingDocument = useRef(false)
    // Valores previos al autocompletado, para restaurarlos si cambia el documento.
    const preMatchValuesRef = useRef<Partial<Person> | null>(null)
    useEffect(() => {
        if (!documentTypeId || !identification.trim()) return
        if (person.accountExists && !isUserEditingDocument.current) return

        if (person.accountExists) {
            emitChange({
                ...preMatchValuesRef.current,
                accountExists: false,
                id: undefined,
                photoArchivoId: null,
            })
            preMatchValuesRef.current = null
            onMatched?.(null)
            setAccountNotice(null)
        }

        let cancelled = false
        const timer = setTimeout(() => {
            findPersonByDocument(documentTypeId, identification)
                .then((found) => {
                    if (cancelled || !found) return
                    preMatchValuesRef.current = Object.fromEntries(
                        Object.keys(found).map((key) => [key, person[key as keyof Person]]),
                    ) as Partial<Person>
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
                    // Opcional: si falla se llena a mano.
                })
        }, 500)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambia con el documento.
    }, [documentTypeId, identification])

    const documentTypeField = (
        <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.documentType`) ? "true" : undefined}>
            <FieldLabel htmlFor="document-type">
                Tipo de documento{required ? "*" : ""}
            </FieldLabel>

            <ComboboxField
                id="document-type"
                disabled={disabled}
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
                    <ComboboxFieldValue placeholder="Seleccione" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                    <ComboboxFieldItem value={null}>Seleccione</ComboboxFieldItem>
                    {documentTypes.map((item) => (
                        <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                            {item.name}
                        </ComboboxFieldItem>
                    ))}
                </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{errorFor(`${fieldPrefix}.documentType`)}</FieldError>
        </Field>
    )

    const identificationField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.identification`) ? "true" : undefined}>
            <FieldLabel htmlFor="document-number">Número de documento{required ? "*" : ""}</FieldLabel>
            <Input
                id="document-number"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                inputMode={esDocumentoNumerico(documentTypeCode) ? "numeric" : "text"}
                maxLength={DOCUMENTO_MAX}
                value={person.identification}
                aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
                onChange={(event) => {
                    isUserEditingDocument.current = true
                    emitChange({ identification: toDocumentoInput(event.target.value, documentTypeCode) })
                }}
            />
            <FieldError>{errorFor(`${fieldPrefix}.identification`)}</FieldError>
        </Field>
    )

    const firstNameField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.firstName`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-name">Primer nombre{required ? "*" : ""}</FieldLabel>
            <Input
                id="user-name"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                value={person.firstName}
                aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
                maxLength={NOMBRE_MAX}
                onChange={(event) => emitChange({ firstName: toNombreInput(event.target.value) })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.firstName`)}</FieldError>
        </Field>
    )

    const middleNameField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.middleName`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-second-name">Segundo nombre</FieldLabel>
            <Input
                id="user-second-name"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                value={person.middleName ?? ""}
                aria-invalid={isInvalid(`${fieldPrefix}.middleName`)}
                maxLength={NOMBRE_MAX}
                onChange={(event) => emitChange({ middleName: toNombreInput(event.target.value) })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.middleName`)}</FieldError>
        </Field>
    )

    const lastNameField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.lastName`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-last-name">Primer apellido{required ? "*" : ""}</FieldLabel>
            <Input
                id="user-last-name"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                value={person.lastName}
                aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
                maxLength={NOMBRE_MAX}
                onChange={(event) => emitChange({ lastName: toNombreInput(event.target.value) })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.lastName`)}</FieldError>
        </Field>
    )

    const secondLastNameField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.secondLastName`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-second-last-name">Segundo apellido</FieldLabel>
            <Input
                id="user-second-last-name"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                value={person.secondLastName ?? ""}
                aria-invalid={isInvalid(`${fieldPrefix}.secondLastName`)}
                maxLength={NOMBRE_MAX}
                onChange={(event) => emitChange({ secondLastName: toNombreInput(event.target.value) })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.secondLastName`)}</FieldError>
        </Field>
    )

    const emailField = (
        <Field orientation="vertical" variant="outlined" className={twoColumns ? "w-full" : "w-full md:col-span-2"} data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-email">Correo electrónico{required ? "*" : ""}</FieldLabel>
            <Input
                id="user-email"
                size="sm"
                disabled={disabled}
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
    )

    const phoneField = (
        <Field orientation="vertical" variant="outlined" className="w-full" data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}>
            <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
            <Input
                id="user-phone"
                size="sm"
                disabled={disabled}
                placeholder="Agregar"
                type="tel"
                // De 7 a 15 dígitos, con + opcional para el indicativo.
                inputMode="tel"
                maxLength={16}
                value={person.phone}
                aria-invalid={isInvalid(`${fieldPrefix}.phone`)}
                onChange={(event) => emitChange({ phone: toTelefonoInput(event.target.value) })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.phone`)}</FieldError>
        </Field>
    )

    const birthDateField = (
        <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.birthDate`) ? "true" : undefined}>
            <FieldLabel htmlFor="birth-date">
                Fecha de nacimiento
            </FieldLabel>
            <DatePicker
                id="birth-date"
                mode="date"
                size="sm"
                disabled={disabled}
                // Entre hace 80 años y hace 18 (informe de diseño, 2.2).
                minDate={parseDateValue(fechaMinimaNacimiento())}
                maxDate={parseDateValue(fechaLimiteMayorDeEdad())}
                value={parseDateValue(person.birthDate)}
                aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
                onChange={(date) => emitChange({ birthDate: date ? format(date, DATE_VALUE_FORMAT) : "" })}
            />
            <FieldError>{errorFor(`${fieldPrefix}.birthDate`)}</FieldError>
        </Field>
    )

    const genderField = (
        <Field orientation="vertical" variant="outlined" data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}>
            <FieldLabel htmlFor="gender-user">
                Género{required ? "*" : ""}
            </FieldLabel>
            <ComboboxField
                id="gender-user"
                disabled={disabled}
                items={genderLabels}
                aria-invalid={isInvalid(`${fieldPrefix}.gender`)}
                value={person.gender?.id ?? null}
                onValueChange={(selectedValue) => {
                    const option = genders.find((item) => item.id === selectedValue)
                    emitChange({ gender: option ?? null })
                }}
            >
                <ComboboxFieldTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.gender`)}>
                    <ComboboxFieldValue placeholder="Seleccione" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                    <ComboboxFieldItem value={null}>Seleccione</ComboboxFieldItem>
                    {genders.map((item) => (
                        <ComboboxFieldItem key={item.id} value={item.id}>
                            {item.name}
                        </ComboboxFieldItem>
                    ))}
                </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{errorFor(`${fieldPrefix}.gender`)}</FieldError>
        </Field>
    )

    const photoField = (
        <ImageUploadField
            value={photo}
            onValueChange={setPhoto}
            description={twoColumns ? null : "para cargar la foto del usuario"}
            title={twoColumns ? "Foto" : undefined}
            hint={twoColumns ? "JPG, PNG o SVG · 2 MB" : undefined}
            deleteLabel="Eliminar foto"
            error={errorFor(`${fieldPrefix}.photo`)}
            className={twoColumns ? "h-36" : "md:row-span-3"}
            disabled={disabled}
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
                disabled || (person.photoArchivoId == null && !uploadedPhoto)
                    ? undefined
                    : () => {
                          emitChange({ photoArchivoId: null })
                          onRemovePhoto?.()
                      }
            }
        />
    )

    if (twoColumns) {
        return (
            <div className="grid grid-cols-1 gap-3">
                <NoticeBanner
                    notice={accountNotice}
                    onClose={() => setAccountNotice(null)}
                    variant="success"
                    autoCloseMs={7000}
                />
                {roleName ? <h3 className="text-sm font-semibold">{roleName}</h3> : null}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[11rem_1fr]">
                    <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">Foto del usuario</span>
                        {photoField}
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:col-span-2 md:grid-cols-[1fr_2fr]">
                            {documentTypeField}
                            {identificationField}
                        </div>
                        {firstNameField}
                        {middleNameField}
                        {lastNameField}
                        {secondLastNameField}
                        {emailField}
                        {genderField}
                        {birthDateField}
                        {phoneField}
                    </div>
                </div>
            </div>
        )
    }

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
                {photoField}
                {documentTypeField}
                {identificationField}
                {firstNameField}
                {middleNameField}
                {lastNameField}
                {secondLastNameField}
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                {emailField}
                {phoneField}
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
                {birthDateField}
                {genderField}
            </div>
        </div>
    )
}
