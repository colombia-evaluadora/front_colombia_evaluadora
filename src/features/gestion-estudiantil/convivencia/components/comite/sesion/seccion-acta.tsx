import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import type { SesionFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-sesion-form"
import { LIM } from "@/features/gestion-estudiantil/convivencia/utils/comite"

/** «Elabora el acta» (uno de los asistentes marcados) y los adjuntos de la sesión. */
export function SeccionActaAdjuntos({ form }: { form: SesionFormState }) {
  const { v, set, errores, vigentes, asistentes } = form
  const opciones = vigentes
    .filter((i) => asistentes.includes(i.id))
    .map((i) => ({ value: String(i.id), label: `${i.cargo_nombre} · ${i.nombre}` }))
  const cupo = LIM.adjuntos - v.adjuntosGuardados.length
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:max-w-2xl">
        <ComboOpciones
          id="sesion-elabora"
          label="Elabora el acta"
          size="default"
          todos="Ninguno"
          description="Uno de los asistentes (p. ej. quien hace de secretario)."
          value={v.elabora}
          options={opciones}
          error={errores.elabora}
          onChange={(elabora) => set({ elabora })}
        />
      </div>
      {v.adjuntosGuardados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {v.adjuntosGuardados.map((a) => (
            <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1 text-sm">
              <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
              <BotonQuitar
                label={`Quitar ${a.nombre}`}
                onClick={() => set({ adjuntosGuardados: v.adjuntosGuardados.filter((x) => x.id !== a.id) })}
              />
            </li>
          ))}
        </ul>
      )}
      {cupo > 0 && (
        <SoportesUpload
          label="Adjuntos"
          archivos={v.adjuntos}
          onChange={(adjuntos) => set({ adjuntos })}
          max={cupo}
          ayuda="PDF, JPG o PNG; hasta 10 MB cada uno y 5 archivos. Se ven en Ver detalle; no salen en el PDF del acta."
        />
      )}
    </div>
  )
}
