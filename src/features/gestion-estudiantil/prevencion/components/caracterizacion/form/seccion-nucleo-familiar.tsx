import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import { BloqueIntegrantes } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/bloque-integrantes"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import { MAX, PERSONAS_MAX } from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

/** Núcleo familiar: personas en el hogar, integrantes, estado civil de los padres y por qué no vive con ellos. */
export function SeccionNucleoFamiliar({ f }: { f: FormularioCaracterizacion }) {
  const { v, set } = f
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Núcleo familiar"
      forzarAbierta={f.seccionConError("nucleo")}
      contentClassName="flex flex-col gap-4 px-4 py-4"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <CampoTexto
          id="hogar-personas"
          label="Personas en el hogar"
          required
          inputMode="numeric"
          value={v.personas}
          disabled={f.lectura}
          ayuda={`Incluye al estudiante (1 a ${PERSONAS_MAX}).`}
          error={f.error("hogar-personas")}
          onChange={(t) => set({ personas: t.replace(/\D/g, "").slice(0, 2) })}
        />
        <CampoLista
          id="hogar-estado-civil"
          label="Estado civil de los padres"
          opciones={f.listas.ESTADO_CIVIL_PADRES}
          value={v.estadoCivil}
          disabled={f.lectura}
          onChange={(estadoCivil) => set({ estadoCivil })}
        />
        <CampoTexto
          id="hogar-motivo-no-vive"
          label="Por qué no vive con sus padres"
          max={MAX.motivoNoVive}
          value={v.motivoNoVive}
          disabled={f.lectura}
          ayuda="Obligatorio para un menor sin padre ni madre conviviente (admite Sin información)."
          error={f.error("hogar-motivo-no-vive")}
          onChange={(motivoNoVive) => set({ motivoNoVive })}
        />
      </div>
      <BloqueIntegrantes f={f} />
    </SeccionPlegable>
  )
}
