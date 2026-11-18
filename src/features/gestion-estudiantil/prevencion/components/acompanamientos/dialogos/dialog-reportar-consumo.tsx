import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { PaperPlaneTiltIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useReportarConsumo } from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  FUENTE_MAX,
  TEXTO_ACOMP_MAX,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

interface Props {
  /** El estudiante de la anotación (de la carga del docente; el gate del backend lo vuelve a validar). */
  matricula: number
  estudiante: string
  onClose: () => void
}

/**
 * Reportar posible consumo de sustancias (G.1.REP.4) desde el Observador: fecha de conocimiento, fuente y lo
 * observado, sin diagnósticos. Queda Pendiente de revisión y avisa a orientación.
 */
export function DialogReportarConsumo({ matricula, estudiante, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [fuente, setFuente] = useState("")
  const [descripcion, setDescripcion] = useState("")

  const hoy = fechaParaBackend(new Date())
  const errores = {
    fecha: !fecha
      ? "La fecha de conocimiento es obligatoria."
      : fechaParaBackend(fecha) > hoy
        ? "La fecha de conocimiento no puede ser posterior a hoy."
        : undefined,
    fuente: errorLargo(fuente, 1, FUENTE_MAX, "La fuente"),
    descripcion: errorLargo(descripcion, 10, TEXTO_ACOMP_MAX, "La descripción de lo observado"),
  }
  const error = (k: keyof typeof errores) => (s.intento ? errores[k] : undefined)

  const mut = useReportarConsumo({
    mutationConfig: {
      onSuccess: () => {
        notify("Reporte enviado: queda Pendiente de revisión por orientación.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  return (
    <DialogoOperacionShell
      titulo="Reportar posible consumo de sustancias"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Enviar reporte",
        icon: <PaperPlaneTiltIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (Object.values(errores).some(Boolean) || !fecha) return enfocarPrimerError()
          mut.mutate({ MATRICULA: matricula, FECHA_CONOCIMIENTO: fechaParaBackend(fecha), FUENTE: fuente, DESCRIPCION: descripcion })
        },
      }}
    >
      <ComboOpciones
        id="reporte-consumo-estudiante"
        label="Estudiante"
        required
        size="default"
        todos={false}
        disabled
        value={String(matricula)}
        options={[{ value: String(matricula), label: estudiante }]}
        description="Solo estudiantes de su carga."
        onChange={() => {}}
      />
      <CampoFecha
        id="reporte-consumo-fecha"
        label="Fecha de conocimiento"
        required
        value={fecha}
        error={error("fecha")}
        onChange={setFecha}
      />
      <CampoTexto
        id="reporte-consumo-fuente"
        label="Fuente"
        required
        max={FUENTE_MAX}
        value={fuente}
        ayuda="Cómo lo supo: lo vio, se lo contaron, un soporte."
        error={error("fuente")}
        onChange={setFuente}
      />
      <TextoLargo
        id="reporte-consumo-descripcion"
        label="Descripción de lo observado"
        required
        max={TEXTO_ACOMP_MAX}
        rows={5}
        placeholder="Describa solo lo que vio u oyó, sin diagnósticos."
        value={descripcion}
        error={error("descripcion")}
        onChange={setDescripcion}
      />
      <p className="text-xs text-muted-foreground">
        Este reporte no sale en el Observador, en el boletín ni en el portal del acudiente. Lo verá el Profesional de
        orientación y usted solo verá su estado.
      </p>
    </DialogoOperacionShell>
  )
}
