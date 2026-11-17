import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircleIcon, InfoIcon } from "@/components/ui/icons"

import { useRegistrarCumplimiento } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoOpcionUnica } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-opcion-unica"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import {
  avisoCumplimiento,
  estaPendiente,
  hayErrores,
  type Errores,
  sancionesVigentes,
  validarCumplimiento,
} from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

const RESULTADOS = [
  { value: "CUMPLIDA", label: "Cumplida" },
  { value: "NO_CUMPLIDA", label: "No cumplida" },
]

interface Props {
  proceso: ProcesoDetalle
  /** Sanción a registrar; sin ella se elige entre las pendientes. */
  sancionId?: number
  onClose: () => void
}

/** Registrar cumplimiento — [Sanción] (G.2.PRD.CUM.1): Cumplida o No cumplida, con observación. */
export function DialogRegistrarCumplimiento({ proceso: p, sancionId, onClose }: Props) {
  const pendientes = useMemo(
    () => sancionesVigentes(p).filter((s) => estaPendiente(s) && (sancionId == null || s.id === sancionId)),
    [p, sancionId],
  )
  const [elegida, setElegida] = useState("")
  const [resultado, setResultado] = useState("")
  const [observacion, setObservacion] = useState("")
  const [intento, setIntento] = useState(false)
  const idSancion = elegida || (pendientes.length === 1 ? String(pendientes[0].id) : "")
  const sancion = pendientes.find((s) => String(s.id) === idSancion)
  const opciones = useMemo(() => pendientes.map((s) => ({ value: String(s.id), label: s.nombre })), [pendientes])
  const otras = useMemo(() => sancionesVigentes(p).filter((s) => estaPendiente(s) && String(s.id) !== idSancion), [p, idSancion])
  const e = useMemo(
    (): Errores => (intento ? { ...validarCumplimiento(resultado, observacion), ...(idSancion ? {} : { sancion: "Elija la sanción." }) } : {}),
    [intento, resultado, observacion, idSancion],
  )

  const { error, mutationConfig } = useResultadoEtapa(onClose, "Cumplimiento registrado.")
  const mut = useRegistrarCumplimiento({ mutationConfig })
  const registrar = () => {
    setIntento(true)
    if (!idSancion || hayErrores(validarCumplimiento(resultado, observacion))) return enfocarPrimerError()
    mut.mutate({ sancionId: Number(idSancion), resultado: resultado as "CUMPLIDA" | "NO_CUMPLIDA", observacion })
  }

  return (
    <DialogProcesoShell
      titulo={`Registrar cumplimiento — ${sancion?.nombre ?? "sanción"}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          antes={[p.estudiante.nombre, p.estudiante.grado_grupo]}
          despues={sancion ? [sancion.tiene_duracion ? null : "Sanción sin duración", sancion.estado.nombre] : []}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar cumplimiento", icon: <CheckCircleIcon data-icon="inline-start" />, onClick: registrar }}
      className="sm:max-w-lg"
    >
      {pendientes.length !== 1 && (
        <ComboOpciones
          id="cumplimiento-sancion"
          label="Sanción"
          required
          size="default"
          todos={false}
          value={idSancion}
          options={opciones}
          error={e.sancion}
          onChange={setElegida}
        />
      )}
      <CampoOpcionUnica id="cumplimiento-resultado" label="Resultado" value={resultado} options={RESULTADOS} error={e.resultado} onChange={setResultado} />
      <TextoLargo id="cumplimiento-observacion" label="Observación" required max={1000} rows={3} value={observacion} error={e.observacion} onChange={setObservacion} />
      {sancion && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>{avisoCumplimiento(otras)}</AlertDescription>
        </Alert>
      )}
    </DialogProcesoShell>
  )
}
