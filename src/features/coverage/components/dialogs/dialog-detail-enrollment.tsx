"use no memo"

import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { CaretDownIcon, CheckIcon, EyeIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { inputTriggerVariants, inputVariants } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useNotify } from "@/components/notice/notice-context"

import {
  DOCUMENT_TYPE_OPTIONS,
  EDUCATION_LEVEL_LABELS,
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_OPTIONS,
  SHIFT_LABELS,
  formatGrade,
} from "@/features/coverage/api/ui-mappings"
import {
  ENROLLMENT_STATUS_BADGE,
  ENROLLMENT_STATUS_LABELS,
} from "@/features/coverage/api/ui-mappings-enrollments"
import { useUpdateEnrollment } from "@/features/coverage/api/mutations/update-enrollment"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { DeleteEnrollmentDialog } from "@/features/coverage/components/dialogs/dialog-delete-enrollment"
import { SelectCampusDialog } from "@/features/coverage/components/dialogs/dialog-select-campus"
import { DOCUMENT_REGEX, EMAIL_REGEX } from "@/features/coverage/utils/matricula-form-defaults"
import type { CampusOption } from "@/features/coverage/utils/campus-options"
import type { Enrollment } from "@/features/coverage/api/types/enrollment"
import type { Shift, EducationLevel } from "@/features/coverage/api/types/reservation"

interface DetailEnrollmentDialogProps {
  enrollment: Enrollment
  /** "eye" abre el detalle en lectura; "pencil" abre directo en edición. */
  variant?: "eye" | "pencil"
}

function formatDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(isoDate))
  } catch {
    return isoDate
  }
}

/** Mapa `value → label` para los ComboboxField de selección simple. */
function optionsToItems(options: string[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option, option]))
}

/** `SHIFT_LABELS` invertido: de la etiqueta que trae `CampusOption` a la key del catálogo. */
function shiftKeyFromLabel(label: string): string {
  return Object.entries(SHIFT_LABELS).find(([, value]) => value === label)?.[0] ?? label
}

/**
 * Items de un combobox que siempre incluyen el valor actual, aunque no venga
 * en el catálogo: así el campo muestra el dato real en vez de un placeholder.
 */
function itemsWithValue(items: Record<string, string>, value?: string | null) {
  if (!value || value in items) return items
  return { ...items, [value]: value }
}

const DOCUMENT_TYPE_ITEMS = optionsToItems(DOCUMENT_TYPE_OPTIONS)
const GENDER_ITEMS = optionsToItems(GENDER_OPTIONS)
const RESIDENCE_ITEMS = optionsToItems(RESIDENCE_OPTIONS)
const RELATIONSHIP_ITEMS = optionsToItems(RELATIONSHIP_OPTIONS)
const SHIFT_ITEMS = optionsToItems(Object.values(SHIFT_LABELS))
const EDUCATION_LEVEL_ITEMS = optionsToItems(Object.values(EDUCATION_LEVEL_LABELS))
const GRADE_ITEMS = Object.fromEntries(
  GRADE_OPTIONS.map((grade) => [String(grade), formatGrade(grade)]),
)
const LIVES_WITH_STUDENT_ITEMS = optionsToItems(["Si", "No"])

interface FieldProps {
  label: string
  value?: string | null
  /** Nombre único del campo: necesario para asociar label y control al editar. */
  name?: string
  /** En modo edición: lista de opciones → combobox; si falta → input de texto. */
  options?: Record<string, string>
  type?: "text" | "date"
  editing?: boolean
  disabled?: boolean
  onChange?: (value: string) => void
  className?: string
  error?: string
}

