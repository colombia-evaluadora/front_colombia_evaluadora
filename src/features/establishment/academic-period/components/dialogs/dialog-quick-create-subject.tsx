import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"
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
import { useSubjectDetailsQuery } from "@/features/establishment/academic-period/api/query/use-subject-details-query"
import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { createSubject } from "@/features/establishment/academic-period/api/mutations/create-subject"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/components/schedule-data"

interface QuickCreateSubjectDialogProps {
  academicPeriodId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (subject: { id: number; nombreInterno: string }) => void
  // Solución temporal de front: en preescolar se rotula como "dimensión" en
  // vez de "asignatura" — mismo modelo de datos, solo cambia el texto.
  isPreescolar?: boolean
}

const EMPTY_AREA_SELECTION: AreaSelection = { mode: "new", nombre: "" }

// Modal de creación rápida abierto desde el selector de "Asignaturas" del
// Plan de Estudio (comportamiento tipo `especialidad-select.tsx`: listado +
// "Crear" al fondo). A diferencia de `AreaSubjectFormDialog` (que siempre
// crea un área nueva), acá el usuario puede elegir un área ya existente del
// período — evita el error de "ya existe un área con ese nombre" cuando lo
// que realmente hace falta es agregarle una asignatura nueva a un área que
// ya está creada.
export function QuickCreateSubjectDialog({
  academicPeriodId,
  open,
  onOpenChange,
  onCreated,
  isPreescolar,
}: QuickCreateSubjectDialogProps) {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const subjectWord = isPreescolar ? "dimensión" : "asignatura"
  const subjectWordCap = isPreescolar ? "Dimensión" : "Asignatura"

  const [notice, setNotice] = useState<{ message: string; variant: NoticeVariant } | null>(null)
  const [areaSelection, setAreaSelection] = useState<AreaSelection>(EMPTY_AREA_SELECTION)

  // Campos del área (solo cuando `areaSelection.mode === "new"`). El orden
  // se reutiliza también para la asignatura homónima que se crea junto con
  // ella (creadas a la vez, no tiene sentido preguntarlo dos veces); el
  // color sí es propio de la asignatura (TAREA no tiene columna de color).
  const [areaGeneral, setAreaGeneral] = useState("")
  const [abreviacion, setAbreviacion] = useState("")
  const [ordenReportes, setOrdenReportes] = useState<number>(NaN)
  const [colorNuevaAsignatura, setColorNuevaAsignatura] = useState(DEFAULT_SUBJECT_COLOR)

  // Campos de la asignatura (solo cuando `areaSelection.mode === "existing"`).
  const [asignaturaGeneral, setAsignaturaGeneral] = useState("")
  const [nombreAsignatura, setNombreAsignatura] = useState("")
  const [abreviacionAsignatura, setAbreviacionAsignatura] = useState("")
  const [ordenReportesAsignatura, setOrdenReportesAsignatura] = useState<number>(NaN)
  const [colorAsignatura, setColorAsignatura] = useState(DEFAULT_SUBJECT_COLOR)
  const [especialidadAsignatura, setEspecialidadAsignatura] = useState("")
  const [especialidadNuevaAsignatura, setEspecialidadNuevaAsignatura] = useState("")

  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const areaGeneralNameToId = (nombre: string): number | null => {
    const match = generalAreas.find((a) => a.nombre === nombre)
    return match ? match.id : null
  }

  const createAreaSubject = useCreateAreaSubject()
  const { data: subjectDetails = [] } = useSubjectDetailsQuery(academicPeriodId)
  const { data: especialidades = [] } = useEspecialidadesQuery(academicPeriodId)
  const especialidadNombreToId = (nombre: string): number | undefined =>
    especialidades.find((e) => e.label === nombre)?.id
  const existingAreaSubjects =
    areaSelection.mode === "existing"
      ? subjectDetails.filter((s) => s.areaId === areaSelection.id)
      : []

  function reset() {
    setNotice(null)
    setAreaSelection(EMPTY_AREA_SELECTION)
    setAreaGeneral("")
    setAbreviacion("")
    setOrdenReportes(NaN)
    setColorNuevaAsignatura(DEFAULT_SUBJECT_COLOR)
    setAsignaturaGeneral("")
    setNombreAsignatura("")
    setAbreviacionAsignatura("")
    setOrdenReportesAsignatura(NaN)
    setColorAsignatura(DEFAULT_SUBJECT_COLOR)
    setEspecialidadAsignatura("")
    setEspecialidadNuevaAsignatura("")
    setSubmitted(false)
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  const isNewArea = areaSelection.mode === "new"
  const areaNombre = areaSelection.nombre.trim()

  const missingNewAreaFields =
    isNewArea &&
    (!areaNombre ||
      !areaGeneral ||
      !abreviacion ||
      Number.isNaN(ordenReportes) ||
      !colorNuevaAsignatura.trim())
  const missingExistingAreaFields =
    !isNewArea &&
    (!asignaturaGeneral ||
      !nombreAsignatura.trim() ||
      !abreviacionAsignatura.trim() ||
      Number.isNaN(ordenReportesAsignatura) ||
      !colorAsignatura.trim())
  // El backend (`fn_subject_crear`) rechaza abreviaciones repetidas dentro
  // de la misma área — se valida acá también para avisar antes de guardar,
  // ya que la lista de asignaturas del área ya está cargada en el modal.
  const duplicateAbreviacion = existingAreaSubjects.find(
    (s) => s.abreviacion.trim().toUpperCase() === abreviacionAsignatura.trim().toUpperCase(),
  )
  const canSubmit = isNewArea
    ? !missingNewAreaFields
    : !missingExistingAreaFields && !duplicateAbreviacion

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
      let subjectId: number
      let createdName: string

      if (isNewArea) {
        const areaGeneralId = areaGeneralNameToId(areaGeneral)
        if (areaGeneralId == null) return
        const areaResult = await createAreaSubject.mutateAsync({
          areaGeneral: String(areaGeneralId),
          nombreInterno: areaNombre,
          abreviacion,
          ordenReportes,
          subjects: [],
          academicPeriodId,
        })
        subjectId = await createSubject({
          areaId: areaResult.codigo,
          areaGeneralId,
          nombreInterno: areaNombre,
          abreviacion,
          ordenReportes,
          color: colorNuevaAsignatura,
          enfasisId: especialidadNombreToId(especialidadNuevaAsignatura),
        })
        createdName = areaNombre
      } else {
        const areaGeneralId = areaGeneralNameToId(asignaturaGeneral)
        if (areaGeneralId == null) return
        subjectId = await createSubject({
          areaId: areaSelection.id,
          areaGeneralId,
          nombreInterno: nombreAsignatura.trim(),
          abreviacion: abreviacionAsignatura.trim(),
          ordenReportes: ordenReportesAsignatura,
          color: colorAsignatura,
          enfasisId: especialidadNombreToId(especialidadAsignatura),
        })
        createdName = nombreAsignatura.trim()
      }

      queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
      queryClient.invalidateQueries({ queryKey: ["period-areas", academicPeriodId] })
      notify(SUCCESS_MESSAGES.areaSubject.created)
      onCreated({ id: subjectId, nombreInterno: createdName })
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
          <Field variant="outlined" data-invalid={submitted && !areaNombre && isNewArea}>
            <FieldLabel>Área*</FieldLabel>
            <AreaSelect
              academicPeriodId={academicPeriodId}
              value={areaSelection}
              onChange={setAreaSelection}
            />
          </Field>

          {areaSelection.mode === "existing" ? (
            <>
              {existingAreaSubjects.length > 0 && (
                <div className="min-w-0 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-foreground">
                    Esta área ya tiene{" "}
                    {existingAreaSubjects.length === 1
                      ? `esta ${subjectWord}`
                      : `estas ${subjectWord}s`}
                    :
                  </p>
                  <ul className="flex max-h-28 min-w-0 flex-col gap-0.5 overflow-y-auto">
                    {existingAreaSubjects.map((s) => {
                      const text = `${s.ordenReportes}. ${s.nombreInterno} (${s.abreviacion})${s.especialidad ? ` · ${s.especialidad}` : ""}`
                      return (
                        <li key={s.id} className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="inline-block size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10"
                            style={{
                              backgroundColor: s.color
                                ? s.color.startsWith("#")
                                  ? s.color
                                  : `#${s.color}`
                                : "transparent",
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate" title={text}>
                            {text}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              <Field variant="outlined" data-invalid={submitted && !asignaturaGeneral}>
                <FieldLabel>{subjectWordCap} general*</FieldLabel>
                <SelectGeneralAreaDialog
                  value={asignaturaGeneral}
                  onChange={setAsignaturaGeneral}
                  invalid={submitted && !asignaturaGeneral}
                />
              </Field>
              <Field variant="outlined" data-invalid={submitted && !nombreAsignatura.trim()}>
                <FieldLabel>Nombre de la {subjectWord}*</FieldLabel>
                <Input
                  maxLength={130}
                  placeholder="Agregar"
                  value={nombreAsignatura}
                  onChange={(e) => setNombreAsignatura(e.target.value.toUpperCase())}
                  className="uppercase placeholder:normal-case"
                  aria-invalid={submitted && !nombreAsignatura.trim()}
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field
                  variant="outlined"
                  data-invalid={submitted && (!abreviacionAsignatura.trim() || !!duplicateAbreviacion)}
                >
                  <FieldLabel>Abreviación*</FieldLabel>
                  <Input
                    maxLength={30}
                    placeholder="Agregar"
                    value={abreviacionAsignatura}
                    onChange={(e) => setAbreviacionAsignatura(e.target.value.toUpperCase())}
                    className="uppercase placeholder:normal-case"
                    aria-invalid={submitted && (!abreviacionAsignatura.trim() || !!duplicateAbreviacion)}
                  />
                </Field>
                <Field
                  variant="outlined"
                  data-invalid={submitted && Number.isNaN(ordenReportesAsignatura)}
                >
                  <FieldLabel>Orden*</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={9999}
                    step={1}
                    placeholder="Agregar"
                    value={Number.isNaN(ordenReportesAsignatura) ? "" : ordenReportesAsignatura}
                    onKeyDown={(e) => {
                      if (["-", "+", ".", ",", "e", "E"].includes(e.key)) e.preventDefault()
                    }}
                    onChange={(e) => {
                      const v = e.target.valueAsNumber
                      if (e.target.value === "" || !Number.isNaN(v)) setOrdenReportesAsignatura(v)
                    }}
                    aria-invalid={submitted && Number.isNaN(ordenReportesAsignatura)}
                  />
                </Field>
                <Field variant="outlined" data-invalid={submitted && !colorAsignatura.trim()}>
                  <FieldLabel>Color*</FieldLabel>
                  <ColorPickerPopover
                    value={colorAsignatura}
                    onChange={setColorAsignatura}
                    invalid={submitted && !colorAsignatura.trim()}
                  />
                </Field>
              </div>
              <Field variant="outlined">
                <FieldLabel>Especialidad</FieldLabel>
                <EspecialidadSelect
                  value={especialidadAsignatura}
                  academicPeriodId={academicPeriodId}
                  onChange={setEspecialidadAsignatura}
                />
              </Field>
            </>
          ) : areaNombre ? (
            <>
              <Field variant="outlined" data-invalid={submitted && !areaGeneral}>
                <FieldLabel>Área general*</FieldLabel>
                <SelectGeneralAreaDialog
                  value={areaGeneral}
                  onChange={setAreaGeneral}
                  invalid={submitted && !areaGeneral}
                />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field variant="outlined" data-invalid={submitted && !abreviacion}>
                  <FieldLabel>Abreviación*</FieldLabel>
                  <Input
                    maxLength={30}
                    placeholder="Agregar"
                    value={abreviacion}
                    onChange={(e) => setAbreviacion(e.target.value)}
                    aria-invalid={submitted && !abreviacion}
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
                <Field variant="outlined" data-invalid={submitted && !colorNuevaAsignatura.trim()}>
                  <FieldLabel>Color*</FieldLabel>
                  <ColorPickerPopover
                    value={colorNuevaAsignatura}
                    onChange={setColorNuevaAsignatura}
                    invalid={submitted && !colorNuevaAsignatura.trim()}
                  />
                </Field>
              </div>
              <Field variant="outlined">
                <FieldLabel>Especialidad</FieldLabel>
                <EspecialidadSelect
                  value={especialidadNuevaAsignatura}
                  academicPeriodId={academicPeriodId}
                  onChange={setEspecialidadNuevaAsignatura}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Se creará la {subjectWord} "{areaNombre}" dentro de esta área nueva, con el mismo orden y color de
                arriba.
              </p>
            </>
          ) : null}
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
