"use no memo"

import { useState } from "react"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleFillIcon,
  ControlPointIcon,
  PersonAddIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { DatePicker } from "@/components/date-picker"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Stepper } from "@/components/ui/stepper"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableSortableHeader, sortBySortKey, type TableSort } from "@/components/table-sort-header"
import { cn } from "@/lib/utils"
import { parseDateValue, formatDateValue } from "@/lib/date-time-value"

import {
  DOCUMENT_TYPE_OPTIONS,
  GENDER_OPTIONS,
  GRADE_OPTIONS,
  RELATIONSHIP_OPTIONS,
  RESIDENCE_OPTIONS,
} from "@/features/coverage/api/ui-mappings"
import { DOCUMENT_REGEX, EMAIL_REGEX } from "@/features/coverage/utils/matricula-form-defaults"
import { MOCK_CAMPUS_OPTIONS } from "@/features/coverage/utils/campus-options"

const STEP_LABELS = ["Datos del estudiante", "Datos del acudiente", "Establecimiento", "Confirmación"]

const LIVES_WITH_STUDENT_OPTIONS = ["Sí", "No"]

interface StudentFormData {
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  birthDate: string
  gender: string
  email: string
  phone: string
  residence: string
  address: string
  targetGrade: string
}

const EMPTY_STUDENT: StudentFormData = {
  documentType: "",
  documentNumber: "",
  firstName: "",
  secondName: "",
  lastName: "",
  secondLastName: "",
  birthDate: "",
  gender: "",
  email: "",
  phone: "",
  residence: "",
  address: "",
  targetGrade: "",
}

interface GuardianFormData {
  documentType: string
  documentNumber: string
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  livesWithStudent: string
  relationship: string
  email: string
  phone: string
  address: string
}

const EMPTY_GUARDIAN: GuardianFormData = {
  documentType: "",
  documentNumber: "",
  firstName: "",
  secondName: "",
  lastName: "",
  secondLastName: "",
  livesWithStudent: "",
  relationship: "",
  email: "",
  phone: "",
  address: "",
}

// Mismas reglas que la validación de matrícula (`validateMatricula`): formato
// de documento (3-10 dígitos), formato de correo y fecha de nacimiento no
// futura, además de los campos obligatorios de cada paso.
function studentStepErrors(student: StudentFormData): Partial<Record<keyof StudentFormData, string>> {
  const errors: Partial<Record<keyof StudentFormData, string>> = {}
  if (!student.documentType) errors.documentType = "Requerido."
  const documentNumber = student.documentNumber.trim()
  if (!documentNumber) errors.documentNumber = "Requerido."
  else if (!DOCUMENT_REGEX.test(documentNumber)) {
    errors.documentNumber = "El documento debe tener entre 3 y 10 dígitos."
  }
  if (!student.firstName.trim()) errors.firstName = "Requerido."
  if (!student.lastName.trim()) errors.lastName = "Requerido."
  if (!student.birthDate) errors.birthDate = "Requerido."
  else if (student.birthDate > new Date().toISOString().slice(0, 10)) {
    errors.birthDate = "La fecha no puede ser futura."
  }
  if (!student.gender) errors.gender = "Requerido."
  if (!student.targetGrade) errors.targetGrade = "Requerido."
  const email = student.email.trim()
  if (email && !EMAIL_REGEX.test(email)) errors.email = "Formato de correo electrónico inválido."
  return errors
}

function guardianStepErrors(guardian: GuardianFormData): Partial<Record<keyof GuardianFormData, string>> {
  const errors: Partial<Record<keyof GuardianFormData, string>> = {}
  if (!guardian.documentType) errors.documentType = "Requerido."
  const documentNumber = guardian.documentNumber.trim()
  if (!documentNumber) errors.documentNumber = "Requerido."
  else if (!DOCUMENT_REGEX.test(documentNumber)) {
    errors.documentNumber = "El documento debe tener entre 3 y 10 dígitos."
  }
  if (!guardian.firstName.trim()) errors.firstName = "Requerido."
  if (!guardian.lastName.trim()) errors.lastName = "Requerido."
  if (!guardian.relationship) errors.relationship = "Requerido."
  const email = guardian.email.trim()
  if (email && !EMAIL_REGEX.test(email)) errors.email = "Formato de correo electrónico inválido."
  return errors
}

