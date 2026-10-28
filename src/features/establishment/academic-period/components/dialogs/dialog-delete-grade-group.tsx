import { useState } from "react"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { CheckIcon, ProhibitIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useDeleteGradeGroup } from "@/features/establishment/academic-period/api/mutations/delete-grade-group"
import {
  hasGradeGroupDependencies,
  useGradeGroupDependenciesQuery,
  type GradeGroupDependencies,
} from "@/features/establishment/academic-period/api/query/use-grade-group-dependencies"
import type { GradeGroup } from "@/features/establishment/academic-period/api/types/grade-group"

interface DeleteGradeGroupDialogProps {
  gradeGroup: GradeGroup
  gradeName?: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Qué tiene el grupo, en el orden del diálogo "No se puede eliminar".
function dependencyLines(d: GradeGroupDependencies) {
  const lines: string[] = []
  if (d.matriculas > 0) lines.push(`${plural(d.matriculas, "matrícula", "matrículas")} en Cobertura Educativa`)
  if (d.asignaciones > 0)
    lines.push(plural(d.asignaciones, "asignación académica", "asignaciones académicas"))
  if (d.horarios > 0) lines.push(`Horario con ${plural(d.horarios, "clase asignada", "clases asignadas")}`)
  const registros = [
    d.actividades > 0 && plural(d.actividades, "actividad", "actividades"),
    d.clasesAsistencia > 0 &&
      `la asistencia de ${plural(d.clasesAsistencia, "clase", "clases")}`,
    d.calificaciones > 0 && plural(d.calificaciones, "calificación", "calificaciones"),
  ].filter(Boolean)
  if (registros.length > 0) {
    const texto =
      registros.length === 1 ? registros[0] : `${registros.slice(0, -1).join(", ")} y ${registros.at(-1)}`
    lines.push(`Registros en Gestión Académica: ${texto}`)
  }
  return lines
}

// Antes de confirmar se consulta qué tiene el grupo: con matrículas,
// asignaciones o registros académicos no se elimina y se explica por qué.
export function DeleteGradeGroupDialog({ gradeGroup, gradeName }: DeleteGradeGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const dependencies = useGradeGroupDependenciesQuery(gradeGroup.id, open)
  const blocked = dependencies.data != null && hasGradeGroupDependencies(dependencies.data)
  const { notify } = useNotify()

  const deleteMutation = useDeleteGradeGroup({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.gradeGroup.deleted)
        setOpen(false)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
          }
        >
          <span className="sr-only">Eliminar grupo</span>
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>Eliminar grupo</TooltipContent>
      </Tooltip>
      {/* `forceRender`: este AlertDialog se abre anidado dentro del Dialog de
          crear/editar grado (ya abierto) — sin forzar su propio overlay, no
          bloquea el fondo (mismo fix que dialog-select-general-area.tsx). */}
      <AlertDialogPortal>
        <AlertDialogOverlay forceRender className="bg-black/30" />
      </AlertDialogPortal>
      <AlertDialogContent>
        {dependencies.isPending ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <SpinnerIcon className="animate-spin" />
            <span className="sr-only">Revisando el grupo</span>
          </div>
        ) : blocked ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-start gap-2">
                <ProhibitIcon className="mt-0.5 size-6 shrink-0 text-red" aria-hidden />
                No se puede eliminar el grupo {gradeGroup.codigo}
              </AlertDialogTitle>
              <AlertDialogDescription render={<div />}>
                <p>
                  El grupo {gradeGroup.codigo}
                  {gradeName ? ` de ${gradeName}` : ""} tiene:
                </p>
                <ul className="list-disc pl-5">
                  {dependencyLines(dependencies.data).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel color="primary">
                <CheckIcon data-icon="inline-start" />
                Entendido
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará permanentemente el grupo {gradeGroup.codigo}. Esta acción no se puede
                deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                color="destructive"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(gradeGroup.id)}
              >
                {deleteMutation.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Si
              </AlertDialogAction>
              <AlertDialogCancel variant="fill" color="neutral">
                <XIcon data-icon="inline-start" />
                No
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
