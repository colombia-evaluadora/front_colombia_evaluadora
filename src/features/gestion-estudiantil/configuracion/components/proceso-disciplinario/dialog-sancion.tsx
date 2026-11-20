import { Switch } from "@/components/ui/switch"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { EfectoSancion, SancionRow } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoDescripcion, CampoNombre, CampoRadios } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/campos-catalogo"
import { useSancionForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-sancion-form"
import { ESTADOS_PROCESO, LIM_PROCESO, type ValoresSancion } from "@/features/gestion-estudiantil/configuracion/utils/proceso"
import { MarcoOpciones } from "@/features/gestion-estudiantil/commons/components/marco-opciones"

interface Props {
  establecimiento: number
  sancion: SancionRow | null
  instancias: Opcion[]
  efectos: EfectoSancion[]
  onClose: () => void
}

/** Nueva sanción y Modificar (G.10.PRD.SAN.3). El efecto se elige entre los que ofrece el backend según el sector. */
export function DialogSancion({ establecimiento, sancion, instancias, efectos, onClose }: Props) {
  const f = useSancionForm({ establecimiento, sancion, efectos, onClose })

  return (
    <DialogoOperacionShell
      titulo={sancion ? "Modificar sanción" : "Nueva sanción"}
      onClose={onClose}
      error={f.error}
      pending={f.pendiente}
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: f.guardar }}
      className="sm:max-w-2xl"
    >
      <CampoNombre
        id="sancion-nombre"
        label="Nombre"
        max={LIM_PROCESO.sancionNombre}
        value={f.valores.nombre}
        error={f.errores.nombre}
        onChange={(nombre) => f.set({ nombre })}
      />
      <CampoDescripcion
        id="sancion-descripcion"
        label="Descripción"
        max={LIM_PROCESO.descripcion}
        value={f.valores.descripcion}
        error={f.errores.descripcion}
        onChange={(descripcion) => f.set({ descripcion })}
      />
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <ComboOpciones
          id="sancion-instancia"
          label="Instancia que decide"
          required
          size="default"
          todos={false}
          value={f.valores.instancia}
          options={instancias}
          error={f.errores.instancia}
          onChange={(instancia) => f.set({ instancia })}
        />
        <MarcoOpciones id="sancion-duracion-marco" label="Tiene duración" error={f.errores.duracion}>
          <label htmlFor="sancion-duracion" className="flex w-fit cursor-pointer items-center gap-3">
            <Switch
              round
              id="sancion-duracion"
              checked={f.valores.duracion}
              aria-invalid={Boolean(f.errores.duracion) || undefined}
              onCheckedChange={(duracion) => f.set({ duracion })}
            />
            {f.valores.duracion ? "Sí" : "No"}
          </label>
        </MarcoOpciones>
      </div>
      <CampoRadios
        id="sancion-efecto"
        label="Efecto de la sanción"
        value={f.valores.efecto}
        options={f.efectoOpciones}
        error={f.errores.efecto}
        onChange={(efecto) => f.set({ efecto })}
      />
      <CampoRadios
        id="sancion-estado"
        label="Estado"
        value={f.valores.estado}
        options={ESTADOS_PROCESO}
        onChange={(estado) => f.set({ estado: estado as ValoresSancion["estado"] })}
      />
    </DialogoOperacionShell>
  )
}
