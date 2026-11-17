import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowsLeftRightIcon, InfoIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCambiarEstado } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import { useOpcionesRazonesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle, EstadoCaso } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { etiquetaEstado } from "@/features/gestion-estudiantil/reintegracion/api/ui-mappings"
import { CamposRazones } from "@/features/gestion-estudiantil/reintegracion/components/campos-razones"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"
import {
  errorOtraRazon,
  razonesDeCaso,
  razonesParaBackend,
  type RazonesForm,
} from "@/features/gestion-estudiantil/reintegracion/utils/razones"

/**
 * Cambiar estado (G.9.EST.1-4): solo entre `estados_siguientes` del backend. Al ir a Diagnóstico pide al menos
 * una razón del abandono; en alta complejidad, Diagnóstico → Intervención avisa que queda pendiente de validación.
 */
export function DialogoEstado({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const opciones = useOpcionesRazonesQuery().data ?? []
  const siguientes = c.banderas.estados_siguientes
  const [estado, setEstado] = useState<string>(siguientes.length === 1 ? siguientes[0] : "")
  const [razones, setRazones] = useState<RazonesForm>(() => razonesDeCaso(c))

  const pideRazones = estado === "DIAGNOSTICO"
  const avisaValidacion = c.alta_complejidad && c.estado === "DIAGNOSTICO" && estado === "INTERVENCION"

  const errores: { estado?: string; razones?: string; otra?: string } = {}
  if (!estado) errores.estado = "El nuevo estado es obligatorio."
  if (pideRazones) {
    if (razones.marcadas.length === 0) errores.razones = "Marque al menos una razón del abandono."
    errores.otra = errorOtraRazon(razones, opciones)
  }
  const err = (k: keyof typeof errores) => (s.intento ? errores[k] : undefined)

  const mut = useCambiarEstado({
    mutationConfig: {
      onSuccess: () => {
        notify(
          avisaValidacion
            ? "El caso queda en Diagnóstico, pendiente de validación del Administrador."
            : "Estado del caso actualizado.",
          { variant: "success" },
        )
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function cambiar() {
    s.setIntento(true)
    s.setError(null)
    if (errores.estado || errores.razones || errores.otra) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: c.id,
      ESTADO: estado as EstadoCaso,
      ...(pideRazones ? razonesParaBackend(razones, opciones) : {}),
    })
  }

  return (
    <DialogoOperacionShell
      titulo={`Cambiar estado — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      className={pideRazones ? "sm:max-w-3xl" : "sm:max-w-lg"}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Cambiar estado",
        icon: <ArrowsLeftRightIcon data-icon="inline-start" />,
        onClick: cambiar,
        disabled: siguientes.length === 0,
      }}
    >
      <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {siguientes.length === 0 && (
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>El caso no tiene un estado siguiente por esta acción.</AlertDescription>
          </Alert>
        )}
        <ComboOpciones
          id="reintegracion-estado-nuevo"
          label="Nuevo estado"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          disabled={siguientes.length === 0}
          value={estado}
          options={siguientes.map((e) => ({ value: e, label: etiquetaEstado(e) }))}
          error={err("estado")}
          onChange={setEstado}
        />
        {avisaValidacion && (
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Es un caso de alta complejidad: no cambia de estado. Queda en Diagnóstico con la marca Pendiente de
              validación y se avisa al Administrador del establecimiento, que debe validarlo antes de pasar a Intervención.
            </AlertDescription>
          </Alert>
        )}
        {pideRazones && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Razones del abandono*</h3>
            <CamposRazones
              id="reintegracion-estado"
              opciones={opciones}
              value={razones}
              onChange={setRazones}
              errorOtraRazon={err("otra")}
            />
            {err("razones") && <p className="text-xs text-destructive">{err("razones")}</p>}
          </div>
        )}
      </div>
    </DialogoOperacionShell>
  )
}
