import { useMemo, useState } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"

import { useExportStudyPlan } from "@/features/establishment/academic-period/api/mutations/export-study-plan"
import {
  useGradeOptionsQuery,
  useSubjectOptionsQuery,
} from "@/features/establishment/academic-period/api/query/use-study-plan-report-filters"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import type { ExportFormat } from "@/features/establishment/academic-period/api/types/study-plan"

interface ExportStudyPlanDialogProps {
  academicPeriodId?: number
}

// Igual que periodo académico/evaluación: el reporte reusa la MISMA función
// del listado (`fn_plan_reporte_listar`, sin paginar) que alimenta esta
// pantalla, pero cruzando TODOS los grados del periodo — no solo el grado que
// se está editando. Por eso los filtros (grado/asignatura/especialidad) viven
// en el propio diálogo en vez de heredar los de una tabla ya scopeada a un
// grado.
export function ExportStudyPlanDialog({ academicPeriodId }: ExportStudyPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const { notify } = useNotify()

  const { data: gradeOptions = [] } = useGradeOptionsQuery(open ? academicPeriodId : undefined)
  const { data: subjectOptions = [] } = useSubjectOptionsQuery(open ? academicPeriodId : undefined)
  const { data: specialtyOptions = [] } = useEspecialidadesQuery(open ? academicPeriodId : undefined)

  const gradeNames = useMemo(() => gradeOptions.map((o) => o.nombre), [gradeOptions])
  const subjectNames = useMemo(() => subjectOptions.map((o) => o.nombre), [subjectOptions])
  const specialtyNames = useMemo(() => specialtyOptions.map((o) => o.label), [specialtyOptions])

  const exportAll = useExportStudyPlan({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({
      format,
      filters: {
        academicPeriodId,
        gradeIds: gradeOptions
          .filter((o) => selectedGrades.includes(o.nombre))
          .map((o) => o.id),
        subjectIds: subjectOptions
          .filter((o) => selectedSubjects.includes(o.nombre))
          .map((o) => o.id),
        specialtyIds: specialtyOptions
          .filter((o) => selectedSpecialties.includes(o.label))
          .map((o) => o.id),
      },
    })
  }

  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            color="muted"
            size="icon-sm"
            aria-label="Exportar plan de estudio"
          />
        }
      >
        <FileDownloadOutlinedIcon />
      </DialogTrigger>
      {/* `forceRender`: este Dialog se abre anidado dentro del Dialog de
          crear/editar grado (ya abierto) — mismo fix que
          dialog-select-general-area.tsx. */}
      <DialogPortal>
        <DialogOverlay forceRender className="bg-black/30" />
      </DialogPortal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Filtra (opcional) y elige un formato para exportar el plan de estudio del periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Grado</FieldLabel>
            <SubjectsMultiSelect
              options={gradeNames}
              value={selectedGrades}
              onChange={setSelectedGrades}
              placeholder="Todos los grados"
              emptyMessage="No hay grados en este periodo."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Asignatura</FieldLabel>
            <SubjectsMultiSelect
              options={subjectNames}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
              placeholder="Todas las asignaturas"
              emptyMessage="No hay asignaturas en este periodo."
            />
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Especialidad</FieldLabel>
            <SubjectsMultiSelect
              options={specialtyNames}
              value={selectedSpecialties}
              onChange={setSelectedSpecialties}
              placeholder="Todas las especialidades"
              emptyMessage="No hay especialidades en este periodo."
            />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "excel"}
              onClick={() => handleExport("excel")}
            >
              {pendingFormat === "excel" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileXlsIcon data-icon="inline-start" />
              )}
              Excel
            </Button>
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {pendingFormat === "pdf" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FilePdfIcon data-icon="inline-start" />
              )}
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
