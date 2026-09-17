import { useMemo, useRef, useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useForm } from "@tanstack/react-form"
import {
  CaretLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ControlPointIcon,
  PencilIcon,
  PlusIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { Pagination } from "@/components/pagination"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  ACTIONS_CELL_CLASS,
  actionsOverlayClass,
  actionsSpacerCell,
  actionsSpacerHeadCell,
} from "@/components/table-row-actions"
import { FieldVariantContext } from "@/hooks/use-field-variant"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useGeneralAreasQuery } from "../../api/query/use-general-areas"
import { findGradeUsingSubject } from "@/features/establishment/academic-period/api/mutations/find-subject-usage"
import { useCreateAreaSubject } from "@/features/establishment/academic-period/api/mutations/create-area-subject"
import { useUpdateAreaSubject } from "@/features/establishment/academic-period/api/mutations/update-area-subject"
import type { AreaSubject, AreaSubjectItem } from "@/features/establishment/academic-period/api/types/area-subject"
import { AreaField } from "@/features/establishment/academic-period/components/area-field"
import { TableSortableHeader, sortBySortKey, type TableSort } from "@/components/table-sort-header"
import {
  SubjectNoticeBanner,
  type SubjectNotice,
} from "@/features/establishment/academic-period/components/subject-notice"
import {
  SubjectRowFields,
  emptyDraft,
  itemToDraft,
  type SubjectDraft,
} from "@/features/establishment/academic-period/components/subject-row-fields"
import { SelectGeneralAreaDialog } from "@/features/establishment/academic-period/components/dialogs/dialog-select-general-area"
import {
  areaSubjectFormSchema,
  type AreaSubjectFormValues,
} from "@/features/establishment/academic-period/api/schema"
import { useRowEdit } from "@/features/establishment/academic-period/hooks/use-row-edit"
import { DEFAULT_SUBJECT_COLOR } from "@/features/establishment/academic-period/components/schedule-data"

const FORM_ID = "area-subject-form"

type SortKey =
  | "asignaturaGeneral"
  | "nombreInterno"
  | "abreviacion"
  | "ordenReportes"
  | "color"
  | "especialidad"
type SortState = TableSort<SortKey>

interface AreaSubjectFormDialogProps {
  academicPeriodId?: number
  areaSubject?: AreaSubject
}

