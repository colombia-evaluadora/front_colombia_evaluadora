import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ArrowsDownUpIcon, ClipboardAddIcon, GavelIcon } from "@/components/ui/icons"

import { resumenDeDetalle, type CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { DialogElegirEstudianteProceso } from "@/features/gestion-estudiantil/convivencia/components/dialogs/dialog-elegir-estudiante-proceso"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"
import type { useCasoDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-detalle"

interface Props {
  caso: CasoDetalle
  detalle: ReturnType<typeof useCasoDetalle>
}

/** Botones de la cabecera del detalle: proceso disciplinario, cambiar tipo, registrar acción y menú ⋮. */
export function AccionesDetalle({ caso, detalle }: Props) {
  const { access, puedeCitar, abierto, abrirTipo, abrirAccion, onAccionMenu } = detalle
  const [elegirEstudiante, setElegirEstudiante] = useState(false)
  return (
    <div className="flex items-center gap-2">
      {/* G.2.CAS.DIS.1: solo en el detalle, no en el menú de la fila; Supervisor de sede y Administrador.
          Primero se elige el estudiante (G.2.CAS.DIS.2) y después se abre el formulario (G.2.CAS.DIS.3). */}
      <Button
        size="sm"
        variant="outline" color="neutral"
        disabled={!(abierto && access.puedeSupervisar)}
        onClick={() => setElegirEstudiante(true)}
      >
        <GavelIcon data-icon="inline-start" />
        Abrir proceso disciplinario
      </Button>
      <Button size="sm" variant="outline" color="neutral" disabled={!(abierto && access.puedeSupervisar)} onClick={abrirTipo}>
        <ArrowsDownUpIcon data-icon="inline-start" />
        Cambiar tipo
      </Button>
      {/* Sin los datos del caso el backend rechaza la acción: el aviso del detalle dice qué falta. */}
      <Button size="sm" disabled={!(abierto && access.puedeGestionar) || detalle.datosPendientes.length > 0} onClick={abrirAccion}>
        <ClipboardAddIcon data-icon="inline-start" />
        Registrar acción
      </Button>
      <MenuAccionesCaso
        conVer={false}
        caso={{ numero: caso.numero, estado_codigo: caso.estado_codigo, sinGestor: !caso.fk_funcionario_gestor }}
        access={access}
        puedeCitar={puedeCitar}
        onAccion={onAccionMenu}
      />
      <DialogElegirEstudianteProceso
        caso={elegirEstudiante ? resumenDeDetalle(caso) : null}
        onClose={() => setElegirEstudiante(false)}
      />
    </div>
  )
}
