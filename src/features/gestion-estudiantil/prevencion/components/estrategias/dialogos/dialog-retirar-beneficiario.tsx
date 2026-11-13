import { useMemo, useState } from "react"
import { addDays } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { PersonRemoveIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRetirarBeneficiario } from "@/features/gestion-estudiantil/prevencion/api/mutations/estrategias"
import type { BeneficiarioEstrategia, ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { MOTIVO_SALIDA_MAX, validarRetiro } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

interface Props {
  estrategia: Pick<ResumenEstrategia, "id" | "nombre">
  beneficiario: Pick<BeneficiarioEstrategia, "id" | "estudiante_nombre" | "fecha_ingreso">
  onClose: () => void
}

/** Retirar de la estrategia (G.8.EST.6): fecha de salida, Resultado de la salida (lista) y Motivo opcional. */
export function DialogRetirarBeneficiario({ estrategia, beneficiario, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const resultados = useCatalogo("RESULTADO_SALIDA_ESTRATEGIA")
  const [salida, setSalida] = useState<Date | undefined>(() => new Date())
  const [resultado, setResultado] = useState("")
  const [motivo, setMotivo] = useState("")

  const opciones = useMemo(() => resultados.map((r) => ({ value: r.value, label: r.label })), [resultados])
  const errores = validarRetiro({ salida, resultado, motivo }, beneficiario.fecha_ingreso)
  const err = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const mut = useRetirarBeneficiario({
    mutationConfig: {
      onSuccess: () => {
        notify("Beneficiario retirado de la estrategia.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function retirar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !salida) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: beneficiario.id,
      FECHA_SALIDA: fechaParaBackend(salida),
      FK_RESULTADO: Number(resultado),
      MOTIVO: motivo.trim() || null,
    })
  }

  const ingreso = beneficiario.fecha_ingreso.slice(0, 10)
  const primerDia = parseDateValue(ingreso)

  return (
    <DialogoOperacionShell
      titulo={`Retirar de ${estrategia.nombre} — ${beneficiario.estudiante_nombre}`}
      resumen={`En la estrategia desde: ${formatFecha(ingreso)}`}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Retirar", icon: <PersonRemoveIcon data-icon="inline-start" />, onClick: retirar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("salida")) || undefined}>
          <FieldLabel htmlFor="retiro-salida">Fecha de salida*</FieldLabel>
          <DatePicker
            id="retiro-salida"
            value={salida}
            minDate={primerDia ? addDays(primerDia, 1) : undefined}
            aria-invalid={Boolean(err("salida")) || undefined}
            onChange={setSalida}
          />
          {err("salida") && <FieldError>{err("salida")}</FieldError>}
        </Field>
        <ComboOpciones
          id="retiro-resultado"
          label="Resultado de la salida"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={resultado}
          options={opciones}
          error={err("resultado")}
          onChange={setResultado}
        />
        <div className="sm:col-span-2">
          <TextoLargo
            id="retiro-motivo"
            label="Motivo de salida"
            max={MOTIVO_SALIDA_MAX}
            value={motivo}
            error={err("motivo")}
            onChange={setMotivo}
          />
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
