import { FloppyDiskIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import type { ClasificacionRow } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoDescripcion, CampoNombre, CampoRadios } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/campos-catalogo"
import { useClasificacionForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-clasificacion-form"
import { ESTADOS_PROCESO, LIM_PROCESO, type ValoresClasificacion } from "@/features/gestion-estudiantil/configuracion/utils/proceso"

interface Props {
  establecimiento: number
  clasificacion: ClasificacionRow | null
  onClose: () => void
}

/** Nueva clasificación y Modificar (G.10.PRD.CLA.2–3): Nombre único, Descripción y Estado. */
export function DialogClasificacion({ establecimiento, clasificacion, onClose }: Props) {
  const f = useClasificacionForm({ establecimiento, clasificacion, onClose })

  return (
    <DialogoOperacionShell
      titulo={clasificacion ? "Modificar clasificación" : "Nueva clasificación"}
      onClose={onClose}
      error={f.error}
      pending={f.pendiente}
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: f.guardar }}
    >
      <CampoNombre
        id="clasificacion-nombre"
        label="Nombre"
        max={LIM_PROCESO.clasificacionNombre}
        value={f.valores.nombre}
        error={f.errores.nombre}
        onChange={(nombre) => f.set({ nombre })}
      />
      <CampoDescripcion
        id="clasificacion-descripcion"
        label="Descripción"
        max={LIM_PROCESO.descripcion}
        value={f.valores.descripcion}
        error={f.errores.descripcion}
        onChange={(descripcion) => f.set({ descripcion })}
      />
      <CampoRadios
        id="clasificacion-estado"
        label="Estado"
        value={f.valores.estado}
        options={ESTADOS_PROCESO}
        onChange={(estado) => f.set({ estado: estado as ValoresClasificacion["estado"] })}
      />
    </DialogoOperacionShell>
  )
}
