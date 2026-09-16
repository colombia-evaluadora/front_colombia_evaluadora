import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { getErrorMessage } from "@/lib/api-client"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SpinnerIcon } from "@/components/ui/icons"

import { AreaSelect, type AreaSelection } from "@/features/establishment/academic-period/components/area-select"
import { ColorPickerPopover } from "@/features/establishment/academic-period/components/color-picker"
import { EspecialidadSelect } from "@/features/establishment/academic-period/components/especialidad-select"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import { useGeneralAreasQuery } from "@/features/establishment/academic-period/api/query/use-general-areas"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { usePeriodAreasQuery } from "@/features/establishment/academic-period/api/query/use-period-areas"
import { useSubjectDetailsQuery } from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { createSubject } from "@/features/establishment/academic-period/api/mutations/create-subject"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/components/schedule-data"

interface QuickCreateSubjectDialogProps {
  academicPeriodId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (subject: { id: number; nombreInterno: string }) => void
  isPreescolar?: boolean
  subjectLabel?: string
}

const EMPTY_AREA_SELECTION: AreaSelection = { mode: "new", nombre: "" }

export function QuickCreateSubjectDialog({
  academicPeriodId,
  open,
  onOpenChange,
  onSaved,
  isPreescolar,
  subjectLabel = "Asignatura",
}: QuickCreateSubjectDialogProps) {
  const queryClient = useQueryClient()
  const subjectWord = subjectLabel.toLowerCase()
  const subjectWordCap = subjectLabel

  const [notice, setNotice] = useState<{ message: string; variant: NoticeVariant } | null>(null)
  const [asignaturaGeneral, setAsignaturaGeneral] = useState("")
  const [nombre, setNombre] = useState("")
  const [abreviacion, setAbreviacion] = useState("")
  const [ordenReportes, setOrdenReportes] = useState<number>(NaN)
  const [color, setColor] = useState(DEFAULT_SUBJECT_COLOR)
  const [especialidad, setEspecialidad] = useState("")
  const [areaSelection, setAreaSelection] = useState<AreaSelection>(EMPTY_AREA_SELECTION)

  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const areaGeneralNameToId = (nombreArea: string): number | null => {
    const match = generalAreas.find((a) => a.nombre === nombreArea)
    return match ? match.id : null
  }
  const fallbackGeneralAreaId = generalAreas[0]?.id

  const createAreaSubject = useCreateAreaSubject()
  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)
  const { data: especialidades = [] } = useEspecialidadesQuery(academicPeriodId)
  const { data: periodAreas = [] } = usePeriodAreasQuery(academicPeriodId)
  const especialidadNombreToId = (nombreEsp: string): number | undefined =>
    especialidades.find((e) => e.label === nombreEsp)?.id

  const nombreTrim = nombre.trim()

  const preescolarExistingArea = isPreescolar
    ? periodAreas.find((a) => a.label.trim().toUpperCase() === nombreTrim.toUpperCase())
    : undefined

  const resolvedAreaId = isPreescolar
    ? preescolarExistingArea?.id
    : areaSelection.mode === "existing"
      ? areaSelection.id
      : undefined
  const existingAreaSubjects =
    resolvedAreaId != null ? subjectDetails.filter((s) => s.areaId === resolvedAreaId) : []

  useEffect(() => {
    if (!open) return
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function reset() {
    setNotice(null)
    setAsignaturaGeneral("")
    setNombre("")
    setAbreviacion("")
    setOrdenReportes(NaN)
    setColor(DEFAULT_SUBJECT_COLOR)
    setEspecialidad("")
    setAreaSelection(EMPTY_AREA_SELECTION)
    setSubmitted(false)
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  const hasAreaSelection =
    isPreescolar || areaSelection.mode === "existing" || areaSelection.nombre.trim() !== ""

  const missingFields =
    (!isPreescolar && !asignaturaGeneral) ||
    !nombreTrim ||
    !abreviacion.trim() ||
    Number.isNaN(ordenReportes) ||
    !color.trim() ||
    !hasAreaSelection

  const duplicateAbreviacion = existingAreaSubjects.find(
    (s) => s.abreviacion.trim().toUpperCase() === abreviacion.trim().toUpperCase(),
  )
  const canSubmit = !missingFields && !duplicateAbreviacion

  async function handleSubmit() {
    setSubmitted(true)
    if (duplicateAbreviacion) {
      setNotice({
        message: `Ya existe una ${subjectWord} con la abreviación "${duplicateAbreviacion.abreviacion}" en esta área.`,
        variant: "error",
      })
      return
    }
    if (!canSubmit) return

    setIsSaving(true)
    setNotice(null)
    try {
      const subjectGeneralId = isPreescolar
        ? fallbackGeneralAreaId
        : (areaGeneralNameToId(asignaturaGeneral) ?? undefined)
      if (subjectGeneralId == null) return

      let areaId = resolvedAreaId
      if (areaId == null) {
        // El área no existe todavía: se crea reutilizando lo que ya se
        // completó para la asignatura (nombre, abreviación, orden,
        // clasificación general) — no se pregunta por separado.
        const areaNombre = isPreescolar ? nombreTrim : areaSelection.mode === "new" ? areaSelection.nombre.trim() : ""
        const areaResult = await createAreaSubject.mutateAsync({
          areaGeneral: String(subjectGeneralId),
          nombreInterno: areaNombre,
          abreviacion,
          ordenReportes,
          subjects: [],
          academicPeriodId,
        })
        areaId = areaResult.codigo
      }

      const subjectId = await createSubject({
        areaId,
        areaGeneralId: subjectGeneralId,
        nombreInterno: nombreTrim,
        abreviacion: abreviacion.trim(),
        ordenReportes,
        color,
        enfasisId: isPreescolar ? undefined : especialidadNombreToId(especialidad),
      })

      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["period-areas", academicPeriodId] })
      onSaved({ id: subjectId, nombreInterno: nombreTrim })
      close()
    } catch (error) {
      setNotice({ message: getErrorMessage(error), variant: "error" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isSaving) return
        if (!next) {
          close()
          return
        }
        onOpenChange(true)
      }}
    >
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Crear {subjectWord}</DialogTitle>
        </DialogHeader>

        <NoticeBanner
          notice={notice ? { id: 1, ...notice } : null}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
        />

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

          <Field variant="outlined" data-invalid={submitted && !nombreTrim}>
            <FieldLabel>Nombre de la {subjectWord}*</FieldLabel>
            <Input
              maxLength={130}
              placeholder="Agregar"
              value={nombre}
              onChange={(e) => setNombre(e.target.value.toUpperCase())}
              className="uppercase placeholder:normal-case"
              aria-invalid={submitted && !nombreTrim}
            />
          </Field>

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
              <ColorPickerPopover value={color} onChange={setColor} invalid={submitted && !color.trim()} />
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

          {!isPreescolar && (
            <Field variant="outlined" data-invalid={submitted && !hasAreaSelection}>
              <FieldLabel>Área*</FieldLabel>
              <AreaSelect
                academicPeriodId={academicPeriodId}
                value={areaSelection}
                onChange={setAreaSelection}
              />
            </Field>
          )}

          {isPreescolar && (
            <p className="text-xs text-muted-foreground">
              {preescolarExistingArea
                ? `Se agregará dentro del área "${preescolarExistingArea.label}" (ya creada).`
                : `Se creará un área nueva llamada "${nombreTrim || "…"}" para esta dimensión.`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" color="primary" disabled={isSaving} aria-busy={isSaving} onClick={handleSubmit}>
            {isSaving && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Guardar
          </Button>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={close} disabled={isSaving}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