export function AreaSubjectFormDialog({
  academicPeriodId,
  areaSubject,
}: AreaSubjectFormDialogProps) {
  const isEdit = areaSubject != null

  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [subjectsStarted, setSubjectsStarted] = useState(isEdit)
  const [subjects, setSubjects] = useState<SubjectDraft[]>(
    () => areaSubject?.subjects.map(itemToDraft) ?? [],
  )
  const [draft, setDraft] = useState<SubjectDraft>(emptyDraft())
  const [draftInvalidFields, setDraftInvalidFields] = useState<Set<keyof SubjectDraft>>(new Set())
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set())
  const {
    editingKey: editingIndex,
    draft: editDraft,
    startEdit: startRowEdit,
    patchDraft: patchEditDraft,
    cancelEdit: cancelEditSubject,
  } = useRowEdit<SubjectDraft>()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  const [notice, setNotice] = useState<SubjectNotice | null>(null)
  const noticeIdRef = useRef(0)

  function showNotice(message: string, options?: { variant?: SubjectNotice["variant"] }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "info" })
  }

  const nombreInternoEditedRef = useRef(false)

  const areaDefaults: AreaSubjectFormValues = {
    areaGeneral: areaSubject?.areaGeneral ?? "",
    nombreInterno: areaSubject?.nombreInterno ?? "",
    abreviacion: areaSubject?.abreviacion ?? "",
    ordenReportes: areaSubject?.ordenReportes ?? 0,
  }

  const savedSnapshotRef = useRef({
    values: areaDefaults,
    subjects: areaSubject?.subjects.map(itemToDraft) ?? [],
  })

  const createAreaSubject = useCreateAreaSubject({
    mutationConfig: {
      onError: (error) => {
        showNotice(getErrorMessage(error), { variant: "error" })
      },
    },
  })
  const updateAreaSubject = useUpdateAreaSubject()
  const isPending = createAreaSubject.isPending || updateAreaSubject.isPending

  const { data: generalAreas = [] } = useGeneralAreasQuery()
  const areaGeneralNameToId = (nombre: string): string => {
    const match = generalAreas.find((a) => a.nombre === nombre)
    return match ? String(match.id) : ""
  }

  const form = useForm({
    defaultValues: areaDefaults,
    validators: { onSubmit: areaSubjectFormSchema },
    onSubmit: async ({ value }) => {
      const base = areaSubjectFormSchema.parse(value)

      const payloadSubjects: AreaSubjectItem[] = subjects.map((subject) => ({
        id: subject.id,
        asignaturaGeneral: areaGeneralNameToId(subject.asignaturaGeneral),
        nombreInterno: subject.nombreInterno || subject.asignaturaGeneral,
        abreviacion: subject.abreviacion,
        ordenReportes: subject.ordenReportes,
        color: subject.color || undefined,
        especialidad: subject.especialidad || undefined,
      }))

      if (isEdit) {
        const result = await updateAreaSubject.mutateAsync({
          codigo: areaSubject.codigo,
          values: {
            ...areaSubject,
            ...base,
            areaGeneral: areaGeneralNameToId(base.areaGeneral),
            subjects: payloadSubjects,
          },
        })

        if (result.status === "error") {
          showNotice(result.message, { variant: "error" })
          return
        }

        setOpen(false)
        notify(SUCCESS_MESSAGES.areaSubject.updated)
        return
      }

      await createAreaSubject.mutateAsync({
        areaGeneral: areaGeneralNameToId(base.areaGeneral),
        nombreInterno: base.nombreInterno,
        abreviacion: base.abreviacion,
        ordenReportes: base.ordenReportes,
        subjects: payloadSubjects,
        academicPeriodId,
      })

      savedSnapshotRef.current = { values: base, subjects }
      setSuccessOpen(true)
    },
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (isEdit) {
      resetEditForm()
    } else {
      resetCreateForm()
    }
  }

  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  function requestClose() {
    if (isPending) return
    const isDirty =
      JSON.stringify(form.state.values) !== JSON.stringify(savedSnapshotRef.current.values) ||
      JSON.stringify(subjects) !== JSON.stringify(savedSnapshotRef.current.subjects) ||
      JSON.stringify(draft) !== JSON.stringify(emptyDraft())
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  function resetEditForm() {
    form.reset()
    setSubjects(areaSubject?.subjects.map(itemToDraft) ?? [])
    setSubjectsStarted(true)
    setDraft(emptyDraft())
    setDraftInvalidFields(new Set())
    setSelectedIndexes(new Set())
    cancelEditSubject()
    setSort(null)
    setNotice(null)
    setPageIndex(0)
    nombreInternoEditedRef.current = false
    savedSnapshotRef.current = { values: areaDefaults, subjects: areaSubject?.subjects.map(itemToDraft) ?? [] }
  }

  function resetCreateForm() {
    form.reset()

    setSubjects([])
    setSubjectsStarted(false)
    setDraft(emptyDraft())
    setDraftInvalidFields(new Set())
    setSelectedIndexes(new Set())
    savedSnapshotRef.current = { values: areaDefaults, subjects: [] }

    cancelEditSubject()

    setConfirmOpen(false)
    setSort(null)
    setNotice(null)
    setPageIndex(0)
    nombreInternoEditedRef.current = false
  }


  const sortedSubjects = useMemo(() => sortBySortKey(subjects, sort), [subjects, sort])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const pageCount = Math.max(1, Math.ceil(sortedSubjects.length / pageSize))
  const clampedPageIndex = Math.min(pageIndex, pageCount - 1)
  const pagedSubjects = useMemo(
    () =>
      sortedSubjects.slice(
        clampedPageIndex * pageSize,
        clampedPageIndex * pageSize + pageSize,
      ),
    [sortedSubjects, clampedPageIndex, pageSize],
  )
  function changePageSize(size: number) {
    setPageSize(size)
    setPageIndex(0)
  }

  function startSubject(useAreaInfo: boolean) {
    const area = form.state.values
    setDraft(
      useAreaInfo
        ? {
          asignaturaGeneral: area.areaGeneral,
          nombreInterno: area.nombreInterno,
          abreviacion: area.abreviacion,
          ordenReportes: 1,
          color: DEFAULT_SUBJECT_COLOR,
          especialidad: "",
        }
        : emptyDraft(),
    )
    setDraftInvalidFields(new Set())
    setSubjectsStarted(true)
    setConfirmOpen(false)
  }

  function patchDraft(patch: Partial<SubjectDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }))
    if (draftInvalidFields.size > 0) {
      setDraftInvalidFields((prev) => {
        const next = new Set(prev)
        for (const key of Object.keys(patch)) next.delete(key as keyof SubjectDraft)
        return next
      })
    }
  }

  // El botón de agregar aparece apenas se toca algún campo del borrador —
  // la validación completa (y el resaltado de lo que falte) ocurre recién
  // al presionar el botón, en `commitDraft`.
  function isDraftTouched(value: SubjectDraft): boolean {
    return (
      value.asignaturaGeneral.trim() !== "" ||
      value.nombreInterno.trim() !== "" ||
      value.abreviacion.trim() !== "" ||
      Number.isFinite(value.ordenReportes) ||
      value.color.trim() !== "" ||
      value.especialidad.trim() !== ""
    )
  }

  // Campos obligatorios salvo `especialidad`: asignaturaGeneral, nombreInterno,
  // abreviación, orden y color son todos requeridos de forma independiente.
  function getMissingDraftFields(value: SubjectDraft): Set<keyof SubjectDraft> {
    const missing = new Set<keyof SubjectDraft>()
    if (!value.asignaturaGeneral.trim()) missing.add("asignaturaGeneral")
    if (!value.nombreInterno.trim()) missing.add("nombreInterno")
    if (!value.abreviacion.trim()) missing.add("abreviacion")
    if (!Number.isFinite(value.ordenReportes)) missing.add("ordenReportes")
    if (!value.color.trim()) missing.add("color")
    return missing
  }

  // El backend (`fn_subject_guardar_bulk`) rechaza abreviaciones repetidas
  // dentro de la misma área — se valida acá también para avisar antes de
  // guardar, no solo cuando falle el submit.
  function findDuplicateAbreviacion(
    abreviacion: string,
    excludeIndex?: number,
  ): SubjectDraft | undefined {
    const needle = abreviacion.trim().toUpperCase()
    if (!needle) return undefined
    return subjects.find(
      (item, i) => i !== excludeIndex && item.abreviacion.trim().toUpperCase() === needle,
    )
  }

  // El backend (`fn_subject_guardar_bulk`) rechaza nombre+énfasis repetidos
  // dentro de la misma área (409, "nombre, enfasis, area") — el nombre solo
  // puede repetirse entre énfasis distintos (V143), no con el mismo. Se
  // valida acá también para avisar antes de guardar.
  function findDuplicateNombreEnfasis(
    nombreInterno: string,
    especialidad: string,
    excludeIndex?: number,
  ): SubjectDraft | undefined {
    const needleNombre = nombreInterno.trim().toUpperCase()
    if (!needleNombre) return undefined
    const needleEnfasis = especialidad.trim().toUpperCase()
    return subjects.find(
      (item, i) =>
        i !== excludeIndex &&
        item.nombreInterno.trim().toUpperCase() === needleNombre &&
        item.especialidad.trim().toUpperCase() === needleEnfasis,
    )
  }

  function commitDraft() {
    const missing = getMissingDraftFields(draft)
    if (missing.size > 0) {
      setDraftInvalidFields(missing)
      showNotice("Completa los campos obligatorios resaltados.", { variant: "error" })
      return
    }
    if (findDuplicateAbreviacion(draft.abreviacion)) {
      showNotice(`Ya existe una asignatura con la abreviación "${draft.abreviacion}" en esta área.`, {
        variant: "error",
      })
      return
    }
    if (findDuplicateNombreEnfasis(draft.nombreInterno, draft.especialidad)) {
      showNotice(
        `Ya existe una asignatura con el nombre "${draft.nombreInterno}" y el mismo énfasis en esta área.`,
        { variant: "error" },
      )
      return
    }
    setSubjects((prev) => [...prev, draft])
    setDraft(emptyDraft())
    setDraftInvalidFields(new Set())
    showNotice("Asignatura agregada exitosamente.")
  }

  function shiftSelectionAfterRemoval(removedIndexes: number[]) {
    const removed = new Set(removedIndexes)
    setSelectedIndexes((prev) => {
      const next = new Set<number>()
      for (const index of prev) {
        if (removed.has(index)) continue
        const shift = removedIndexes.filter((r) => r < index).length
        next.add(index - shift)
      }
      return next
    })
  }

  async function removeSubject(index: number): Promise<boolean> {
    const subject = subjects[index]
    // Solo tiene sentido consultar si la asignatura ya existe en el
    // backend (tiene `id`) — una agregada en este mismo borrador no puede
    // estar todavía en ningún plan de estudio.
    if (isEdit && academicPeriodId != null && subject?.id != null) {
      const gradeName = await findGradeUsingSubject(academicPeriodId, subject.nombreInterno)
      if (gradeName) {
        showNotice(
          `No se puede quitar «${subject.nombreInterno}»: está en el plan de estudio del grado "${gradeName}".`,
          { variant: "error" },
        )
        return false
      }
    }
    setSubjects((prev) => prev.filter((_, i) => i !== index))
    shiftSelectionAfterRemoval([index])
    cancelEditSubject()
    showNotice("Asignatura eliminada exitosamente.")
    return true
  }

  function toggleSelectSubject(index: number, checked: boolean) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev)
      if (checked) next.add(index)
      else next.delete(index)
      return next
    })
  }

  function toggleSelectAllSubjects(checked: boolean) {
    setSelectedIndexes(checked ? new Set(subjects.map((_, i) => i)) : new Set())
  }

  async function removeSelectedSubjects(): Promise<boolean> {
    const count = selectedIndexes.size

    if (isEdit && academicPeriodId != null) {
      const toCheck = subjects
        .map((subject, index) => ({ subject, index }))
        .filter(({ subject, index }) => selectedIndexes.has(index) && subject.id != null)

      const checks = await Promise.all(
        toCheck.map(async ({ subject }) => ({
          subject,
          gradeName: await findGradeUsingSubject(academicPeriodId, subject.nombreInterno),
        })),
      )
      const blocked = checks.filter((c) => c.gradeName != null)
      if (blocked.length > 0) {
        showNotice(
          blocked.length === 1
            ? `No se puede quitar «${blocked[0].subject.nombreInterno}»: está en el plan de estudio del grado "${blocked[0].gradeName}".`
            : `No se pueden quitar ${blocked.length} asignaturas: siguen en un plan de estudio (${blocked
                .map((b) => `«${b.subject.nombreInterno}»`)
                .join(", ")}).`,
          { variant: "error" },
        )
        return false
      }
    }

    setSubjects((prev) => prev.filter((_, i) => !selectedIndexes.has(i)))
    setSelectedIndexes(new Set())
    cancelEditSubject()
    showNotice(
      count === 1 ? "Asignatura eliminada exitosamente." : `${count} asignaturas eliminadas exitosamente.`,
    )
    return true
  }

  function startEditSubject(index: number) {
    startRowEdit(index, subjects[index])
  }

  function saveEditSubject() {
    if (editingIndex === null || !editDraft) return
    if (!editDraft.asignaturaGeneral.trim() || !editDraft.nombreInterno.trim()) {
      showNotice("Elige una asignatura general y completa el nombre interno.", {
        variant: "error",
      })
      return
    }
    if (findDuplicateAbreviacion(editDraft.abreviacion, editingIndex)) {
      showNotice(
        `Ya existe una asignatura con la abreviación "${editDraft.abreviacion}" en esta área.`,
        { variant: "error" },
      )
      return
    }
    if (findDuplicateNombreEnfasis(editDraft.nombreInterno, editDraft.especialidad, editingIndex)) {
      showNotice(
        `Ya existe una asignatura con el nombre "${editDraft.nombreInterno}" y el mismo énfasis en esta área.`,
        { variant: "error" },
      )
      return
    }
    const next = editDraft
    setSubjects((prev) => prev.map((item, i) => (i === editingIndex ? next : item)))
    cancelEditSubject()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) handleOpenChange(true)
          else requestClose()
        }}
      >
        {isEdit ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
              }
            >
              <span className="sr-only">Editar área</span>
              <PencilIcon />
            </TooltipTrigger>
            <TooltipContent>Editar área</TooltipContent>
          </Tooltip>
        ) : (
          <DialogTrigger render={<Button color="primary" size="sm" />}>
            <ControlPointIcon data-icon="inline-start" />
            Agregar
          </DialogTrigger>
        )}

        <DialogContent
          className={cn(
            "flex max-h-[85vh] flex-col overflow-hidden p-0",
            subjectsStarted ? "sm:max-w-6xl" : "sm:max-w-5xl",
          )}
          showCloseButton={false}
          inert={confirmOpen || successOpen || confirmDiscardOpen}
        >
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{isEdit ? "Editar área/asignatura" : "Agregar área/asignatura"}</DialogTitle>
          </DialogHeader>

          {/* Único bloque con scroll: header y footer quedan fijos afuera, con
              su propio padding -- el `DialogContent` ya no tiene padding
              propio (`p-0`), así que el scroll queda al borde REAL del
              diálogo. */}
          <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex min-w-0 flex-col gap-6">
            <form
              id={FORM_ID}
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex flex-wrap items-end gap-4"
            >
              <form.Field name="areaGeneral">
                {(field) => (
                  <AreaField field={field} label="Área general*">
                    {(isInvalid) => (
                      <SelectGeneralAreaDialog
                        id={field.name}
                        value={field.state.value}
                        onChange={(value) => {
                          field.handleChange(value)
                          if (!nombreInternoEditedRef.current) {
                            form.setFieldValue("nombreInterno", value)
                          }
                        }}
                        invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="nombreInterno">
                {(field) => (
                  <AreaField field={field} label="Nombre interno del área*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        maxLength={130}
                        placeholder="Agregar"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          nombreInternoEditedRef.current = true
                          field.handleChange(e.target.value.toUpperCase())
                        }}
                        aria-invalid={isInvalid}
                        className="uppercase"
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="abreviacion">
                {(field) => (
                  <AreaField field={field} label="Abreviación*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        maxLength={30}
                        placeholder="Agregar"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Field name="ordenReportes">
                {(field) => (
                  <AreaField field={field} label="Orden en los reportes*">
                    {(isInvalid) => (
                      <Input
                        id={field.name}
                        type="number"
                        min={0}
                        max={9999}
                        step={1}
                        placeholder="Agregar"
                        value={Number.isNaN(field.state.value) ? "" : field.state.value}
                        onBlur={field.handleBlur}
                        // ORDEN_REPORTE es NUMERIC(4,0) — entero, sin
                        // decimales ni negativos.
                        onKeyDown={(e) => {
                          if (["-", "+", ".", ",", "e", "E"].includes(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) => {
                          const value = e.target.valueAsNumber
                          if (e.target.value === "" || !Number.isNaN(value)) {
                            field.handleChange(value)
                          }
                        }}
                        aria-invalid={isInvalid}
                      />
                    )}
                  </AreaField>
                )}
              </form.Field>

              <form.Subscribe
                selector={(state) => ({
                  areaGeneral: state.values.areaGeneral,
                  nombreInterno: state.values.nombreInterno,
                  abreviacion: state.values.abreviacion,
                  ordenReportes: state.values.ordenReportes,
                })}
              >
                {({ areaGeneral, nombreInterno, abreviacion, ordenReportes }) =>
                  !subjectsStarted &&
                    areaGeneral &&
                    nombreInterno &&
                    abreviacion &&
                    !Number.isNaN(ordenReportes) ? (
                    <div className="flex items-end">
                      <Button
                        type="button"
                        color="primary"
                        size="sm"
                        className="h-11"
                        onClick={() => {
                          setSubjectsStarted(true)
                          setConfirmOpen(true)
                        }}
                      >
                        <ControlPointIcon data-icon="inline-start" />
                        Añadir
                      </Button>
                    </div>
                  ) : null
                }
              </form.Subscribe>
            </form>

            <SubjectNoticeBanner key={notice?.id} notice={notice} onClose={() => setNotice(null)} />

            {subjectsStarted && (
              <div className="[&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:bg-background">
                {selectedIndexes.size > 0 && (
                  <div className="mb-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span>
                      {selectedIndexes.size === 1
                        ? "1 asignatura seleccionada"
                        : `${selectedIndexes.size} asignaturas seleccionadas`}
                    </span>
                    <ConfirmRemoveButton
                      label="Quitar seleccionadas"
                      description={
                        selectedIndexes.size === 1
                          ? "Se quitará la asignatura seleccionada. Esta acción no se puede deshacer."
                          : `Se quitarán las ${selectedIndexes.size} asignaturas seleccionadas. Esta acción no se puede deshacer.`
                      }
                      onConfirm={removeSelectedSubjects}
                    />
                  </div>
                )}
                <FieldVariantContext.Provider value="outlined">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                        <TableHead className="w-px text-foreground">
                          <Checkbox
                            aria-label="Seleccionar todas las asignaturas"
                            className="translate-y-0.5"
                            checked={
                              subjects.length > 0 && selectedIndexes.size === subjects.length
                            }
                            indeterminate={
                              selectedIndexes.size > 0 && selectedIndexes.size < subjects.length
                            }
                            disabled={subjects.length === 0}
                            onCheckedChange={(value) => toggleSelectAllSubjects(!!value)}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">#</TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Asignatura general"
                            sortKey="asignaturaGeneral"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Nombre interno"
                            sortKey="nombreInterno"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Abreviación"
                            sortKey="abreviacion"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Color"
                            sortKey="color"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        <TableHead className="text-foreground">
                          <TableSortableHeader
                            title="Especialidad"
                            sortKey="especialidad"
                            sort={sort}
                            onSortChange={setSort}
                          />
                        </TableHead>
                        {actionsSpacerHeadCell}
                        <TableHead className={cn(ACTIONS_CELL_CLASS, "text-foreground")}>
                          <span className="sr-only">Acciones</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedSubjects.map((subject, indexInPage) => {
                        const index = clampedPageIndex * pageSize + indexInPage
                        const realIndex = subjects.indexOf(subject)
                        const isEditing = editingIndex === realIndex && editDraft !== null

                        if (isEditing && editDraft) {
                          return (
                            <TableRow key={realIndex} className="group/row">
                              <TableCell>
                                <Checkbox
                                  aria-label={`Seleccionar asignatura ${index + 1}`}
                                  className="translate-y-0.5"
                                  checked={selectedIndexes.has(realIndex)}
                                  onCheckedChange={(value) =>
                                    toggleSelectSubject(realIndex, !!value)
                                  }
                                />
                              </TableCell>
                              <SubjectRowFields
                                draft={editDraft}
                                onPatch={patchEditDraft}
                                academicPeriodId={academicPeriodId}
                              />
                              {actionsSpacerCell}
                              <TableCell className={ACTIONS_CELL_CLASS}>
                                <div className={actionsOverlayClass(true)}>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          type="button"
                                          color="primary"
                                          size="icon-sm"
                                          aria-label="Guardar cambios"
                                          onClick={saveEditSubject}
                                        />
                                      }
                                    >
                                      <CheckIcon className="size-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>Guardar cambios</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger
                                      render={
                                        <Button
                                          type="button"
                                          variant="fill"
                                          color="neutral"
                                          size="icon-sm"
                                          aria-label="Cancelar edición"
                                          onClick={cancelEditSubject}
                                        />
                                      }
                                    >
                                      <XIcon className="size-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>Cancelar edición</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        }

                        return (
                          <TableRow key={realIndex} className="group/row">
                            <TableCell>
                              <Checkbox
                                aria-label={`Seleccionar asignatura ${index + 1}`}
                                className="translate-y-0.5"
                                checked={selectedIndexes.has(realIndex)}
                                onCheckedChange={(value) =>
                                  toggleSelectSubject(realIndex, !!value)
                                }
                              />
                            </TableCell>
                            <TableCell>{subject.ordenReportes}</TableCell>
                            <TableCell
                              className="max-w-40 truncate font-bold"
                              title={subject.asignaturaGeneral || undefined}
                            >
                              {subject.asignaturaGeneral || "—"}
                            </TableCell>
                            <TableCell
                              className="max-w-40 truncate font-bold"
                              title={subject.nombreInterno || undefined}
                            >
                              {subject.nombreInterno || "—"}
                            </TableCell>
                            <TableCell>{subject.abreviacion || "—"}</TableCell>
                            <TableCell>
                              {subject.color ? (
                                <span
                                  className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                                  style={{
                                    backgroundColor: subject.color.startsWith("#")
                                      ? subject.color
                                      : `#${subject.color}`,
                                  }}
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{subject.especialidad || "—"}</TableCell>
                            {actionsSpacerCell}
                            <TableCell className={ACTIONS_CELL_CLASS}>
                              <div className={actionsOverlayClass()}>
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        color="neutral"
                                        size="icon-sm"
                                        aria-label={`Editar asignatura ${index + 1}`}
                                        disabled={editingIndex !== null}
                                        onClick={() => startEditSubject(realIndex)}
                                      />
                                    }
                                  >
                                    <PencilIcon />
                                  </TooltipTrigger>
                                  <TooltipContent>{`Editar asignatura ${index + 1}`}</TooltipContent>
                                </Tooltip>
                                <ConfirmRemoveButton
                                  label={`Quitar asignatura ${index + 1}`}
                                  description={
                                    subject.asignaturaGeneral.trim()
                                      ? `Se quitará la asignatura «${subject.asignaturaGeneral}». Esta acción no se puede deshacer.`
                                      : "Se quitará la asignatura. Esta acción no se puede deshacer."
                                  }
                                  disabled={editingIndex !== null}
                                  onConfirm={() => removeSubject(realIndex)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      <TableRow className="group/row">
                        <TableCell />
                        <SubjectRowFields
                          draft={draft}
                          onPatch={patchDraft}
                          academicPeriodId={academicPeriodId}
                          invalidFields={draftInvalidFields}
                        />
                        {actionsSpacerCell}
                        <TableCell className={ACTIONS_CELL_CLASS}>
                          {isDraftTouched(draft) && (
                            <div className={actionsOverlayClass(true)}>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      color="primary"
                                      size="icon-sm"
                                      aria-label="Agregar asignatura a la lista"
                                      onClick={commitDraft}
                                    />
                                  }
                                >
                                  <PlusIcon weight="bold" />
                                </TooltipTrigger>
                                <TooltipContent>Agregar asignatura a la lista</TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </FieldVariantContext.Provider>
                <Pagination
                  pageIndex={clampedPageIndex}
                  pageCount={pageCount}
                  canPrev={clampedPageIndex > 0}
                  canNext={clampedPageIndex < pageCount - 1}
                  totalCount={sortedSubjects.length}
                  pageSize={pageSize}
                  onPageChange={setPageIndex}
                  onPageSizeChange={changePageSize}
                />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 px-6 pb-6 sm:justify-end">
            {subjectsStarted && (
              <Button
                size="sm"
                type="submit"
                color="primary"
                form={FORM_ID}
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            )}
            <Button
              size="sm"
              type="button"
              variant="fill"
              color="neutral"
              onClick={requestClose}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Prompt: precargar los datos del área o rellenar a mano. */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-5xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              ¿DESEA AGREGAR UNA ASIGNATURA UTILIZANDO LA MISMA INFORMACIÓN DE ESTA ÁREA?
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => startSubject(true)}>
              <CheckIcon data-icon="inline-start" />
              Sí
            </AlertDialogAction>
            <AlertDialogAction
              color="neutral"
              variant="outline"
              onClick={() => startSubject(false)}
            >
              <XIcon data-icon="inline-start" />
              No
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              Los datos se han guardado exitosamente.
            </AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogAction
              variant="fill"
              color="primary"
              onClick={() => {
                setSuccessOpen(false)
                setOpen(false)
              }}
            >
              <CaretLeftIcon data-icon="inline-start" />
              Regresar al listado
            </AlertDialogAction>

            <AlertDialogAction
              color="primary"
              onClick={() => {
                setSuccessOpen(false)
                resetCreateForm()
              }}
            >
              <CheckCircleIcon data-icon="inline-start" />
              Continuar agregando
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          handleOpenChange(false)
        }}
      />
    </>
  )
}
