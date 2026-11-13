import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"

/** Internet y equipo: conexión del hogar, acceso efectivo del estudiante y computador o tableta para estudiar. */
export function SeccionInternetEquipo({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Internet y equipo para estudiar"
      forzarAbierta={f.seccionConError("internet")}
      contentClassName="px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="internet-hogar"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Disponibilidad de internet en el hogar"
          required
          opciones={listas.RESPUESTA_DISPONIBILIDAD}
          value={v.internetHogar}
          disabled={f.lectura}
          error={f.error("internet-hogar")}
          onChange={(internetHogar) => set({ internetHogar })}
        />
        <CampoLista
          id="internet-estudiar"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Internet utilizable para estudiar"
          required
          opciones={listas.RESPUESTA_DISPONIBILIDAD}
          value={v.internetEstudiar}
          disabled={f.lectura}
          error={f.error("internet-estudiar")}
          onChange={(internetEstudiar) => set({ internetEstudiar })}
        />
        <CampoLista
          id="internet-equipo"
          label="Computador o tableta para estudiar"
          required
          opciones={listas.DISPONIBILIDAD_EQUIPO}
          value={v.equipo}
          disabled={f.lectura}
          error={f.error("internet-equipo")}
          onChange={(equipo) => set({ equipo })}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        La primera describe la conexión del hogar; la segunda, el acceso efectivo del estudiante, que puede ser fuera de casa.
        La disponibilidad de equipo no se presume por tener internet.
      </p>
    </SeccionPlegable>
  )
}
