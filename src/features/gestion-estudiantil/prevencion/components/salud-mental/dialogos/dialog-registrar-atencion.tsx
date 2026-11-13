import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, InfoIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRegistrarAtencion } from "@/features/gestion-estudiantil/prevencion/api/mutations/salud-mental"
import type { ResumenSenalSM } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ResumenSenalDialogo } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/dialogos/resumen-senal-dialogo"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { ACCION_MAX, validarAtencion } from "@/features/gestion-estudiantil/prevencion/utils/formularios-salud-mental"

interface Props {
  senal: ResumenSenalSM
  onClose: () => void
}

/** Registrar atención (G.8.SAL.6): acción realizada, entidad remitida (opcional) y fecha. */
export function DialogRegistrarAtencion({ senal, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const entidades = useCatalogo("ENTIDAD_REMISION")
  const [accion, setAccion] = useState("")
  const [entidad, setEntidad] = useState("")
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())

  const mut = useRegistrarAtencion({
    mutationConfig: {
      onSuccess: () => {
        notify("Atención registrada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const errores = validarAtencion({ accion, fecha, entidad }, senal.fecha)
  const err = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: senal.id,
      ACCION: accion,
      FK_ENTIDAD: entidad ? Number(entidad) : null,
      FECHA: fechaParaBackend(fecha),
    })
  }

  return (
    <DialogoOperacionShell
      titulo={`Registrar atención — ${senal.estudiante_nombre}`}
      resumen={<ResumenSenalDialogo senal={senal} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar", icon: <ControlPointIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <TextoLargo
            id="atencion-accion"
            label="Acción realizada"
            required
            max={ACCION_MAX}
            value={accion}
            error={err("accion")}
            onChange={setAccion}
          />
        </div>
        <ComboOpciones
          id="atencion-entidad"
          label="Entidad remitida"
          size="default"
          todos="Ninguna"
          placeholder="Ninguna"
          value={entidad}
          options={entidades.map((e) => ({ value: e.value, label: e.label }))}
          onChange={setEntidad}
        />
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fecha")) || undefined}>
          <FieldLabel htmlFor="atencion-fecha">Fecha*</FieldLabel>
          <DatePicker
            id="atencion-fecha"
            value={fecha}
            minDate={parseDateValue(senal.fecha)}
            maxDate={new Date()}
            aria-invalid={Boolean(err("fecha")) || undefined}
            onChange={setFecha}
          />
          {err("fecha") && <FieldError>{err("fecha")}</FieldError>}
        </Field>
        {entidad && (
          <Alert className="sm:col-span-2">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>Con Entidad remitida, la señal pasará a Remitida externamente.</AlertDescription>
          </Alert>
        )}
      </div>
    </DialogoOperacionShell>
  )
}
