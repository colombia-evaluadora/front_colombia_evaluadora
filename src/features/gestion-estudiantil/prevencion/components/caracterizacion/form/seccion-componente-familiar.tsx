import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/**
 * Componente familiar y hábitos académicos: lo que el acudiente declara en el portal. No entra al cálculo de las
 * alertas, y el desempeño percibido es autodeclarado, no una valoración del establecimiento.
 */
export function SeccionComponenteFamiliar({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Componente familiar y hábitos académicos"
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="familiar-tipologia"
          label="Tipología familiar"
          opciones={listas.TIPOLOGIA_FAMILIAR}
          value={v.tipologia}
          disabled={f.lectura}
          onChange={(tipologia) => set({ tipologia })}
        />
        <CampoLista
          id="familiar-desempeno"
          label="Desempeño académico percibido"
          opciones={listas.DESEMPENO_PERCIBIDO}
          value={v.desempeno}
          disabled={f.lectura}
          onChange={(desempeno) => set({ desempeno })}
        />
        <CampoLista
          id="familiar-lugar-estudio"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Lugar adecuado para estudiar en casa"
          opciones={listas.RESPUESTA_DISPONIBILIDAD}
          value={v.lugarEstudio}
          disabled={f.lectura}
          onChange={(lugarEstudio) => set({ lugarEstudio })}
        />
        <CampoLista
          id="familiar-horas-estudio"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Horas diarias de estudio fuera del colegio"
          opciones={listas.HORAS_ESTUDIO}
          value={v.horasEstudio}
          disabled={f.lectura}
          onChange={(horasEstudio) => set({ horasEstudio })}
        />
        <div className="lg:col-span-2">
          <CampoTexto
            id="familiar-temas"
            label="Temas de la escuela de padres"
            max={MAX.temas}
            value={v.temas}
            disabled={f.lectura}
            ayuda="Los temas que el acudiente quisiera que se trabajen en la escuela de padres."
            onChange={(temas) => set({ temas })}
          />
        </div>
      </div>
    </SeccionPlegable>
  )
}
