import { MdStar, MdStarBorder } from "react-icons/md"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SpinnerIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useSoportesEstudianteQuery } from "@/features/planeador/api/query/use-soportes-estudiante-query"
import { useMarcarFavoritoSoporteMutation } from "@/features/planeador/api/mutations/use-observacion-soporte"

interface EvidenciaFavoritoButtonProps {
  pkTactividadEstudiante: number
  /** `pk_tactividad_soporte` de la evidencia. */
  pkTactividadSoporte: number
  className?: string
}

export function EvidenciaFavoritoButton({
  pkTactividadEstudiante,
  pkTactividadSoporte,
  className,
}: EvidenciaFavoritoButtonProps) {
  const { notify } = useNotify()
  const { data: soportes } = useSoportesEstudianteQuery(pkTactividadEstudiante)
  const marcar = useMarcarFavoritoSoporteMutation({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })

  const esFavorito = soportes?.some((s) => s.pk === pkTactividadSoporte && s.esFavorito) ?? false
  const marcandoEsta = marcar.isPending && marcar.variables?.pkTactividadSoporte === pkTactividadSoporte
  const etiqueta = esFavorito ? "Quitar de favorita" : "Marcar como favorita"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "absolute -top-1.5 -left-1.5 inline-flex transition-opacity",
              !esFavorito && "opacity-0 group-hover:opacity-100",
              className,
            )}
          />
        }
      >
        <Button
          type="button"
          variant="fill"
          color="neutral"
          size="icon-xs"
          className="rounded-full"
          aria-label={etiqueta}
          aria-pressed={esFavorito}
          disabled={soportes == null || marcar.isPending}
          onClick={() =>
            marcar.mutate({ pkTactividadSoporte, pkTactividadEstudiante, esFavorito: !esFavorito })
          }
        >
          {marcandoEsta ? (
            <SpinnerIcon className="animate-spin" />
          ) : esFavorito ? (
            <MdStar className="text-amber-400" />
          ) : (
            <MdStarBorder />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {esFavorito ? "Evidencia favorita — clic para quitarla" : "Marcar como evidencia favorita"}
      </TooltipContent>
    </Tooltip>
  )
}
