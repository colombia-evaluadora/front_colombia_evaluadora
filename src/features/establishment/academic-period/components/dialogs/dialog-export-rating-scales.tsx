import { useState } from "react"

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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxGroup,
} from "@/components/ui/combobox"

import { useExportRatingScales } from "@/features/establishment/academic-period/api/mutations/export-rating-scales"
import { useTeachingLevelsQuery } from "@/features/establishment/academic-period/api/query/use-teaching-levels"
import { useRatingScaleTypesQuery } from "@/features/establishment/academic-period/api/query/use-rating-scale-types"
import type { ExportFormat } from "@/features/establishment/academic-period/api/types/rating-scales"

interface ExportRatingScalesDialogProps {
  academicPeriodId?: number
}

const ALL_VALUE = ""

// Reusa la MISMA función del listado (`fn_escala_listar`, V139), que ya trae
// todo el periodo sin paginar — con nivel de enseñanza y tipo como filtros
// opcionales antes de exportar.
export function ExportRatingScalesDialog({ academicPeriodId }: ExportRatingScalesDialogProps) {
  const [open, setOpen] = useState(false)
  const [teachingLevelId, setTeachingLevelId] = useState("")
  const [tipo, setTipo] = useState("")
  const { notify } = useNotify()

  const { data: teachingLevels = [] } = useTeachingLevelsQuery()
  const { data: tipoOptions = [] } = useRatingScaleTypesQuery()

  const exportAll = useExportRatingScales({
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
        teachingLevelId: teachingLevelId ? Number(teachingLevelId) : undefined,
        tipo: tipo || undefined,
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
            aria-label="Exportar escalas de valoración"
          />
        }
      >
        <FileDownloadOutlinedIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Filtra (opcional) y elige un formato para exportar las escalas de valoración del
            periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Nivel de enseñanza</FieldLabel>
            <ComboboxField value={teachingLevelId} onValueChange={(v) => setTeachingLevelId(v ?? "")}>
              <ComboboxFieldTrigger size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <ComboboxGroup>
                  <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                  {teachingLevels.map((level) => (
                    <ComboboxFieldItem key={level.id} value={String(level.id)}>
                      {level.nombre}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxGroup>
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Tipo de desempeño</FieldLabel>
            <ComboboxField value={tipo} onValueChange={(v) => setTipo(v ?? "")}>
              <ComboboxFieldTrigger size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <ComboboxGroup>
                  <ComboboxFieldItem value={ALL_VALUE}>Todos</ComboboxFieldItem>
                  {tipoOptions.map((option) => (
                    <ComboboxFieldItem key={option.key} value={option.key}>
                      {option.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxGroup>
              </ComboboxFieldContent>
            </ComboboxField>
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
