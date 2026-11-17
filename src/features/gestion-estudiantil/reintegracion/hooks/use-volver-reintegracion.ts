import { useCallback } from "react"
import { useCanGoBack, useRouter } from "@tanstack/react-router"

import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"

/** Atrás en el historial del navegador; sin historial, a la bandeja. */
export function useVolverReintegracion() {
  const router = useRouter()
  const puedeVolver = useCanGoBack()
  const { irBandeja } = useNavegacionReintegracion()
  return useCallback(() => {
    if (puedeVolver) router.history.back()
    else irBandeja()
  }, [puedeVolver, router, irBandeja])
}
