import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router"

import { paths } from "@/config/paths"

import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { esFinal } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { resumenDeDetalle, type CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { useDialogosCaso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/use-dialogos-caso"
import type { AccionCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"

/** Navegación y orquestación de diálogos del detalle del caso. */
export function useCasoDetalle(caso: CasoDetalle) {
  const navigate = useNavigate()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const access = useConvivenciaAccess()
  const { abrir, dialogos } = useDialogosCaso()
  const resumen = resumenDeDetalle(caso)

  // Vuelve a donde vino (listado con sus filtros y página); con enlace directo, al listado.
  const volver = () => (canGoBack ? router.history.back() : navigate({ to: paths.app.convivencia.getHref() }))

  const onAccionMenu = (accion: AccionCaso) => {
    if (accion === "citar" || accion === "compromiso")
      navigate({
        to: accion === "citar" ? paths.app.citacionNueva.getHref() : paths.app.compromisoNuevo.getHref(),
        search: { origen_tipo: "CASO_CONVIVENCIA", origen_id: caso.id },
      } as never)
    else if (accion === "modificar") navigate({ to: paths.app.convivenciaEditar.getHref(caso.id) })
    else if (accion !== "ver") abrir(accion, resumen)
  }

  return {
    access,
    abierto: !esFinal(caso.estado_codigo),
    abrirTipo: () => abrir("tipo", resumen),
    abrirAccion: () => abrir("accion", resumen),
    onAccionMenu,
    volver,
    dialogos,
  }
}
