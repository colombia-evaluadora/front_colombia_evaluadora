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

import { useDeleteStudyPlanItem } from "@/features/establishment/academic-period/api/mutations/delete-study-plan"
import { deleteSubject } from "@/features/establishment/academic-period/api/mutations/delete-subject"
import { checkPlanDeleteRestrictions } from "@/features/establishment/academic-period/api/mutations/check-plan-delete-restrictions"
import type { StudyPlanItem } from "@/features/establishment/academic-period/api/types/study-plan"

interface DeleteStudyPlanDialogProps {
  item: StudyPlanItem
  isPreescolar?: boolean
}

export function DeleteStudyPlanDialog({ item, isPreescolar }: DeleteStudyPlanDialogProps) {
  const [open, setOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkingBlock, setCheckingBlock] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const subjectWord = isPreescolar ? "dimensión" : "asignatura"

  const deleteStudyPlanItem = useDeleteStudyPlanItem()

  useEffect(() => {
    if (!open) {
      setBlockedReason(null)
      return
    }
    let cancelled = false
    setCheckingBlock(true)
    checkPlanDeleteRestrictions(item.codigo)
      .then(({ puedeEliminar, motivo }) => {
        if (!cancelled) setBlockedReason(puedeEliminar ? null : motivo)
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
  }

  async function handleEliminar() {
    if (blockedReason) return
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
      <AlertDialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />}>
        <span className="sr-only">Eliminar {subjectWord}</span>
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogPortal>
        <AlertDialogOverlay forceRender className="bg-black/30" />
      </AlertDialogPortal>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{item.asignatura}</AlertDialogTitle>
          <AlertDialogDescription>
            {blockedReason
              ? `No se puede eliminar por completo: ${blockedReason}. "Remover" solo la quita de este plan, conservándola para reutilizarla.`
              : `"Eliminar" la borra por completo. "Remover" solo la quita de este plan, conservándola para reutilizarla. Ninguna de las dos se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={isProcessing || checkingBlock || !!blockedReason}
            aria-busy={isProcessing}
            title={blockedReason ?? undefined}
            onClick={handleEliminar}
          >
            {isProcessing ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <TrashIcon data-icon="inline-start" />
            )}
            Eliminar
          </AlertDialogAction>
          <AlertDialogAction
            color="primary"
            disabled={isProcessing}
            aria-busy={isProcessing}
            onClick={handleQuitar}
          >
            {isProcessing ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Remover
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={isProcessing}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
