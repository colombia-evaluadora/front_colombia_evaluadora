import { useCallback, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRegistrarContactoGestion } from "@/features/gestion-estudiantil/prevencion/api/mutations/gestion-alertas"
import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { ResumenGestionDialogo } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/resumen-gestion"
import { useOpcionesGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/use-opciones-gestion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  RAZON_MAX,
  validarContacto,
  type ValoresContacto,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-gestion"

/** Registrar contacto (G.8.GAL.3): cada intento, también el fallido, queda registrado. */
export function DialogContactoGestion({ gestion, onClose }: { gestion: ResumenGestion; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const op = useOpcionesGestion()
  const [v, setV] = useState<ValoresContacto>(() => ({ fecha: new Date(), medio: "", conQuien: "", resultado: "", razon: "" }))
  const set = useCallback((p: Partial<ValoresContacto>) => setV((prev) => ({ ...prev, ...p })), [])
  const errores = validarContacto(v)
  const err = (k: keyof ValoresContacto) => (s.intento ? errores[k] : undefined)

  const mut = useRegistrarContactoGestion({
    mutationConfig: {
      onSuccess: () => {
        notify("Contacto registrado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !v.fecha) return enfocarPrimerError()
    mut.mutate({
      id: gestion.id,
      FECHA: fechaParaBackend(v.fecha),
      FK_MEDIO: Number(v.medio),
      FK_CON_QUIEN: Number(v.conQuien),
      FK_RESULTADO: Number(v.resultado),
      RAZON: v.razon.trim() || null,
    })
  }

  const combo = (id: string, label: string, k: "medio" | "conQuien" | "resultado", options: typeof op.medios) => (
    <ComboOpciones
      id={id}
      label={label}
      required
      size="default"
      todos={false}
      placeholder="Seleccione"
      value={v[k]}
      options={options}
      error={err(k)}
      onChange={(x) => set({ [k]: x })}
    />
  )

  return (
    <DialogoOperacionShell
      titulo="Registrar contacto"
      resumen={<ResumenGestionDialogo g={gestion} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-2xl"
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CampoFecha id="contacto-fecha" label="Fecha" required value={v.fecha} error={err("fecha")} onChange={(fecha) => set({ fecha })} />
        {combo("contacto-medio", "Medio", "medio", op.medios)}
        {combo("contacto-con-quien", "Con quién", "conQuien", op.conQuien)}
        {combo("contacto-resultado", "Resultado", "resultado", op.resultadosContacto)}
        <CampoTexto
          id="contacto-razon"
          label="Razón informada"
          className="gap-2 sm:col-span-2"
          max={RAZON_MAX}
          ayuda="Lo que dice la familia."
          value={v.razon}
          error={err("razon")}
          onChange={(razon) => set({ razon })}
        />
      </div>
    </DialogoOperacionShell>
  )
}
