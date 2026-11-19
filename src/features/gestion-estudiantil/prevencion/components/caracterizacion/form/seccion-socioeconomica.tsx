import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { CampoCasillas } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-casillas"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { codigoDeOpcion, CODIGO } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

const digitos = (t: string) => t.replace(/\D/g, "").slice(0, 2)

/** Situación socioeconómica y programas: ingresos, aportantes (convivientes y externos) y programas sociales del hogar. */
export function SeccionSocioeconomica({ f }: { f: FormularioCaracterizacion }) {
  const { v, set, listas } = f
  const recibe = codigoDeOpcion(listas.INFO_PROGRAMAS_SOCIALES, v.infoProgramas) === CODIGO.recibeProgramas
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Situación socioeconómica y programas"
      forzarAbierta={f.seccionConError("socio")}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoLista
          id="socio-ingresos"
          label="Ingresos mensuales del hogar"
          opciones={listas.RANGO_INGRESOS_HOGAR}
          value={v.ingresos}
          disabled={f.lectura}
          onChange={(ingresos) => set({ ingresos })}
        />
        <CampoTexto
          id="socio-aportantes-conv"
          label="Aportantes convivientes"
          inputMode="numeric"
          value={v.aportantesConv}
          disabled={f.lectura}
          ayuda="Quienes viven en el hogar y aportan; no más que las personas en el hogar. Vacío es Sin información."
          error={f.error("socio-aportantes-conv")}
          onChange={(t) => set({ aportantesConv: digitos(t) })}
        />
        <CampoTexto
          id="socio-aportantes-ext"
          label="Aportantes externos"
          inputMode="numeric"
          value={v.aportantesExt}
          disabled={f.lectura}
          ayuda="Apoyos económicos de personas que no conviven. Cero es una cantidad conocida."
          error={f.error("socio-aportantes-ext")}
          onChange={(t) => set({ aportantesExt: digitos(t) })}
        />
        <CampoLista
          key={`info-programas-${f.reinicios}`}
          id="socio-info-programas"
          label="Información de programas sociales"
          required
          opciones={listas.INFO_PROGRAMAS_SOCIALES}
          value={v.infoProgramas}
          disabled={f.lectura}
          error={f.error("socio-info-programas")}
          onChange={f.cambiarInfoProgramas}
        />
      </div>
      {recibe && (
        <CampoCasillas
          id="socio-programas"
          label="Programas sociales que recibe el hogar"
          required
          opciones={listas.PROGRAMA_SOCIAL_HOGAR}
          value={v.programas}
          disabled={f.lectura}
          ayuda="Uno o varios. No es el subsidio educativo de la matrícula."
          error={f.error("socio-programas")}
          onChange={(programas) => set({ programas })}
        />
      )}
    </SeccionPlegable>
  )
}
