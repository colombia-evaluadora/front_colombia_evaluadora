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
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/subjects-multi-select"

import { useExportAreaSubjects } from "@/features/establishment/academic-period/api/mutations/export-area-subjects"
import { useAreaOptionsQuery } from "@/features/establishment/academic-period/api/query/use-area-report-filters"
import { useSubjectOptionsQuery } from "@/features/establishment/academic-period/api/query/use-study-plan-report-filters"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import type { ExportFormat } from "@/features/establishment/academic-period/api/types/area-subject"

interface ExportAreaSubjectsDialogProps {
  academicPeriodId?: number
}

// Igual que los otros reportes (periodo académico, plan de estudio, grados):
// reusa la MISMA función del listado (`fn_area_subject_reporte_listar`, sin
// paginar), pero cruzando TODAS las áreas del periodo, no solo la página
// visible. Los filtros (área/asignatura/especialidad/estado) viven en el
// propio diálogo porque el listado de la pantalla solo filtra por nombre.
export function ExportAreaSubjectsDialog({ academicPeriodId }: ExportAreaSubjectsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const { notify } = useNotify()

  const { data: areaOptions = [] } = useAreaOptionsQuery(open ? academicPeriodId : undefined)
  const { data: subjectOptions = [] } = useSubjectOptionsQuery(open ? academicPeriodId : undefined)
  const { data: specialtyOptions = [] } = useEspecialidadesQuery(open ? academicPeriodId : undefined)

  const areaNames = useMemo(() => areaOptions.map((o) => o.nombre), [areaOptions])
  const subjectNames = useMemo(() => subjectOptions.map((o) => o.nombre), [subjectOptions])
  const specialtyNames = useMemo(() => specialtyOptions.map((o) => o.label), [specialtyOptions])

  const exportAll = useExportAreaSubjects({
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
        areaIds: areaOptions.filter((o) => selectedAreas.includes(o.nombre)).map((o) => o.id),
        subjectIds: subjectOptions
          .filter((o) => selectedSubjects.includes(o.nombre))
          .map((o) => o.id),
        specialtyIds: specialtyOptions
          .filter((o) => selectedSpecialties.includes(o.label))
          .map((o) => o.id),
        includeInactive,
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
            aria-label="Exportar áreas, asignaturas y especialidades"
          />
        }
      >
        <FileDownloadOutlinedIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Filtra (opcional) y elige un formato para exportar áreas, asignaturas y especialidades
            del periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Área</FieldLabel>
            <SubjectsMultiSelect
              options={areaNames}
              value={selectedAreas}
              onChange={setSelectedAreas}
              placeholder="Todas las áreas"
              emptyMessage="No hay áreas en este periodo."
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
          <Field orientation="horizontal" className="items-center gap-2">
            <Checkbox
              id="area-subjects-export-include-inactive"
              checked={includeInactive}
              onCheckedChange={(checked) => setIncludeInactive(checked === true)}
            />
            <FieldLabel htmlFor="area-subjects-export-include-inactive" className="font-normal">
              Incluir áreas/asignaturas inactivas
            </FieldLabel>
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
