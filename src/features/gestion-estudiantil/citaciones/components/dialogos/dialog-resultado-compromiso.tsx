import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { CheckIcon } from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"

import { useRegistrarResultado } from "@/features/gestion-estudiantil/citaciones/api/mutations/resultado-compromiso"
import { useCompromisoQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-compromisos-query"
import type { CompromisoRow, ResultadoCompromisoInput } from "@/features/gestion-estudiantil/citaciones/api/types"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/citaciones/components/dialogos/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/citaciones/hooks/use-estado-dialogo"
import { ResumenCompromiso } from "@/features/gestion-estudiantil/citaciones/components/dialogos/resumen-compromiso"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"

interface Props {
  compromiso: CompromisoRow
  onClose: () => void
}

/**
 * Resultado del compromiso (G.3.CMP.6, §4.2): Cumplido o Incumplido, final e irreversible, solo desde Vigente y
 * solo quien lo creó. Lista los compromisos para que se juzgue el conjunto; la observación es opcional (hasta 1000).
 */
export function DialogResultadoCompromiso({ compromiso: c, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [resultado, setResultado] = useState<ResultadoCompromisoInput["RESULTADO"]>("CUMPLIDO")
  const [observacion, setObservacion] = useState("")
  const detalle = useCompromisoQuery(c.id)

  const mut = useRegistrarResultado({
    mutationConfig: {
      onSuccess: () => {
        notify(resultado === "CUMPLIDO" ? "Compromiso marcado como cumplido." : "Compromiso marcado como incumplido.", {
          variant: "success",
        })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const errorObservacion = observacion.trim().length > 1000 ? "La observación admite hasta 1000 caracteres." : undefined

  return (
    <DialogoOperacionShell
      titulo={`Resultado del compromiso — ${c.estudiante_nombre}`}
      resumen={<ResumenCompromiso c={c} conEstado />}
      className="sm:max-w-2xl"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: "Registrar resultado",
        icon: <CheckIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (errorObservacion) {
            enfocarPrimerError()
            return
          }
          mut.mutate({ id: c.id, RESULTADO: resultado, OBSERVACION: observacion })
        },
      }}
    >
      {detalle.isPending ? (
        <Skeleton className="h-16" />
      ) : (
        <ol className="flex flex-col divide-y divide-border text-sm">
          {(detalle.data?.items ?? []).map((i, n) => (
            <li key={i.id} className="grid grid-cols-[1.5rem_1fr_auto_auto] items-baseline gap-x-4 py-2">
              <span className="font-medium">{n + 1}</span>
              <span>{i.descripcion}</span>
              <span className="text-muted-foreground">{i.responsable}</span>
              <span className="text-muted-foreground">{formatFecha(i.plazo)}</span>
            </li>
          ))}
        </ol>
      )}

      <Field orientation="vertical" variant="outlined" className="gap-2" role="group" aria-labelledby="resultado-label">
        <FieldLabel id="resultado-label">Resultado*</FieldLabel>
        <RadioGroup
          aria-labelledby="resultado-label"
          className="flex h-11 flex-row items-center gap-6 pr-3 pl-3.5"
          value={resultado}
          onValueChange={(v) => setResultado(v as ResultadoCompromisoInput["RESULTADO"])}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="CUMPLIDO" />
            Cumplido
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="INCUMPLIDO" />
            Incumplido
          </label>
        </RadioGroup>
      </Field>

      <TextoLargo
        id="resultado-observacion"
        label="Observación"
        max={1000}
        value={observacion}
        error={s.intento ? errorObservacion : undefined}
        onChange={setObservacion}
      />
    </DialogoOperacionShell>
  )
}
