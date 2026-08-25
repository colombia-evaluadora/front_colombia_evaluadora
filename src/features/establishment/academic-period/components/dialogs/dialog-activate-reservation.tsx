import { useEffect, useState } from "react"

import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useUpdateAcademicPeriodReservation } from "@/features/establishment/academic-period/api/mutations/update-academic-period-reservation"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import type { AcademicPeriod, CreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/types/academic-period"

interface ActivateReservationDialogProps {
  period: AcademicPeriod
}

function toUpdateRequest(
  detail: import("@/features/establishment/academic-period/api/types/academic-period").AcademicPeriodDetail,
  reservationEnabled: boolean,
): CreateAcademicPeriodRequest {
  const breaks = detail.config.breaks ?? []
  return {
    FK_SEDE: Number(detail.sedeId),
    FK_ESTADO: detail.statusId ?? 0,
    FECHA_INICIO: detail.startDate,
    FECHA_FIN: detail.endDate,
    FECHA_LIMITE_MATRICULA: detail.enrollmentDeadline,
    FK_JORNADA: detail.config.jornadaId,
    HORA_INICIO: detail.config.scheduleStartTime ?? null,
    HORA_FIN: detail.config.scheduleEndTime ?? null,
    RESERVA: reservationEnabled ? "S" : "N",
    BLOQUES_POR_DEFECTO: detail.config.defaultBlocksCount,
    FK_PERIODO_ANTERIOR: detail.previousPeriodId,
    DESCANSO_INICIO: breaks.map((b) => b.startTime),
    DESCANSO_FIN: breaks.map((b) => b.endTime),
  }
}

export function ActivateReservationDialog({ period }: ActivateReservationDialogProps) {
  const [open, setOpen] = useState(false)
  const [shouldFetch, setShouldFetch] = useState(false)
  const { notify } = useNotify()

  const { data: detail, isFetching, isError, error } = useAcademicPeriodQuery(
    shouldFetch ? period.id : undefined,
  )
  const { puedeEditar } = useMenuPermission("PERIODOS_ACADEMICOS")

  const hasDateRange = Boolean(period.startDate && period.endDate)
  const canActivate = !period.reservationEnabled && hasDateRange && puedeEditar

  useEffect(() => {
    if (open) setShouldFetch(true)
  }, [open])

  const activate = useUpdateAcademicPeriodReservation({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("El periodo de reserva de cupos se activó correctamente.")
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleConfirm() {
    if (!detail) return
    const body = toUpdateRequest(detail, true)
    activate.mutate({ id: period.id, body })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            color="neutral"
            size="icon-sm"
            disabled={!canActivate}
            aria-label="Activar periodo de reserva de cupos"
          />
        }
      >
        <span className="sr-only">Activar reserva de cupos</span>
        <CheckIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Activar reserva de cupos</AlertDialogTitle>
          <AlertDialogDescription>
            {hasDateRange ? (
              <>
                Se volverá a permitir el periodo de reservas del periodo{" "}
                <strong>{period.name}</strong>. Los usuarios podrán realizar
                solicitudes de cupo nuevamente y el periodo volverá a aparecer en el
                listado de establecimientos con cupos disponibles para reserva. La
                acción quedará registrada en el historial del sistema.
              </>
            ) : (
              "Define una fecha de inicio y una fecha de finalización antes de activar el periodo de reservas."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="primary"
            disabled={!detail || activate.isPending || isFetching}
            aria-busy={activate.isPending || isFetching}
            onClick={handleConfirm}
          >
            {activate.isPending || isFetching ? (
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
        {isError && (
          <p className="text-sm text-destructive">
            {getErrorMessage(error)}
          </p>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}