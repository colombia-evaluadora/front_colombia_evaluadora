import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { InfoIcon, PencilIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useAceptarPresencial } from "@/features/gestion-estudiantil/prevencion/api/mutations/planes"
import { subirSoportePrevencion } from "@/features/gestion-estudiantil/prevencion/api/mutations/soporte-prevencion"
import { usePlanQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { ESTADO_PLAN_COLOR, ESTADO_PLAN_ETIQUETA } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { validarAceptacion } from "@/features/gestion-estudiantil/prevencion/utils/formularios-seguimiento"

interface Props {
  planId: number
  estudianteNombre: string
  onClose: () => void
}

/**
 * Aceptación presencial del plan (G.8.VAL.7): el soporte firmado es obligatorio. Dos pasos: el archivo se sube
 * primero (`POST /prevencion/soporte`) y su pk viaja en `FK_SOPORTE`.
 */
export function DialogAceptacionPresencial({ planId, estudianteNombre, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const plan = usePlanQuery(planId)
  const [soporte, setSoporte] = useState<File | null>(null)
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [subiendo, setSubiendo] = useState(false)

  const mut = useAceptarPresencial({
    mutationConfig: {
      onSuccess: () => {
        notify("Aceptación presencial registrada; el plan quedó Activo.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const errores = validarAceptacion({ soporte, fecha })
  const err = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  async function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !soporte || !fecha) {
      enfocarPrimerError()
      return
    }
    setSubiendo(true)
    try {
      const archivo = await subirSoportePrevencion(soporte)
      mut.mutate({ id: planId, FECHA: fechaParaBackend(fecha), FK_SOPORTE: archivo })
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  const p = plan.data
  return (
    <DialogoOperacionShell
      titulo={`Aceptación presencial del plan — ${estudianteNombre}`}
      resumen={
        p && (
          <span className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              Plan de acompañamiento del {formatFecha(p.fecha_inicio)}
              <Badge variant="soft" color={ESTADO_PLAN_COLOR[p.estado]}>
                <span>{ESTADO_PLAN_ETIQUETA[p.estado]}</span>
              </Badge>
            </span>
            <span>
              Acudiente: <strong>{p.acudiente?.nombre ?? "Sin acudiente registrado"}</strong>
            </span>
          </span>
        )
      }
      onClose={onClose}
      error={s.error ?? (plan.isError ? plan.error : null)}
      pending={mut.isPending || subiendo}
      confirmar={{ label: "Registrar aceptación", icon: <PencilIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1" data-invalid={Boolean(err("soporte")) || undefined}>
          <SoportesUpload
            label="Soporte firmado*"
            max={1}
            archivos={soporte ? [soporte] : []}
            onChange={(archivos) => setSoporte(archivos[0] ?? null)}
          />
          {err("soporte") && <FieldError>{err("soporte")}</FieldError>}
        </div>
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fecha")) || undefined}>
          <FieldLabel htmlFor="aceptacion-fecha">Fecha de aceptación*</FieldLabel>
          <DatePicker
            id="aceptacion-fecha"
            value={fecha}
            maxDate={new Date()}
            aria-invalid={Boolean(err("fecha")) || undefined}
            onChange={setFecha}
          />
          {err("fecha") && <FieldError>{err("fecha")}</FieldError>}
        </Field>
      </div>
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>El plan pasará a Activo, como si se aceptara en el portal.</AlertDescription>
      </Alert>
    </DialogoOperacionShell>
  )
}
