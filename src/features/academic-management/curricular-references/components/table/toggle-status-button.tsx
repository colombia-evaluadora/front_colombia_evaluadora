import { Button } from "@/components/ui/button"
import { CheckCircleIcon, ProhibitIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useToggleStatus } from "@/features/academic-management/curricular-references/api/mutations/use-toggle-status"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

// Activar/Inactivar directo desde la fila, sin abrir el formulario.
export function ToggleStatusButton({ curricularReference }: { curricularReference: CurricularReference }) {
  const { notify } = useNotify()
  const nextActive = !curricularReference.active
  const label = nextActive ? "Activar" : "Inactivar"

  const toggleMutation = useToggleStatus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result?.status === "error") {
          notify(result.message ?? "No fue posible cambiar el estado.", { variant: "error" })
          return
        }
        notify(nextActive ? "El referente curricular se activó." : "El referente curricular se inactivó.")
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`${label} ${curricularReference.name}`}
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate({ reference: curricularReference, active: nextActive })}
          />
        }
      >
        {toggleMutation.isPending ? (
          <SpinnerIcon className="animate-spin" />
        ) : nextActive ? (
          <CheckCircleIcon />
        ) : (
          <ProhibitIcon />
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
