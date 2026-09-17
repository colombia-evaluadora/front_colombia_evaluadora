import { useEffect, useState } from "react"

import { SUCCESS_MESSAGES } from "@/lib/success-messages"

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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { useUpdateAcademicPeriodReservation } from "@/features/establishment/academic-period/api/mutations/update-academic-period-reservation"
import { useAcademicPeriodQuery } from "@/features/establishment/academic-period/api/query/use-academic-period"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import type { AcademicPeriod } from "@/features/establishment/academic-period/api/types/academic-period"
import type { CreateAcademicPeriodRequest } from "@/features/establishment/academic-period/api/types/academic-period"

interface DeactivateReservationDialogProps {
  period: AcademicPeriod
}

// Convierte un `AcademicPeriodDetail` (lo que devuelve el endpoint de detalle)
// al shape PLANO `CreateAcademicPeriodRequest` que espera
// `PUT /periodos-academicos/editar/:ID`. Es el mismo shaping que usa
// `create-academic-period.ts` para altas, pero acá lo armamos a partir del
// detalle (no del form) porque la pantalla de toggle no tiene el form
// abierto.
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

export function DeactivateReservationDialog({ period }: DeactivateReservationDialogProps) {
  const [open, setOpen] = useState(false)
  // Se carga el detalle del periodo solo cuando se abre el diálogo: si no,
  // haríamos una request por fila de la tabla solo para mostrar un botón.
  const [shouldFetch, setShouldFetch] = useState(false)
  const { notify } = useNotify()

  const { data: detail, isFetching, isError, error } = useAcademicPeriodQuery(
    shouldFetch ? period.id : undefined,
  )
  const { puedeEditar } = useMenuPermission("PERIODOS_ACADEMICOS")

  // Solo se puede desactivar si el flag está activo. La regla "solo si está
  // activo" se aplica también en el botón (no se renderiza cuando ya está
  // inactivo); este guard es defensivo.
  const canDeactivate = period.reservationEnabled && puedeEditar

  useEffect(() => {
    if (open) setShouldFetch(true)
  }, [open])

  const deactivate = useUpdateAcademicPeriodReservation({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.academicPeriod.deactivated!)
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleConfirm() {
    if (!detail) return
    const body = toUpdateRequest(detail, false)
    deactivate.mutate({ id: period.id, body })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  disabled={!canDeactivate}
                  aria-label="Desactivar periodo de reserva de cupos"
                />
              }
            />
          }
        >
          <span className="sr-only">Desactivar reserva de cupos</span>
          {/* Icono "ojo tachado" = acción de desactivar visualmente el periodo
              para usuarios externos (reservas). Se podría cambiar por un
              candado si se prefiere metáfora de "bloqueo". */}
          <XIcon />
        </TooltipTrigger>
        <TooltipContent>Desactivar periodo de reserva de cupos</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desactivar reserva de cupos</AlertDialogTitle>
          <AlertDialogDescription>
            {canDeactivate ? (
              <>
                Se desactivará el periodo de reservas del periodo{" "}
                <strong>{period.name}</strong>. Una vez desactivado, los usuarios
                no podrán realizar nuevas solicitudes de cupo para esta sede y el
                periodo desaparecerá del listado de establecimientos con cupos
                disponibles para reserva. La acción quedará registrada en el
                historial del sistema.
              </>
            ) : (
              "El periodo ya se encuentra inactivo."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="primary"
            disabled={!detail || deactivate.isPending || isFetching}
            aria-busy={deactivate.isPending || isFetching}
            onClick={handleConfirm}
          >
            {deactivate.isPending || isFetching ? (
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