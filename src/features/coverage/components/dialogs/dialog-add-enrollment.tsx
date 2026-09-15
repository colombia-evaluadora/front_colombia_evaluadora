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
import { Field, FieldLabel } from "@/components/ui/field"
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

interface CampusOption {
  id: string
  name: string
  address: string
  shift: string
  gender: string
}

// El catálogo real de sedes (`use-reservation-catalogs-query`) solo trae el
// nombre — todavía no hay endpoint que devuelva dirección/jornada/género por
// sede, así que se mockea acá, igual que otros catálogos pendientes del
// módulo (ver `MOCK_ORIGIN_PERIODS` en `add-matricula-page.tsx`).
const MOCK_CAMPUS_OPTIONS: CampusOption[] = [
  {
    id: "sede-1",
    name: "Aspaen Gimnasio Cartagena",
    address: "Carrera 91 # 40 190 - Getsemaní",
    shift: "Mañana",
    gender: "Masculino",
  },
  {
    id: "sede-2",
    name: "Colegio Británico de Cartagena",
    address: "Carrera 21 # 56 190 - La Matuna",
    shift: "Tarde",
    gender: "Femenino",
  },
  {
    id: "sede-3",
    name: "Gimnasio Altair",
    address: "Carrera 68 # 56 60 - El Laguito",
    shift: "Mañana",
    gender: "Mixto",
  },
  {
    id: "sede-4",
    name: "Colegio Jorge Washington",
    address: "Carrera 51 # 56 190 - Bocagrande",
    shift: "Jornada continua",
    gender: "Mixto",
  },
  {
    id: "sede-5",
    name: "Colegio Washington",
    address: "Carrera 71 # 98 50 - Manga",
    shift: "Jornada continua",
    gender: "Mixto",
  },
]

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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: "text" | "date" | "email" | "tel"
  required?: boolean
}) {
  return (
    <Field variant="outlined">
      <FieldLabel>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
  required?: boolean
}) {
  const items = Object.fromEntries(options.map((option) => [option, option]))
  return (
    <Field variant="outlined">
      <FieldLabel>
        {label}
        {required ? "*" : ""}
      </FieldLabel>
      <ComboboxField value={value} onValueChange={(next) => next && onChange(next)} items={items}>
        <ComboboxFieldTrigger className="w-full">
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
  }

  const canContinueStudent = Boolean(
    student.documentType &&
      student.documentNumber &&
      student.firstName &&
      student.lastName &&
      student.targetGrade,
  )
  const canContinueGuardian = Boolean(
    guardian.documentType && guardian.documentNumber && guardian.firstName && guardian.lastName,
  )

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
        className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl"
      >
        {step < 3 && (
          <DialogHeader className="shrink-0">
            <DialogTitle>Agregar inscripción</DialogTitle>
          </DialogHeader>
        )}

        {/* Único bloque con scroll: header y los botones de abajo quedan
            fijos afuera — antes `overflow-y-auto` vivía en el
            `DialogContent` entero, así que scrollear un paso largo del
            wizard se llevaba el título y los botones con él. */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
            />
            <TextField
              label="Número de documento"
              value={student.documentNumber}
              onChange={(value) => patchStudent({ documentNumber: value })}
              required
            />
            <TextField
              label="Primer nombre"
              value={student.firstName}
              onChange={(value) => patchStudent({ firstName: value })}
              required
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
            />
            <TextField
              label="Segundo apellido"
              value={student.secondLastName}
              onChange={(value) => patchStudent({ secondLastName: value })}
            />
            <Field variant="outlined">
              <FieldLabel>Fecha de nacimiento</FieldLabel>
              <DatePicker
                mode="date"
                maxDate={new Date()}
                value={parseDateValue(student.birthDate)}
                onChange={(date) => patchStudent({ birthDate: formatDateValue(date) ?? "" })}
              />
            </Field>
            <SelectField
              label="Género"
              value={student.gender}
              onChange={(value) => patchStudent({ gender: value })}
              options={GENDER_OPTIONS}
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={student.email}
              onChange={(value) => patchStudent({ email: value })}
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
            />
            <TextField
              label="Número de documento"
              value={guardian.documentNumber}
              onChange={(value) => patchGuardian({ documentNumber: value })}
              required
            />
            <TextField
              label="Primer nombre"
              value={guardian.firstName}
              onChange={(value) => patchGuardian({ firstName: value })}
              required
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
            />
            <TextField
              label="Correo electrónico"
              type="email"
              value={guardian.email}
              onChange={(value) => patchGuardian({ email: value })}
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

        <div className="flex shrink-0 justify-end gap-2">
          {step === 0 ? (
            <>
              {canContinueStudent ? (
                <Button type="button" color="primary" size="sm" onClick={() => setStep(1)}>
                  Continuar
                  <ArrowRightIcon data-icon="inline-end" />
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
          {step === 1 ? (
            <>
              <Button type="button" variant="outline" color="neutral" size="sm" onClick={() => setStep(0)}>
                <ArrowLeftIcon data-icon="inline-start" />
                Datos del estudiante
              </Button>
              {canContinueGuardian ? (
                <Button type="button" color="primary" size="sm" onClick={() => setStep(2)}>
                  Continuar
                  <ArrowRightIcon data-icon="inline-end" />
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
