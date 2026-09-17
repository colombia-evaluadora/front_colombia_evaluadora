import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
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

import { useDeleteStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/delete-study-plan"
import { deleteSubject } from "@/features/establishment/academic-period/api/mutations/delete-subject"
import { checkPlanDeleteRestrictions } from "@/features/establishment/academic-period/api/mutations/check-plan-delete-restrictions"
import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"

interface DeleteStudyPlanDialogProps {
  item: StudyPlanItem
  subjectLabel?: string
}

type PendingAction = "eliminar" | "remover" | null

export function DeleteStudyPlanDialog({ item, subjectLabel = "Asignatura" }: DeleteStudyPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingAction>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkingBlock, setCheckingBlock] = useState(false)
  const [canRemove, setCanRemove] = useState(true)
  const [canDelete, setCanDelete] = useState(true)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const subjectWord = subjectLabel.toLowerCase()

  const deleteStudyPlanItem = useDeleteStudyPlanItem()

  useEffect(() => {
    if (!open) {
      setCanRemove(true)
      setCanDelete(true)
      setBlockedReason(null)
      return
    }
    let cancelled = false
    setCheckingBlock(true)
    checkPlanDeleteRestrictions(item.codigo)
      .then(({ puedeEliminar, puedeRemover, motivo }) => {
        if (cancelled) return
        setCanDelete(puedeEliminar)
        setCanRemove(puedeRemover)
        setBlockedReason(puedeEliminar ? null : motivo)
      })
      .finally(() => {
        if (!cancelled) setCheckingBlock(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, item.codigo])

  function resetAndClose() {
    setOpen(false)
    setPending(null)
  }

  async function handleEliminar() {
    if (!canDelete) return
    setIsProcessing(true)
    try {
      let planResult
      try {
        planResult = await deleteStudyPlanItem.mutateAsync(item.codigo)
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
        return
      }
      if (planResult.status === "error") {
        notify(planResult.message, { variant: "error" })
        return
      }

      try {
        await deleteSubject(item.asignaturaId)
        queryClient.invalidateQueries({ queryKey: ["area-subjects"] })
        queryClient.invalidateQueries({ queryKey: ["subjects"] })
        queryClient.invalidateQueries({ queryKey: ["subject-details"] })
        queryClient.invalidateQueries({ queryKey: ["study-plan-available"] })
        notify(`${item.asignatura} se quitó del plan y se eliminó permanentemente.`)
      } catch (error) {
        notify(
          `Se quitó del plan de estudio. No se pudo eliminar por completo porque sigue en uso: ${getErrorMessage(error)}`,
          { variant: "info" },
        )
      }
      resetAndClose()
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleQuitar() {
    if (!canRemove) return
    setIsProcessing(true)
    try {
      const planResult = await deleteStudyPlanItem.mutateAsync(item.codigo)
      if (planResult.status === "error") {
        notify(planResult.message, { variant: "error" })
      } else {
        notify(`${item.asignatura} se quitó de este plan de estudio.`)
      }
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      resetAndClose()
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAndClose()
        else setOpen(true)
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
          }
        >
          <span className="sr-only">Eliminar {subjectWord}</span>
          <TrashIcon />
        </TooltipTrigger>
        <TooltipContent>Eliminar {subjectWord}</TooltipContent>
      </Tooltip>
      <AlertDialogPortal>
        <AlertDialogOverlay forceRender className="bg-black/30" />
      </AlertDialogPortal>
      <AlertDialogContent>
        {pending === null ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{item.asignatura}</AlertDialogTitle>
              <AlertDialogDescription>
                {!canRemove
                  ? `No se puede remover ni eliminar: ${blockedReason}.`
                  : blockedReason
                    ? `No se puede eliminar por completo: ${blockedReason}. "Remover" solo la quita de este plan, conservándola para reutilizarla.`
                    : `"Eliminar" la borra por completo. "Remover" solo la quita de este plan, conservándola para reutilizarla. Ninguna de las dos se puede deshacer.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button
                color="destructive"
                disabled={checkingBlock || !canDelete}
                title={!canDelete ? (blockedReason ?? undefined) : undefined}
                onClick={() => setPending("eliminar")}
              >
                <TrashIcon data-icon="inline-start" />
                Eliminar
              </Button>
              <Button
                color="destructive"
                className="opacity-70"
                disabled={checkingBlock || !canRemove}
                title={!canRemove ? (blockedReason ?? undefined) : undefined}
                onClick={() => setPending("remover")}
              >
                <CheckIcon data-icon="inline-start" />
                Remover
              </Button>
              <AlertDialogCancel variant="fill" color="neutral">
                <XIcon data-icon="inline-start" />
                Cerrar
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                {pending === "eliminar"
                  ? `Vas a eliminar ${item.asignatura} por completo. Esta acción no se puede deshacer.`
                  : `Vas a remover ${item.asignatura} de este plan de estudio. Esta acción no se puede deshacer.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                color="destructive"
                className={pending === "remover" ? "opacity-70" : undefined}
                disabled={isProcessing}
                aria-busy={isProcessing}
                onClick={pending === "eliminar" ? handleEliminar : handleQuitar}
              >
                {isProcessing ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Sí, {pending === "eliminar" ? "eliminar" : "remover"}
              </AlertDialogAction>
              <Button
                variant="fill"
                color="neutral"
                disabled={isProcessing}
                onClick={() => setPending(null)}
              >
                <XIcon data-icon="inline-start" />
                Volver
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
