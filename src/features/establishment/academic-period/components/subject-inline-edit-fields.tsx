import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { getErrorMessage } from "@/lib/api-client"
import type { NoticeVariant } from "@/components/notice/notice-banner"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { ColorPickerPopover } from "@/features/establishment/academic-period/components/color-picker"
import { EspecialidadSelect } from "@/features/establishment/academic-period/components/especialidad-select"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import {
  useSubjectDetailsQuery,
  type SubjectDetail,
} from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { updateSubject } from "@/features/establishment/academic-period/api/mutations/update-subject"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/components/schedule-data"

interface SubjectInlineEditFieldsProps {
  subject: SubjectDetail
  nombre: string
  onNombreChange: (nombre: string) => void
  academicPeriodId?: number
  isPreescolar?: boolean
  onSaved: (subject: { id: number; nombreInterno: string }) => void
  notify: (message: string, options?: { variant?: NoticeVariant }) => void
  children?: ReactNode
}

export interface SubjectInlineEditFieldsHandle {
  save: () => Promise<boolean>
}

export const SubjectInlineEditFields = forwardRef<
  SubjectInlineEditFieldsHandle,
  SubjectInlineEditFieldsProps
>(function SubjectInlineEditFields(
  { subject, nombre, onNombreChange, academicPeriodId, isPreescolar, onSaved, notify, children },
  ref,
) {
  const subjectWord = isPreescolar ? "dimensión" : "asignatura"
  const subjectWordCap = isPreescolar ? "Dimensión" : "Asignatura"
  const queryClient = useQueryClient()

  const [asignaturaGeneral, setAsignaturaGeneral] = useState("")
  const [abreviacion, setAbreviacion] = useState("")
  const [ordenReportes, setOrdenReportes] = useState<number>(NaN)
  const [color, setColor] = useState(DEFAULT_SUBJECT_COLOR)
  const [especialidad, setEspecialidad] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)
  const { data: especialidades = [] } = useEspecialidadesQuery(academicPeriodId)
  const especialidadNombreToId = (nombreEsp: string): number | undefined =>
    especialidades.find((e) => e.label === nombreEsp)?.id
  const areaGeneralNameToId = (nombreArea: string): number | null => {
    const match = generalAreas.find((a) => a.nombre === nombreArea)
    return match ? match.id : null
  }

  // Snapshot de los valores originales, para saber si hay algo que guardar.
  const seededRef = useRef({
    asignaturaGeneral: "",
    nombre: "",
    abreviacion: "",
    ordenReportes: NaN,
    color: "",
    especialidad: "",
  })

  // Reseedea el formulario cada vez que cambia la asignatura seleccionada.
  useEffect(() => {
    const seeded = {
      asignaturaGeneral:
        generalAreas.find((a) => a.id === subject.asignaturaGeneralId)?.nombre ?? "",
      nombre: subject.nombreInterno,
      abreviacion: subject.abreviacion,
      ordenReportes: subject.ordenReportes,
      color: subject.color || DEFAULT_SUBJECT_COLOR,
      especialidad: subject.especialidad ?? "",
    }
    seededRef.current = seeded
    setAsignaturaGeneral(seeded.asignaturaGeneral)
    onNombreChange(seeded.nombre)
    setAbreviacion(seeded.abreviacion)
    setOrdenReportes(seeded.ordenReportes)
    setColor(seeded.color)
    setEspecialidad(seeded.especialidad)
    setSubmitted(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.id, generalAreas])

  const nombreTrim = nombre.trim()
  const existingAreaSubjects = subjectDetails.filter(
    (s) => s.areaId === subject.areaId && s.id !== subject.id,
  )
  const duplicateAbreviacion = existingAreaSubjects.find(
    (s) => s.abreviacion.trim().toUpperCase() === abreviacion.trim().toUpperCase(),
  )
  const missingFields =
    (!isPreescolar && !asignaturaGeneral) ||
    !nombreTrim ||
    !abreviacion.trim() ||
    Number.isNaN(ordenReportes) ||
    !color.trim()
  const canSubmit = !missingFields && !duplicateAbreviacion

  const isDirty =
    asignaturaGeneral !== seededRef.current.asignaturaGeneral ||
    nombreTrim !== seededRef.current.nombre ||
    abreviacion.trim() !== seededRef.current.abreviacion ||
    ordenReportes !== seededRef.current.ordenReportes ||
    color !== seededRef.current.color ||
    especialidad !== seededRef.current.especialidad

  async function save(): Promise<boolean> {
    if (!isDirty) return true

    setSubmitted(true)
    if (duplicateAbreviacion) {
      notify(
        `Ya existe una ${subjectWord} con la abreviación "${duplicateAbreviacion.abreviacion}" en esta área.`,
        { variant: "error" },
      )
      return false
    }
    if (!canSubmit) return false

    try {
      const subjectGeneralId = isPreescolar
        ? subject.asignaturaGeneralId
        : (areaGeneralNameToId(asignaturaGeneral) ?? undefined)
      if (subjectGeneralId == null) return false

      await updateSubject({
        subjectId: subject.id,
        areaGeneralId: subjectGeneralId,
        nombreInterno: nombreTrim,
        abreviacion: abreviacion.trim(),
        ordenReportes,
        color,
        enfasisId: isPreescolar ? undefined : especialidadNombreToId(especialidad),
      })
      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subject-details", academicPeriodId] })
      onSaved({ id: subject.id, nombreInterno: nombreTrim })
      return true
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
      return false
    }
  }

  useImperativeHandle(ref, () => ({ save }))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {!isPreescolar && (
        <Field variant="outlined" data-invalid={submitted && !asignaturaGeneral}>
          <FieldLabel>{subjectWordCap} general*</FieldLabel>
          <SelectGeneralAreaDialog
            value={asignaturaGeneral}
            onChange={setAsignaturaGeneral}
            invalid={submitted && !asignaturaGeneral}
          />
        </Field>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Field
          variant="outlined"
          data-invalid={submitted && (!abreviacion.trim() || !!duplicateAbreviacion)}
        >
          <FieldLabel>Abreviación*</FieldLabel>
          <Input
            maxLength={30}
            placeholder="Agregar"
            value={abreviacion}
            onChange={(e) => setAbreviacion(e.target.value.toUpperCase())}
            className="uppercase placeholder:normal-case"
            aria-invalid={submitted && (!abreviacion.trim() || !!duplicateAbreviacion)}
          />
        </Field>
        <Field variant="outlined" data-invalid={submitted && Number.isNaN(ordenReportes)}>
          <FieldLabel>Orden*</FieldLabel>
          <Input
            type="number"
            min={0}
            max={9999}
            step={1}
            placeholder="Agregar"
            value={Number.isNaN(ordenReportes) ? "" : ordenReportes}
            onKeyDown={(e) => {
              if (["-", "+", ".", ",", "e", "E"].includes(e.key)) e.preventDefault()
            }}
            onChange={(e) => {
              const v = e.target.valueAsNumber
              if (e.target.value === "" || !Number.isNaN(v)) setOrdenReportes(v)
            }}
            aria-invalid={submitted && Number.isNaN(ordenReportes)}
          />
        </Field>
        <Field variant="outlined" data-invalid={submitted && !color.trim()}>
          <FieldLabel>Color*</FieldLabel>
          <ColorPickerPopover
            value={color}
            onChange={setColor}
            invalid={submitted && !color.trim()}
          />
        </Field>
      </div>

      {!isPreescolar && (
        <Field variant="outlined">
          <FieldLabel>Especialidad</FieldLabel>
          <EspecialidadSelect
            value={especialidad}
            academicPeriodId={academicPeriodId}
            onChange={setEspecialidad}
          />
        </Field>
      )}

      {children}
    </div>
  )
})