function gradeToLevel(grade: number): string {
  if (Number.isNaN(grade)) return "—"
  if (grade === 0) return "Preescolar"
  if (grade <= 5) return "Básica primaria"
  if (grade <= 9) return "Básica secundaria"
  return "Media"
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date" | "email" | "tel"
  required?: boolean
  error?: string
}) {
  return (
    <Field variant="outlined" data-invalid={error ? "true" : undefined}>
      <FieldLabel>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input
        type={type}
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  required?: boolean
  error?: string
}) {
  const items = Object.fromEntries(options.map((option) => [option, option]))
  return (
    <Field variant="outlined" data-invalid={error ? "true" : undefined}>
      <FieldLabel>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <ComboboxField value={value} onValueChange={(next) => next && onChange(next)} items={items}>
        <ComboboxFieldTrigger className="w-full" aria-invalid={Boolean(error)}>
          <ComboboxFieldValue placeholder="Seleccionar" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {options.map((option) => (
            <ComboboxFieldItem key={option} value={option}>
              {option}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
      {error ? <FieldError errors={[{ message: error }]} /> : null}
    </Field>
  )
}

function SummaryField({
  label,
  value,
  uppercase = false,
}: {
  label: string
  value: string
  uppercase?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold text-foreground", uppercase && "uppercase")}>
        {value || "—"}
      </span>
    </div>
  )
}

export function AddEnrollmentDialog() {
  const [open, setOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [student, setStudent] = useState<StudentFormData>(EMPTY_STUDENT)
  const [guardian, setGuardian] = useState<GuardianFormData>(EMPTY_GUARDIAN)
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null)
  const [campusSort, setCampusSort] = useState<TableSort<"name" | "shift" | "gender">>(null)
  // Los errores se calculan siempre, pero solo se muestran después del primer
  // intento de "Continuar" del paso -- igual que `hasSubmitted` en el alta de
  // matrícula, para no pintar el formulario en rojo antes de que el usuario
  // empiece a completarlo.
  const [attemptedStudentStep, setAttemptedStudentStep] = useState(false)
  const [attemptedGuardianStep, setAttemptedGuardianStep] = useState(false)

  const selectedCampus = MOCK_CAMPUS_OPTIONS.find((campus) => campus.id === selectedCampusId) ?? null
  const sortedCampusOptions = sortBySortKey(MOCK_CAMPUS_OPTIONS, campusSort)
  const academicYear = new Date().getFullYear()

  function patchStudent(patch: Partial<StudentFormData>) {
    setStudent((prev) => ({ ...prev, ...patch }))
  }

  function patchGuardian(patch: Partial<GuardianFormData>) {
    setGuardian((prev) => ({ ...prev, ...patch }))
  }

  function resetForm() {
    setStep(0)
    setStudent(EMPTY_STUDENT)
    setGuardian(EMPTY_GUARDIAN)
    setSelectedCampusId(null)
    setAttemptedStudentStep(false)
    setAttemptedGuardianStep(false)
  }

  const studentErrors = studentStepErrors(student)
  const guardianErrors = guardianStepErrors(guardian)
  const canContinueStudent = Object.keys(studentErrors).length === 0
  const canContinueGuardian = Object.keys(guardianErrors).length === 0

  function handleContinueStudent() {
    if (!canContinueStudent) {
      setAttemptedStudentStep(true)
      return
    }
    setStep(1)
  }

  function handleContinueGuardian() {
    if (!canContinueGuardian) {
      setAttemptedGuardianStep(true)
      return
    }
    setStep(2)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger render={<Button type="button" variant="fill" color="primary" size="sm" />}>
        <ControlPointIcon data-icon="inline-start" />
        Agregar inscripción
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl"
      >
        {step < 3 && (
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>Agregar inscripción</DialogTitle>
          </DialogHeader>
        )}

        {/* Único bloque con scroll: header y los botones de abajo quedan
            fijos afuera, con su propio padding -- el `DialogContent` ya no
            tiene padding propio (`p-0`), así que el scroll queda al borde
            REAL del diálogo y es este `div` el que aporta el `px-6`. En el
            paso 3 no hay `DialogHeader` (arriba), así que este `div` es el
            PRIMER elemento del diálogo y necesita su propio `pt-6`. */}
        <div
          className={cn(
            "scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6",
            step >= 3 && "pt-6",
          )}
        >
        {step === 3 && selectedCampus ? (
          <div className="flex items-start gap-3">
            <CheckCircleFillIcon className="size-6 shrink-0 text-green" />
            <div>
              <p className="font-semibold text-foreground">
                La inscripción fue registrada correctamente.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                La inscripción del estudiante se ha registrado correctamente. El formato de inscripción
                será enviado al correo electrónico del acudiente.
              </p>
            </div>
          </div>
        ) : null}

        <Stepper steps={STEP_LABELS} currentStep={step} />

        {step === 0 ? (
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Tipo de documento"
              value={student.documentType}
              onChange={(value) => patchStudent({ documentType: value })}
              options={DOCUMENT_TYPE_OPTIONS}
              required
              error={attemptedStudentStep ? studentErrors.documentType : undefined}
            />
            <TextField
              label="Número de documento"
              value={student.documentNumber}
              onChange={(value) => patchStudent({ documentNumber: value })}
              required
              error={attemptedStudentStep ? studentErrors.documentNumber : undefined}
            />
            <TextField
              label="Primer nombre"
              value={student.firstName}
              onChange={(value) => patchStudent({ firstName: value })}
              required
              error={attemptedStudentStep ? studentErrors.firstName : undefined}
            />
            <TextField
              label="Segundo nombre"
              value={student.secondName}
              onChange={(value) => patchStudent({ secondName: value })}
            />
            <TextField
              label="Primer apellido"
              value={student.lastName}
              onChange={(value) => patchStudent({ lastName: value })}
              required
              error={attemptedStudentStep ? studentErrors.lastName : undefined}
            />
            <TextField
              label="Segundo apellido"
              value={student.secondLastName}
              onChange={(value) => patchStudent({ secondLastName: value })}
            />
            <Field
              variant="outlined"
              data-invalid={attemptedStudentStep && studentErrors.birthDate ? "true" : undefined}
            >
              <FieldLabel>Fecha de nacimiento*</FieldLabel>
              <DatePicker
                mode="date"
                maxDate={new Date()}
                aria-invalid={Boolean(attemptedStudentStep && studentErrors.birthDate)}
                value={parseDateValue(student.birthDate)}
                onChange={(date) => patchStudent({ birthDate: formatDateValue(date) ?? "" })}
              />
              {attemptedStudentStep && studentErrors.birthDate ? (
                <FieldError errors={[{ message: studentErrors.birthDate }]} />
              ) : null}
            </Field>
            <SelectField
              label="Género"
              value={student.gender}
              onChange={(value) => patchStudent({ gender: value })}
              options={GENDER_OPTIONS}
              required
              error={attemptedStudentStep ? studentErrors.gender : undefined}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={student.email}
              onChange={(value) => patchStudent({ email: value })}
              error={attemptedStudentStep ? studentErrors.email : undefined}
            />
            <TextField
              label="Teléfono"
              type="tel"
              value={student.phone}
              onChange={(value) => patchStudent({ phone: value })}
            />
            <SelectField
              label="Lugar de residencia"
              value={student.residence}
              onChange={(value) => patchStudent({ residence: value })}
              options={RESIDENCE_OPTIONS}
            />
            <TextField
              label="Dirección"
              value={student.address}
              onChange={(value) => patchStudent({ address: value })}
            />
            <SelectField
              label="Grado al que aspira"
              value={student.targetGrade}
              onChange={(value) => patchStudent({ targetGrade: value })}
              options={GRADE_OPTIONS.map((grade) => String(grade))}
              required
              error={attemptedStudentStep ? studentErrors.targetGrade : undefined}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Tipo de documento"
              value={guardian.documentType}
              onChange={(value) => patchGuardian({ documentType: value })}
              options={DOCUMENT_TYPE_OPTIONS}
              required
              error={attemptedGuardianStep ? guardianErrors.documentType : undefined}
            />
            <TextField
              label="Número de documento"
              value={guardian.documentNumber}
              onChange={(value) => patchGuardian({ documentNumber: value })}
              required
              error={attemptedGuardianStep ? guardianErrors.documentNumber : undefined}
            />
            <TextField
              label="Primer nombre"
              value={guardian.firstName}
              onChange={(value) => patchGuardian({ firstName: value })}
              required
              error={attemptedGuardianStep ? guardianErrors.firstName : undefined}
            />
            <TextField
              label="Segundo nombre"
              value={guardian.secondName}
              onChange={(value) => patchGuardian({ secondName: value })}
            />
            <TextField
              label="Primer apellido"
              value={guardian.lastName}
              onChange={(value) => patchGuardian({ lastName: value })}
              required
              error={attemptedGuardianStep ? guardianErrors.lastName : undefined}
            />
            <TextField
              label="Segundo apellido"
              value={guardian.secondLastName}
              onChange={(value) => patchGuardian({ secondLastName: value })}
            />
            <SelectField
              label="Convive con el estudiante"
              value={guardian.livesWithStudent}
              onChange={(value) => patchGuardian({ livesWithStudent: value })}
              options={LIVES_WITH_STUDENT_OPTIONS}
            />
            <SelectField
              label="Parentesco"
              value={guardian.relationship}
              onChange={(value) => patchGuardian({ relationship: value })}
              options={RELATIONSHIP_OPTIONS}
              required
              error={attemptedGuardianStep ? guardianErrors.relationship : undefined}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={guardian.email}
              onChange={(value) => patchGuardian({ email: value })}
              error={attemptedGuardianStep ? guardianErrors.email : undefined}
            />
            <TextField
              label="Teléfono"
              type="tel"
              value={guardian.phone}
              onChange={(value) => patchGuardian({ phone: value })}
            />
            <TextField
              label="Dirección"
              value={guardian.address}
              onChange={(value) => patchGuardian({ address: value })}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <Table containerClassName="rounded-md border">
            <TableHeader>
              <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                <TableHead className="w-10">
                  <span className="sr-only">Seleccionar</span>
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Sede educativa"
                    sortKey="name"
                    sort={campusSort}
                    onSortChange={setCampusSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Jornada"
                    sortKey="shift"
                    sort={campusSort}
                    onSortChange={setCampusSort}
                  />
                </TableHead>
                <TableHead className="text-foreground">
                  <TableSortableHeader
                    title="Género"
                    sortKey="gender"
                    sort={campusSort}
                    onSortChange={setCampusSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCampusOptions.map((campus) => {
                const isSelected = selectedCampusId === campus.id
                return (
                  <TableRow
                    key={campus.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setSelectedCampusId(campus.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        setSelectedCampusId(campus.id)
                      }
                    }}
                    className={cn("cursor-pointer outline-none", isSelected && "bg-muted-22")}
                  >
                    <TableCell>
                      <span
                        className={cn(
                          "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                          isSelected ? "border-primary" : "border-input",
                        )}
                      >
                        {isSelected ? <span className="size-2 rounded-full bg-primary" /> : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground uppercase">{campus.name}</span>
                        <span className="text-xs text-muted-foreground">{campus.address}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{campus.shift}</TableCell>
                    <TableCell className="text-muted-foreground">{campus.gender}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : null}

        {step === 3 && selectedCampus ? (
          <div className="rounded-md border border-border p-4">
            <div className="grid grid-cols-3 gap-x-4 gap-y-4">
              <SummaryField
                label="Nombres"
                value={`${student.firstName} ${student.secondName}`.trim()}
                uppercase
              />
              <SummaryField
                label="Apellidos"
                value={`${student.lastName} ${student.secondLastName}`.trim()}
                uppercase
              />
              <SummaryField label="Identificación" value={student.documentNumber} />
              <SummaryField label="Año académico" value={String(academicYear)} />
              <SummaryField label="Sede" value={selectedCampus.name} />
              <SummaryField label="Jornada" value={selectedCampus.shift} uppercase />
              <SummaryField
                label="Nivel"
                value={gradeToLevel(Number(student.targetGrade))}
                uppercase
              />
              <SummaryField label="Grado al que aspira" value={student.targetGrade} />
            </div>
          </div>
        ) : null}
        </div>

        <div className="flex shrink-0 justify-end gap-2 px-6 pb-6">
          {step === 0 ? (
            <>
              <Button type="button" color="primary" size="sm" onClick={handleContinueStudent}>
                Continuar
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => setStep(0)}>
                <ArrowLeftIcon data-icon="inline-start" />
                Datos del estudiante
              </Button>
              <Button type="button" color="primary" size="sm" onClick={handleContinueGuardian}>
                Continuar
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => setStep(1)}>
                <ArrowLeftIcon data-icon="inline-start" />
                Datos del acudiente
              </Button>
              {selectedCampus ? (
                <Button type="button" color="primary" size="sm" onClick={() => setStep(3)}>
                  Inscribir
                </Button>
              ) : null}
              <Button
                type="button"
                variant="fill"
                color="neutral"
                size="sm"
                onClick={() => setConfirmCancelOpen(true)}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <Button type="button" variant="outline" color="primary" size="sm" onClick={resetForm}>
                <PersonAddIcon data-icon="inline-start" />
                Realizar otra inscripción
              </Button>
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Finalizar
              </Button>
            </>
          ) : null}
        </div>
      </DialogContent>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la inscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderá toda la información ingresada en el formulario. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              color="primary"
              onClick={() => {
                setConfirmCancelOpen(false)
                setOpen(false)
              }}
            >
              Sí, cancelar
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral">
              No, continuar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
