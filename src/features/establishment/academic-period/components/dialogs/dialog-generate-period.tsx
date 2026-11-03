import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PrinterIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { downloadReport } from "@/lib/report-client"
import { cn } from "@/lib/utils"

import {
  usePeriodGenerateData,
  type GenerateKind,
} from "@/features/establishment/academic-period/api/query/use-period-generate-data"

const COPY: Record<GenerateKind, { title: string; missing: (n: number) => string }> = {
  horarios: {
    title: "Generar horarios",
    missing: (n) =>
      n === 1
        ? "1 grupo no tiene horario y no se incluirá."
        : `${n} grupos no tienen horario y no se incluirán.`,
  },
  planes: {
    title: "Generar planes de estudio",
    missing: (n) =>
      n === 1
        ? "1 grado no tiene plan de estudio y no se incluirá."
        : `${n} grados no tienen plan de estudio y no se incluirán.`,
  },
}

interface GeneratePeriodDialogProps {
  kind: GenerateKind
  open: boolean
  onOpenChange: (open: boolean) => void
  academicPeriodId: number
  periodTitle: string
}

// "Generar › Horarios" y "Generar › Planes de estudio" (Sección 5.7, Regla 104):
// se marcan grados (y grupos, en horarios), por defecto todos los que tienen
// contenido, y sale un solo PDF con una hoja por grado o grupo.
export function GeneratePeriodDialog({
  kind,
  open,
  onOpenChange,
  academicPeriodId,
  periodTitle,
}: GeneratePeriodDialogProps) {
  const { data: grades, isPending } = usePeriodGenerateData(academicPeriodId, kind, open)
  // Lo que el usuario desmarcó; así "por defecto, todos" no depende de cuándo llegan los datos.
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  // Regla 74: horarios con bloques por corregir piden confirmar antes de generar.
  const [confirmAffected, setConfirmAffected] = useState(false)
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)

  const isHorarios = kind === "horarios"
  // En horarios la unidad es el grupo; en planes, el grado.
  const items = isHorarios
    ? grades.flatMap((g) => g.groups)
    : grades.map((g) => ({ id: g.id, codigo: g.nombre, hasContent: g.hasContent }))
  const available = items.filter((i) => i.hasContent)
  const missing = items.length - available.length
  const selected = available.filter((i) => !unchecked.has(i.id))
  const selectedIds = new Set(selected.map((i) => i.id))
  const affected = isHorarios
    ? grades.flatMap((g) => g.groups).filter((g) => selectedIds.has(g.id) && g.affectedBlocks > 0)
    : []
  const allState =
    selected.length === 0 ? false : selected.length === available.length ? true : "mixed"

  function toggle(ids: number[], checked: boolean) {
    setUnchecked((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  function close() {
    onOpenChange(false)
    setUnchecked(new Set())
    setNotice(null)
  }

  async function generate() {
    setIsGenerating(true)
    setNotice(null)
    const ids = selected.map((i) => i.id)
    const result = await downloadReport(
      isHorarios ? "periodo-horarios" : "periodo-planes-estudio",
      {
        format: "pdf",
        filters: isHorarios
          ? { FK_PERIODO: academicPeriodId, FK_GRUPOS: ids }
          : { FK_PERIODO: academicPeriodId, FK_GRADOS: ids },
        filtersLabel: periodTitle,
      },
    )
    setIsGenerating(false)
    if (result.status === "error") {
      setNotice({ id: Date.now(), message: result.message, variant: "error" })
      return
    }
    close()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : !isGenerating && close())}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{COPY[kind].title}</DialogTitle>
          <DialogDescription>
            {isHorarios ? "Grados y grupos" : "Grados"} del período {periodTitle}
          </DialogDescription>
        </DialogHeader>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} />

        {isPending ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <SpinnerIcon className="animate-spin" />
          </div>
        ) : grades.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Aún no hay grados en este período.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex w-fit items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={allState === true}
                indeterminate={allState === "mixed"}
                disabled={available.length === 0}
                onCheckedChange={(checked) =>
                  toggle(
                    available.map((i) => i.id),
                    Boolean(checked),
                  )
                }
              />
              Seleccionar todos
            </label>

            <ul className="ml-6 flex max-h-80 flex-col overflow-y-auto">
              {grades.map((grade) => {
                const gradeItems = isHorarios
                  ? grade.groups
                  : [{ id: grade.id, codigo: grade.nombre, hasContent: grade.hasContent }]
                const ids = gradeItems.filter((i) => i.hasContent).map((i) => i.id)
                const count = ids.filter((id) => !unchecked.has(id)).length
                const gradeState = count === 0 ? false : count === ids.length ? true : "mixed"
                return (
                  <li
                    key={grade.id}
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border py-2 last:border-b-0"
                  >
                    <label
                      className={cn(
                        "flex w-28 items-center gap-2 text-sm",
                        ids.length === 0 && "text-muted-foreground",
                      )}
                    >
                      <Checkbox
                        checked={gradeState === true}
                        indeterminate={gradeState === "mixed"}
                        disabled={ids.length === 0}
                        onCheckedChange={(checked) => toggle(ids, Boolean(checked))}
                      />
                      {grade.nombre}
                      {!isHorarios && !grade.hasContent && " (sin plan)"}
                    </label>
                    {isHorarios &&
                      (grade.groups.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Sin grupos</span>
                      ) : (
                        grade.groups.map((group) => (
                          <label
                            key={group.id}
                            className={cn(
                              "flex items-center gap-2 text-sm",
                              !group.hasContent && "text-muted-foreground",
                            )}
                          >
                            <Checkbox
                              checked={group.hasContent && !unchecked.has(group.id)}
                              disabled={!group.hasContent}
                              onCheckedChange={(checked) => toggle([group.id], Boolean(checked))}
                            />
                            {group.codigo}
                            {!group.hasContent && " (sin horario)"}
                          </label>
                        ))
                      ))}
                  </li>
                )
              })}
            </ul>

            {missing > 0 && (
              <p className="flex items-start gap-2 rounded-md border border-orange-stroke bg-orange-22 px-3 py-2 text-sm">
                <WarningIcon className="mt-0.5 size-4 shrink-0 text-orange" aria-hidden />
                {COPY[kind].missing(missing)}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            color="neutral"
            onClick={close}
            disabled={isGenerating}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            color="primary"
            onClick={() => (affected.length > 0 ? setConfirmAffected(true) : generate())}
            // Sin nada con contenido marcado, no hay qué generar.
            disabled={isGenerating || selected.length === 0}
            aria-busy={isGenerating}
          >
            {isGenerating ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <PrinterIcon data-icon="inline-start" />
            )}
            Generar ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={confirmAffected} onOpenChange={setConfirmAffected}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <WarningIcon className="size-5 shrink-0 text-orange" aria-hidden />
              Horario con bloques por corregir
            </AlertDialogTitle>
            <AlertDialogDescription>
              {affected.length === 1
                ? `El horario de ${affected[0].codigo} tiene ${affected[0].affectedBlocks} bloques afectados por un cambio. ¿Desea generarlo así?`
                : `Estos horarios tienen bloques afectados por un cambio: ${affected
                    .map((g) => `${g.codigo} (${g.affectedBlocks})`)
                    .join(", ")}. ¿Desea generarlos así?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" color="neutral">
              <XIcon data-icon="inline-start" />
              Cancelar
            </AlertDialogCancel>
            <Button
              color="primary"
              onClick={() => {
                setConfirmAffected(false)
                generate()
              }}
            >
              <PrinterIcon data-icon="inline-start" />
              Generar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
