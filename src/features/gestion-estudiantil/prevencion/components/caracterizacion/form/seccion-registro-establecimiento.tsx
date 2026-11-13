import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

/** Registro del establecimiento: lo que solo ven y editan los funcionarios (el acudiente no lo ve). */
export function SeccionRegistroEstablecimiento({ f }: { f: FormularioCaracterizacion }) {
  return (
    <SeccionPlegable encuadrada comoSeccion titulo="Registro del establecimiento" contentClassName="px-4 py-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="establecimiento-asistencia-acudiente"
          className="gap-2 lg:col-span-2 xl:col-span-3"
          label="Asistencia del acudiente a reuniones y entregas de informes"
          opciones={f.listas.FRECUENCIA_ASIST_ACUDIENTE}
          value={f.v.asistenciaAcudiente}
          disabled={f.lectura}
          onChange={(asistenciaAcudiente) => f.set({ asistenciaAcudiente })}
        />
      </div>
    </SeccionPlegable>
  )
}