function DetailField({
  label,
  value,
  name,
  options,
  type = "text",
  editing = false,
  disabled = false,
  onChange,
  className,
  error,
}: FieldProps) {
  if (editing && onChange && name) {
    return (
      <Field variant="outlined" className={cn("gap-2", className)} data-invalid={error ? "true" : undefined}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {options ? (
          <ComboboxField
            value={value ?? ""}
            onValueChange={(v) => onChange(v ?? "")}
            items={itemsWithValue(options, value)}
          >
            <ComboboxFieldTrigger
              id={name}
              size="sm"
              className="w-full"
              disabled={disabled}
              aria-invalid={Boolean(error)}
            >
              <ComboboxFieldValue placeholder="—" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {Object.entries(itemsWithValue(options, value)).map(([optionValue, optionLabel]) => (
                <ComboboxFieldItem key={optionValue} value={optionValue}>
                  {optionLabel}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        ) : (
          <Input
            id={name}
            name={name}
            type={type}
            size="sm"
            autoComplete="off"
            value={value ?? ""}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {error ? <FieldError errors={[{ message: error }]} /> : null}
      </Field>
    )
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  )
}

// Mismas reglas que la validación de matrícula (`validateMatricula`) y que el
// alta de inscripción (`dialog-add-enrollment`): formato de documento (3-10
// dígitos), formato de correo, fecha de nacimiento no futura y campos
// obligatorios de estudiante/acudiente.
function enrollmentErrors(enrollment: Enrollment): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {}

  if (!enrollment.documentType) errors.documentType = "Requerido."
  const documentNumber = enrollment.documentNumber.trim()
  if (!documentNumber) errors.documentNumber = "Requerido."
  else if (!DOCUMENT_REGEX.test(documentNumber)) {
    errors.documentNumber = "El documento debe tener entre 3 y 10 dígitos."
  }
  if (!enrollment.firstName.trim()) errors.firstName = "Requerido."
  if (!enrollment.lastName.trim()) errors.lastName = "Requerido."
  if (!enrollment.birthDate) errors.birthDate = "Requerido."
  else if (enrollment.birthDate > new Date().toISOString().slice(0, 10)) {
    errors.birthDate = "La fecha no puede ser futura."
  }
  if (!enrollment.gender) errors.gender = "Requerido."
  const email = enrollment.email.trim()
  if (email && !EMAIL_REGEX.test(email)) errors.email = "Formato de correo electrónico inválido."

  if (!enrollment.guardianDocumentType) errors.guardianDocumentType = "Requerido."
  const guardianDocumentNumber = enrollment.guardianDocumentNumber.trim()
  if (!guardianDocumentNumber) errors.guardianDocumentNumber = "Requerido."
  else if (!DOCUMENT_REGEX.test(guardianDocumentNumber)) {
    errors.guardianDocumentNumber = "El documento debe tener entre 3 y 10 dígitos."
  }
  if (!enrollment.guardianFirstName.trim()) errors.guardianFirstName = "Requerido."
  if (!enrollment.guardianLastName.trim()) errors.guardianLastName = "Requerido."
  if (!enrollment.guardianRelationship) errors.guardianRelationship = "Requerido."
  const guardianEmail = enrollment.guardianEmail.trim()
  if (guardianEmail && !EMAIL_REGEX.test(guardianEmail)) {
    errors.guardianEmail = "Formato de correo electrónico inválido."
  }

  return errors
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {children}
    </div>
  )
}

/**
 * "Sede educativa": en vez de un combobox, abre el mismo dialog de selección
 * de establecimiento que el alta de inscripción -- la jornada viaja con la
 * sede elegida, así que no hay un campo "Jornada" aparte para editar.
 */
function SedeEducativaField({
  value,
  shiftLabel,
  editing,
  onSelect,
}: {
  value: string
  shiftLabel: string
  editing: boolean
  onSelect: (campus: CampusOption) => void
}) {
  const [open, setOpen] = useState(false)

  if (!editing) {
    return (
      <DetailField label="Sede educativa" value={`${value}, ${shiftLabel}`} className="col-span-2" />
    )
  }

  return (
    <>
      <Field variant="outlined" className="col-span-2 gap-2">
        <FieldLabel htmlFor="sede-educativa">Sede educativa</FieldLabel>
        <button
          id="sede-educativa"
          type="button"
          className={cn(
            inputVariants({ variant: "outlined", size: "sm" }),
            inputTriggerVariants({ variant: "outlined" }),
            "flex items-center gap-1.5 text-left",
          )}
          data-popup-open={open ? "" : undefined}
          onClick={() => setOpen(true)}
        >
          <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")}>
            {value ? `${value}, ${shiftLabel}` : "Seleccionar"}
          </span>
          <CaretDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </Field>
      <SelectCampusDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onConfirm={onSelect}
      />
    </>
  )
}

export function DetailEnrollmentDialog({
  enrollment,
  variant = "eye",
}: DetailEnrollmentDialogProps) {
  const [open, setOpen] = useState(false)
  /** Borrador en edición; `null` = modo lectura. */
  const [draft, setDraft] = useState<Enrollment | null>(null)
  // Los errores solo se muestran después del primer intento de guardar --
  // igual que `hasSubmitted` en el alta de matrícula y `attemptedStudentStep`
  // en el alta de inscripción.
  const [attemptedSave, setAttemptedSave] = useState(false)
  const { notify } = useNotify()

  const editing = draft !== null
  const current = draft ?? enrollment
  const errors = editing ? enrollmentErrors(current) : {}

  const updateMutation = useUpdateEnrollment({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Inscripción actualizada correctamente.")
        setDraft(null)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const shiftLabel = SHIFT_LABELS[current.shift as Shift] ?? current.shift
  const originShiftLabel = SHIFT_LABELS[current.originShift as Shift] ?? current.originShift
  const originEducationLevelLabel =
    EDUCATION_LEVEL_LABELS[current.originEducationLevel as EducationLevel] ??
    current.originEducationLevel

  // Catálogo compartido con el formulario de reserva: instituciones
  // disponibles para el combobox de institución de origen en modo edición.
  const { data: catalogs } = useReservationCatalogsQuery()
  const institutionItems = itemsWithValue(
    optionsToItems(catalogs?.institutions ?? []),
    current.originInstitution,
  )

  function patch(changes: Partial<Enrollment>) {
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  function handleEdit() {
    setDraft(enrollment)
    setAttemptedSave(false)
  }

  function handleCancel() {
    setDraft(null)
    setAttemptedSave(false)
  }

  function handleSave() {
    if (!draft) return
    if (Object.keys(errors).length > 0) {
      setAttemptedSave(true)
      return
    }
    updateMutation.mutate(draft)
  }

  const fullName = `${enrollment.firstName} ${enrollment.lastName}`

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && variant === "pencil") setDraft(enrollment)
        if (!next) {
          setDraft(null)
          setAttemptedSave(false)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={variant === "pencil" ? `Editar ${fullName}` : `Ver detalle de ${fullName}`}
          />
        }
      >
        {variant === "pencil" ? <PencilIcon /> : <EyeIcon />}
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="flex sm:max-w-5xl max-h-[90vh] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 flex-row items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <DialogTitle>Inscripción</DialogTitle>
            <Badge {...ENROLLMENT_STATUS_BADGE[enrollment.status]}>
              {ENROLLMENT_STATUS_LABELS[enrollment.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Guardar cambios"
                  disabled={updateMutation.isPending}
                  aria-busy={updateMutation.isPending}
                  onClick={handleSave}
                >
                  {updateMutation.isPending ? (
                    <SpinnerIcon className="animate-spin" />
                  ) : (
                    <CheckIcon />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Cancelar edición"
                  disabled={updateMutation.isPending}
                  onClick={handleCancel}
                >
                  <XIcon />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label="Editar"
                  onClick={handleEdit}
                >
                  <PencilIcon />
                </Button>
                <DeleteEnrollmentDialog enrollment={enrollment} />
              </>
            )}
          </div>
        </DialogHeader>

        {/* Único bloque con scroll: header y footer quedan fijos afuera. */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex flex-col gap-4">
          {/* ── Datos del estudiante ─────────────────────────────────────────── */}
          <Section title="Datos del estudiante">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="documentType"
                label="Tipo de documento*"
                value={current.documentType}
                options={DOCUMENT_TYPE_ITEMS}
                editing={editing}
                onChange={(documentType) => patch({ documentType })}
                error={attemptedSave ? errors.documentType : undefined}
              />
              <DetailField
                name="documentNumber"
                label="Número de documento*"
                value={current.documentNumber}
                editing={editing}
                onChange={(documentNumber) => patch({ documentNumber })}
                error={attemptedSave ? errors.documentNumber : undefined}
              />
              <DetailField
                name="firstName"
                label="Primer nombre*"
                value={current.firstName}
                editing={editing}
                onChange={(firstName) => patch({ firstName })}
                error={attemptedSave ? errors.firstName : undefined}
              />
              <DetailField
                name="secondName"
                label="Segundo nombre"
                value={current.secondName}
                editing={editing}
                onChange={(secondName) => patch({ secondName })}
              />

              <DetailField
                name="lastName"
                label="Primer apellido*"
                value={current.lastName}
                editing={editing}
                onChange={(lastName) => patch({ lastName })}
                error={attemptedSave ? errors.lastName : undefined}
              />
              <DetailField
                name="secondLastName"
                label="Segundo apellido"
                value={current.secondLastName}
                editing={editing}
                onChange={(secondLastName) => patch({ secondLastName })}
              />
              <DetailField
                name="birthDate"
                label="Fecha de nacimiento*"
                type="date"
                value={editing ? current.birthDate : formatDate(current.birthDate)}
                editing={editing}
                onChange={(birthDate) => patch({ birthDate })}
                error={attemptedSave ? errors.birthDate : undefined}
              />
              <DetailField
                name="gender"
                label="Género*"
                value={current.gender}
                options={GENDER_ITEMS}
                editing={editing}
                onChange={(gender) => patch({ gender })}
                error={attemptedSave ? errors.gender : undefined}
              />

              <DetailField
                name="email"
                label="Correo electrónico"
                value={current.email}
                editing={editing}
                onChange={(email) => patch({ email })}
                error={attemptedSave ? errors.email : undefined}
              />
              <DetailField
                name="phone"
                label="Teléfono"
                value={current.phone}
                editing={editing}
                onChange={(phone) => patch({ phone })}
              />
              <DetailField
                name="residence"
                label="Lugar de residencia"
                value={current.residence}
                options={RESIDENCE_ITEMS}
                editing={editing}
                onChange={(residence) => patch({ residence })}
              />
              <DetailField
                name="address"
                label="Dirección"
                value={current.address}
                editing={editing}
                onChange={(address) => patch({ address })}
              />

              <DetailField
                name="grade"
                label="Grado al que aspira"
                value={String(current.grade)}
                options={GRADE_ITEMS}
                editing={editing}
                onChange={(grade) => patch({ grade: Number(grade) })}
              />
              <SedeEducativaField
                value={current.campus}
                shiftLabel={shiftLabel}
                editing={editing}
                onSelect={(campus) => patch({ campus: campus.name, shift: shiftKeyFromLabel(campus.shift) })}
              />
            </div>
          </Section>

          {/* ── Institución educativa de origen ──────────────────────────────── */}
          <Section title="Datos de la institución educativa de origen">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="originInstitution"
                label="Institución educativa"
                value={current.originInstitution}
                options={institutionItems}
                editing={editing}
                onChange={(originInstitution) => patch({ originInstitution })}
              />
              <DetailField
                name="originEmail"
                label="Correo electrónico"
                value={current.originEmail}
                editing={editing}
                onChange={(originEmail) => patch({ originEmail })}
              />
              <DetailField
                name="originShift"
                label="Jornada"
                value={originShiftLabel}
                options={SHIFT_ITEMS}
                editing={editing}
                onChange={(originShift) => {
                  const entry = Object.entries(SHIFT_LABELS).find(([, label]) => label === originShift)
                  patch({ originShift: entry?.[0] ?? originShift })
                }}
              />
              <DetailField
                name="originEducationLevel"
                label="Nivel educativo"
                value={originEducationLevelLabel}
                options={EDUCATION_LEVEL_ITEMS}
                editing={editing}
                onChange={(originEducationLevel) => {
                  const entry = Object.entries(EDUCATION_LEVEL_LABELS).find(
                    ([, label]) => label === originEducationLevel,
                  )
                  patch({ originEducationLevel: entry?.[0] ?? originEducationLevel })
                }}
              />
            </div>
          </Section>

          {/* ── Datos del acudiente ───────────────────────────────────────────── */}
          <Section title="Datos del acudiente">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="guardianDocumentType"
                label="Tipo de documento*"
                value={current.guardianDocumentType}
                options={DOCUMENT_TYPE_ITEMS}
                editing={editing}
                onChange={(guardianDocumentType) => patch({ guardianDocumentType })}
                error={attemptedSave ? errors.guardianDocumentType : undefined}
              />
              <DetailField
                name="guardianDocumentNumber"
                label="Número de documento*"
                value={current.guardianDocumentNumber}
                editing={editing}
                onChange={(guardianDocumentNumber) => patch({ guardianDocumentNumber })}
                error={attemptedSave ? errors.guardianDocumentNumber : undefined}
              />
              <DetailField
                name="guardianFirstName"
                label="Primer nombre*"
                value={current.guardianFirstName}
                editing={editing}
                onChange={(guardianFirstName) => patch({ guardianFirstName })}
                error={attemptedSave ? errors.guardianFirstName : undefined}
              />
              <DetailField
                name="guardianSecondName"
                label="Segundo nombre"
                value={current.guardianSecondName}
                editing={editing}
                onChange={(guardianSecondName) => patch({ guardianSecondName })}
              />

              <DetailField
                name="guardianLastName"
                label="Primer apellido*"
                value={current.guardianLastName}
                editing={editing}
                onChange={(guardianLastName) => patch({ guardianLastName })}
                error={attemptedSave ? errors.guardianLastName : undefined}
              />
              <DetailField
                name="guardianSecondLastName"
                label="Segundo apellido"
                value={current.guardianSecondLastName}
                editing={editing}
                onChange={(guardianSecondLastName) => patch({ guardianSecondLastName })}
              />
              <DetailField
                name="guardianLivesWithStudent"
                label="Convive con el estudiante*"
                value={current.guardianLivesWithStudent ? "Si" : "No"}
                options={LIVES_WITH_STUDENT_ITEMS}
                editing={editing}
                onChange={(livesWithStudent) => {
                  patch({ guardianLivesWithStudent: livesWithStudent === "Si" })
                }}
              />
              <DetailField
                name="guardianRelationship"
                label="Parentesco*"
                value={current.guardianRelationship}
                options={RELATIONSHIP_ITEMS}
                editing={editing}
                onChange={(guardianRelationship) => patch({ guardianRelationship })}
                error={attemptedSave ? errors.guardianRelationship : undefined}
              />

              <DetailField
                name="guardianEmail"
                label="Correo electrónico"
                value={current.guardianEmail}
                editing={editing}
                onChange={(guardianEmail) => patch({ guardianEmail })}
                error={attemptedSave ? errors.guardianEmail : undefined}
              />
              <DetailField
                name="guardianPhone"
                label="Teléfono*"
                value={current.guardianPhone}
                editing={editing}
                onChange={(guardianPhone) => patch({ guardianPhone })}
              />
              <DetailField
                name="guardianAddress"
                label="Dirección*"
                value={current.guardianAddress}
                editing={editing}
                onChange={(guardianAddress) => patch({ guardianAddress })}
              />
            </div>
          </Section>
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-center">
          <DialogClose render={<Button size="sm" variant="fill" color="neutral" />}>
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
