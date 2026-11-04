import { Button } from "@/components/ui/button"
import { ArrowsDownUpIcon, ClipboardAddIcon, GavelIcon } from "@/components/ui/icons"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"
import type { useCasoDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-detalle"

interface Props {
  caso: CasoDetalle
  detalle: ReturnType<typeof useCasoDetalle>
}

/** Botones de la cabecera del detalle: proceso disciplinario, cambiar tipo, registrar acción y menú ⋮. */
export function AccionesDetalle({ caso, detalle }: Props) {
  const { access, abierto, abrirTipo, abrirAccion, onAccionMenu } = detalle
  return (
    <div className="flex items-center gap-2">
      {/* G.2.CAS.DIS.1: solo en el detalle, no en el menú de la fila. Sin backend hasta la 3.5. */}
      <Button size="sm" variant="outline" disabled>
        <GavelIcon data-icon="inline-start" />
        Abrir proceso disciplinario
      </Button>
      <Button size="sm" variant="outline" disabled={!(abierto && access.puedeSupervisar)} onClick={abrirTipo}>
        <ArrowsDownUpIcon data-icon="inline-start" />
        Cambiar tipo
      </Button>
      <Button size="sm" disabled={!(abierto && access.puedeGestionar)} onClick={abrirAccion}>
        <ClipboardAddIcon data-icon="inline-start" />
        Registrar acción
      </Button>
      <MenuAccionesCaso
        conVer={false}
        caso={{ numero: caso.numero, estado_codigo: caso.estado_codigo, sinGestor: !caso.fk_funcionario_gestor }}
        access={access}
        onAccion={onAccionMenu}
      />
    </div>
  )
}
