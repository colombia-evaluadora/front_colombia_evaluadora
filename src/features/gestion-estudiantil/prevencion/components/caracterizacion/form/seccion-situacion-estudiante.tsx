import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoSiNo } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-si-no"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/** Situación del estudiante: vive solo, trabajo, maternidad o paternidad temprana, protección del Estado y desplazamiento. */
export function SeccionSituacionEstudiante({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Situación del estudiante"
      forzarAbierta={f.seccionConError("situacion")}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoSiNo
          id="situacion-vive-solo"
          label="Vive solo"
          required
          value={v.viveSolo}
          disabled={f.lectura}
          ayuda="Sí exige una persona en el hogar y ningún integrante conviviente."
          error={f.error("situacion-vive-solo")}
          onChange={(viveSolo) => set({ viveSolo })}
        />
        <CampoLista
          id="situacion-trabajo"
          label="Trabajo del estudiante"
          required
          opciones={listas.TRABAJO_ESTUDIANTE}
          value={v.trabajo}
          disabled={f.lectura}
          error={f.error("situacion-trabajo")}
          onChange={(trabajo) => set({ trabajo })}
        />
        <CampoLista
          id="situacion-temprana-edad"
          label="Madre o padre a temprana edad"
          required
          opciones={listas.RESPUESTA_ACOMPANAMIENTO}
          value={v.tempranaEdad}
          disabled={f.lectura}
          error={f.error("situacion-temprana-edad")}
          onChange={(tempranaEdad) => set({ tempranaEdad })}
        />
        <CampoTexto
          id="situacion-desea"
          label="Qué desea estudiar"
          max={MAX.desea}
          value={v.desea}
          disabled={f.lectura}
          onChange={(desea) => set({ desea })}
        />
        <CampoTexto
          id="situacion-lugar-hermanos"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Lugar que ocupa entre los hermanos"
          inputMode="numeric"
          value={v.lugarHermanos}
          disabled={f.lectura}
          error={f.error("situacion-lugar-hermanos")}
          onChange={(t) => set({ lugarHermanos: t.replace(/\D/g, "").slice(0, 2) })}
        />
        <CampoLista
          id="situacion-proteccion"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Estudiante bajo protección del Estado"
          opciones={listas.RESPUESTA_ACOMPANAMIENTO}
          value={v.proteccion}
          disabled={f.lectura}
          onChange={(proteccion) => set({ proteccion })}
        />
        <CampoTexto
          id="situacion-complementarios"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Programas complementarios externos"
          max={MAX.complementarios}
          value={v.complementarios}
          disabled={f.lectura}
          onChange={(complementarios) => set({ complementarios })}
        />
        <CampoTexto
          id="situacion-transporte"
          className="gap-2 lg:col-span-2 xl:col-span-1"
          label="Medio de transporte al establecimiento"
          max={MAX.transporte}
          value={v.transporte}
          disabled={f.lectura}
          onChange={(transporte) => set({ transporte })}
        />
        <CampoTexto
          id="situacion-desplazamiento"
          label="Tiempo de desplazamiento (minutos)"
          inputMode="numeric"
          value={v.desplazamiento}
          disabled={f.lectura}
          ayuda="De 0 a 300; orienta la estrategia de transporte escolar."
          error={f.error("situacion-desplazamiento")}
          onChange={(t) => set({ desplazamiento: t.replace(/\D/g, "").slice(0, 3) })}
        />
        <div className="lg:col-span-2 xl:col-span-3">
          <TextoLargo
            id="situacion-otra-info"
            label="Otra información relevante"
            max={MAX.otraInfo}
            rows={3}
            value={v.otraInfo}
            disabled={f.lectura}
            onChange={(otraInfo) => set({ otraInfo })}
          />
        </div>
      </div>
    </SeccionPlegable>
  )
}
