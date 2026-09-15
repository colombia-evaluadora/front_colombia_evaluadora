"use no memo"

import { useState } from "react"

import { CheckIcon, EyeIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"
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
import { useUpdatePreMatricula } from "@/features/coverage/api/mutations/update-pre-matricula"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
import { DeletePreMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-delete-pre-matricula"
import type { PreMatricula } from "@/features/coverage/api/types/pre-matricula"
import type { Shift, EducationLevel } from "@/features/coverage/api/types/reservation"

interface DetailPreMatriculaDialogProps {
  preMatricula: PreMatricula
  /** "eye" abre el detalle en lectura; "pencil" abre directo en edición. */
  variant?: "eye" | "pencil"
}

function formatBirthDate(isoDate: string): string {
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
}: FieldProps) {
  if (editing && onChange && name) {
    return (
      <Field variant="outlined" className="gap-2">
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        {options ? (
          <ComboboxField
            value={value ?? ""}
            onValueChange={(v) => onChange(v ?? "")}
            items={itemsWithValue(options, value)}
          >
            <ComboboxFieldTrigger id={name} size="sm" className="w-full" disabled={disabled}>
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
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? "—"}</span>
    </div>
  )
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

export function DetailPreMatriculaDialog({
  preMatricula,
  variant = "eye",
}: DetailPreMatriculaDialogProps) {
  const [open, setOpen] = useState(false)
  /** Borrador en edición; `null` = modo lectura. */
  const [draft, setDraft] = useState<PreMatricula | null>(null)
  const { notify } = useNotify()

  const editing = draft !== null
  const current = draft ?? preMatricula

  const updateMutation = useUpdatePreMatricula({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Registro de prematrícula actualizado correctamente.")
        setDraft(null)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const shiftLabel = SHIFT_LABELS[current.shift as Shift] ?? current.shift
  const levelLabel =
    EDUCATION_LEVEL_LABELS[current.educationLevel as EducationLevel] ?? current.educationLevel

  // Catálogos compartidos con el formulario de reserva: instituciones, sedes
  // y grupos disponibles para los combobox del modo edición.
  const { data: catalogs } = useReservationCatalogsQuery()
  const institutionItems = itemsWithValue(
    optionsToItems(catalogs?.institutions ?? []),
    current.institution,
  )
  const campusItems = itemsWithValue(optionsToItems(catalogs?.campuses ?? []), current.campus)
  const groupItems = itemsWithValue(optionsToItems(catalogs?.groups ?? []), current.group)

  function patch(changes: Partial<PreMatricula>) {
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev))
  }

  function handleEdit() {
    setDraft(preMatricula)
  }

  function handleCancel() {
    setDraft(null)
  }

  function handleSave() {
    if (draft) {
      updateMutation.mutate(draft)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next && variant === "pencil") setDraft(preMatricula)
        if (!next) setDraft(null)
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={
              variant === "pencil"
                ? `Editar ${preMatricula.firstName} ${preMatricula.lastName}`
                : `Ver detalle de ${preMatricula.firstName} ${preMatricula.lastName}`
            }
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
          <DialogTitle>Pre-Matrícula</DialogTitle>
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
                <DeletePreMatriculaDialog preMatricula={preMatricula} />
              </>
            )}
          </div>
        </DialogHeader>

        {/* Único bloque con scroll: header y footer quedan fijos afuera —
            antes `overflow-y-auto` vivía en el `DialogContent` entero, así
            que scrollear el detalle se llevaba el título y los botones con
            él. */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex flex-col gap-4">
          {/* ── Datos del estudiante ─────────────────────────────────────────── */}
          <Section title="Datos del estudiante">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="documentType"
                label="Tipo de documento"
                value={current.documentType}
                options={DOCUMENT_TYPE_ITEMS}
                editing={editing}
                onChange={(documentType) => patch({ documentType })}
              />
              <DetailField
                name="documentNumber"
                label="Número de documento"
                value={current.documentNumber}
                editing={editing}
                onChange={(documentNumber) => patch({ documentNumber })}
              />
              <DetailField
                name="firstName"
                label="Primer nombre"
                value={current.firstName}
                editing={editing}
                onChange={(firstName) => patch({ firstName })}
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
                label="Primer apellido"
                value={current.lastName}
                editing={editing}
                onChange={(lastName) => patch({ lastName })}
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
                label="Fecha de nacimiento"
                type="date"
                value={editing ? current.birthDate : formatBirthDate(current.birthDate)}
                editing={editing}
                onChange={(birthDate) => patch({ birthDate })}
              />
              <DetailField
                name="gender"
                label="Género"
                value={current.gender}
                options={GENDER_ITEMS}
                editing={editing}
                onChange={(gender) => patch({ gender })}
              />

              <DetailField
                name="email"
                label="Correo electrónico"
                value={current.email}
                editing={editing}
                onChange={(email) => patch({ email })}
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
                label="Grado"
                value={String(current.grade)}
                options={GRADE_ITEMS}
                editing={editing}
                onChange={(grade) => patch({ grade: Number(grade) })}
              />
              <DetailField
                name="campus"
                label="Sede"
                value={current.campus}
                options={campusItems}
                editing={editing}
                onChange={(campus) => patch({ campus })}
              />
              <div />
              <DetailField
                name="group"
                label="Grupo"
                value={current.group}
                options={groupItems}
                editing={editing}
                onChange={(group) => patch({ group })}
              />
            </div>
          </Section>

          {/* ── Institución educativa de origen ──────────────────────────────── */}
          <Section title="Datos de la institución educativa de origen">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="institution"
                label="Institución educativa"
                value={current.institution}
                options={institutionItems}
                editing={editing}
                onChange={(institution) => patch({ institution })}
              />
              <DetailField
                name="originCampus"
                label="Sede"
                value={current.campus}
                options={campusItems}
                editing={editing}
                onChange={(campus) => patch({ campus })}
              />
              <DetailField
                name="shift"
                label="Jornada:"
                value={shiftLabel}
                options={SHIFT_ITEMS}
                editing={editing}
                onChange={(shift) => {
                  const entry = Object.entries(SHIFT_LABELS).find(([, label]) => label === shift)
                  patch({ shift: entry?.[0] ?? shift })
                }}
              />
              <DetailField
                name="educationLevel"
                label="Nivel educativo"
                value={levelLabel}
                options={EDUCATION_LEVEL_ITEMS}
                editing={editing}
                onChange={(educationLevel) => {
                  const entry = Object.entries(EDUCATION_LEVEL_LABELS).find(
                    ([, label]) => label === educationLevel,
                  )
                  patch({ educationLevel: entry?.[0] ?? educationLevel })
                }}
              />
            </div>
          </Section>

          {/* ── Datos del acudiente ───────────────────────────────────────────── */}
          <Section title="Datos del acudiente">
            <div className="grid grid-cols-4 gap-x-4 gap-y-4">
              <DetailField
                name="guardianDocumentType"
                label="Tipo de documento"
                value={current.guardianDocumentType}
                options={DOCUMENT_TYPE_ITEMS}
                editing={editing}
                onChange={(guardianDocumentType) => patch({ guardianDocumentType })}
              />
              <DetailField
                name="guardianDocumentNumber"
                label="Número de documento"
                value={current.guardianDocumentNumber}
                editing={editing}
                onChange={(guardianDocumentNumber) => patch({ guardianDocumentNumber })}
              />
              <DetailField
                name="guardianFirstName"
                label="Primer nombre"
                value={current.guardianFirstName}
                editing={editing}
                onChange={(guardianFirstName) => patch({ guardianFirstName })}
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
                label="Primer apellido"
                value={current.guardianLastName}
                editing={editing}
                onChange={(guardianLastName) => patch({ guardianLastName })}
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
              />

              <DetailField
                name="guardianEmail"
                label="Correo electrónico"
                value={current.guardianEmail}
                editing={editing}
                onChange={(guardianEmail) => patch({ guardianEmail })}
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
