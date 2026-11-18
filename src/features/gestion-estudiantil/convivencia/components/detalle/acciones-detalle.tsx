import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ArrowsDownUpIcon, ClipboardAddIcon, GavelIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { MenuAccionesCaso } from "@/features/gestion-estudiantil/convivencia/components/menu-acciones-caso"
import type { useCasoDetalle } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-detalle"

interface Props {
  caso: CasoDetalle
  detalle: ReturnType<typeof useCasoDetalle>
}

/** Botones de la cabecera del detalle: proceso disciplinario, cambiar tipo, registrar acción y menú ⋮. */
export function AccionesDetalle({ caso, detalle }: Props) {
  const { access, puedeCitar, abierto, abrirTipo, abrirAccion, onAccionMenu } = detalle
  return (
    <div className="flex items-center gap-2">
      {/*
        G.2.CAS.DIS.1: solo en el detalle, no en el menú de la fila. El estudiante se elige entre los
        involucrados en el formulario (`?caso=`). Pendiente de backend: el detalle no trae una bandera
        propia; se usa el mismo permiso que «Abrir proceso» de la lista de procesos.
      */}
      {access.puedeSupervisar ? (
        <Button
          size="sm"
          variant="outline" color="neutral"
          nativeButton={false}
          render={<Link to={paths.app.convivenciaProcesoNuevo.getHref()} search={{ caso: caso.id } as never} />}
        >
          <GavelIcon data-icon="inline-start" />
          Abrir proceso disciplinario
        </Button>
      ) : (
        <Button size="sm" variant="outline" color="neutral" disabled>
          <GavelIcon data-icon="inline-start" />
          Abrir proceso disciplinario
        </Button>
      )}
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
    </div>
  )
}
