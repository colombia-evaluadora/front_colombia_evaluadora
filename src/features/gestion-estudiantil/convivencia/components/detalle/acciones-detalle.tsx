import { Button } from "@/components/ui/button"
import { ArrowsDownUpIcon, ClipboardAddIcon } from "@/components/ui/icons"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"
import type { useCasoDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-detalle"

interface Props {
  caso: CasoDetalle
  detalle: ReturnType<typeof useCasoDetalle>
}

/**
 * Botones de la cabecera del detalle: cambiar tipo, registrar acción y menú ⋮ (que incluye «Abrir proceso
 * disciplinario», G.2.CAS.DIS.1). Siempre visibles; las banderas del backend los habilitan.
 */
export function AccionesDetalle({ caso, detalle }: Props) {
  const { banderas, puedeCitar, puedeCrearCompromiso, abrirTipo, abrirAccion, onAccionMenu } = detalle
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" color="neutral" disabled={!banderas.puede_cambiar_tipo} onClick={abrirTipo}>
        <ArrowsDownUpIcon data-icon="inline-start" />
        Cambiar tipo
      </Button>
      {/* Sin los datos del caso el backend rechaza la acción: el aviso del detalle dice qué falta. */}
      <Button size="sm" disabled={!banderas.puede_registrar_accion || detalle.datosPendientes.length > 0} onClick={abrirAccion}>
        <ClipboardAddIcon data-icon="inline-start" />
        Registrar acción
      </Button>
      <MenuAccionesCaso
        conVer={false}
        caso={{ numero: caso.numero, estado_codigo: caso.estado_codigo, sinGestor: !caso.fk_funcionario_gestor, banderas }}
        puedeCitar={puedeCitar}
        puedeCrearCompromiso={puedeCrearCompromiso}
        onAccion={onAccionMenu}
      />
    </div>
  )
}
