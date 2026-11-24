import { useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { MarcoOpciones } from "@/components/marco-opciones"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, FloppyDiskIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRemisionExterna } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { subirSoportePiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"

const MAX_RECORDATORIOS = 5

interface Props {
  atencionId: number
  /** Fecha (aaaa-mm-dd) de la atención: la esperada es posterior y la de respuesta no es anterior. */
  fechaAtencion: string
  entidades: { value: string; label: string }[]
  onClose: () => void
}

/**
 * G.4.ORI.ATE.1: remisión externa de una atención ya guardada. Sin ajuste, la fecha esperada la propone el
 * backend con el plazo de seguimiento del establecimiento; ajustarla exige un motivo de 10 a 1000 (Regla 20).
 */
export function DialogRemisionExterna({ atencionId, fechaAtencion, entidades, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const guardar = useRemisionExterna(atencionId)
  const atencion = useMemo(() => parseDateValue(fechaAtencion.slice(0, 10)), [fechaAtencion])

  const [entidad, setEntidad] = useState("")
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [motivo, setMotivo] = useState("")
  const [ajusta, setAjusta] = useState(false)
  const [esperada, setEsperada] = useState<Date | undefined>()
  const [motivoAjuste, setMotivoAjuste] = useState("")
  const [fechaRespuesta, setFechaRespuesta] = useState<Date | undefined>()
  const [respuesta, setRespuesta] = useState("")
  const [recordatorios, setRecordatorios] = useState<(Date | undefined)[]>([])
  const [soportes, setSoportes] = useState<File[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  const manana = new Date()
  manana.setHours(0, 0, 0, 0)
  manana.setDate(manana.getDate() + 1)

  const errores: Partial<Record<"entidad" | "fecha" | "motivo" | "esperada" | "ajuste" | "fechaRespuesta" | "respuesta" | "recordatorios", string>> = {}
  if (!entidad) errores.entidad = "La entidad es obligatoria."
  if (!fecha) errores.fecha = "La fecha es obligatoria."
  else if (fecha > hoy) errores.fecha = "La fecha no puede ser posterior a hoy."
  errores.motivo = errorLargo(motivo, 10, 1000, "El motivo")
  if (ajusta) {
    if (!esperada) errores.esperada = "La fecha esperada es obligatoria si se ajusta."
    else if (atencion && esperada <= atencion) errores.esperada = "La fecha esperada debe ser posterior a la fecha de la atención."
    errores.ajuste = errorLargo(motivoAjuste, 10, 1000, "El motivo del ajuste")
  }
  if (fechaRespuesta) {
    if (atencion && fechaRespuesta < atencion) errores.fechaRespuesta = "La fecha de respuesta no puede ser anterior a la fecha de la atención."
    if (!respuesta.trim()) errores.respuesta = "La respuesta recibida es obligatoria si hay fecha de respuesta."
  }
  const fechasRec = recordatorios.filter((d): d is Date => d != null)
  if (!fechaRespuesta && recordatorios.length > 0) {
    if (recordatorios.some((d) => !d)) errores.recordatorios = "Elija la fecha de cada recordatorio o quite el que sobre."
    else if (fechasRec.some((d) => d < manana)) errores.recordatorios = "Los recordatorios deben ser posteriores a hoy."
    else if (new Set(fechasRec.map((d) => d.getTime())).size !== fechasRec.length) errores.recordatorios = "No repita una fecha de recordatorio."
  }
  for (const k of Object.keys(errores) as (keyof typeof errores)[]) if (!errores[k]) delete errores[k]
  const err = (k: keyof typeof errores) => (s.intento ? errores[k] : undefined)

  async function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !fecha) return enfocarPrimerError()
    setSubiendo(true)
    try {
      // Los soportes se suben al confirmar: una subida cancelada no deja un TARCHIVO huérfano.
      const pks = await Promise.all(soportes.map(subirSoportePiar))
      await guardar.mutateAsync({
        REMISION_EXTERNA: null,
        FK_ENTIDAD: Number(entidad),
        FECHA: fechaParaBackend(fecha),
        MOTIVO: motivo.trim(),
        ...(ajusta && esperada ? { FECHA_ESPERADA: fechaParaBackend(esperada), MOTIVO_AJUSTE: motivoAjuste.trim() } : {}),
        ...(fechaRespuesta ? { FECHA_RESPUESTA: fechaParaBackend(fechaRespuesta), RESPUESTA: respuesta.trim() } : {}),
        ...(!fechaRespuesta && fechasRec.length > 0 ? { RECORDATORIOS: fechasRec.map(fechaParaBackend) } : {}),
        SOPORTES: pks,
      })
      notify("Remisión externa registrada.", { variant: "success" })
      onClose()
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  const campoFecha = (id: string, label: string, value: Date | undefined, onChange: (d: Date | undefined) => void, error: string | undefined, limites: { min?: Date; max?: Date }, requerido?: boolean) => (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {requerido && "*"}
      </FieldLabel>
      <DatePicker id={id} value={value} minDate={limites.min} maxDate={limites.max} aria-invalid={Boolean(error) || undefined} onChange={onChange} />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )

  return (
    <DialogoOperacionShell
      titulo="Registrar remisión externa"
      className="sm:max-w-3xl"
      onClose={onClose}
      error={s.error}
      pending={guardar.isPending || subiendo}
      confirmar={{ label: "Registrar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: registrar }}
    >
      <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <ComboOpciones id="ate-ext-entidad" label="Entidad" required size="default" todos={false} placeholder="Seleccione" value={entidad} options={entidades} error={err("entidad")} onChange={setEntidad} />
        {campoFecha("ate-ext-fecha", "Fecha", fecha, setFecha, err("fecha"), { max: new Date() }, true)}
        <div className="sm:col-span-2">
          <TextoLargo
            id="ate-ext-motivo"
            label="Motivo de la remisión"
            required
            rows={4}
            max={1000}
            value={motivo}
            error={err("motivo")}
            descripcion="La conducta o situación observable que la motiva, sin diagnóstico ni detalle clínico."
            onChange={setMotivo}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <MarcoOpciones id="ate-ext-ajusta">
            <label className="flex items-center gap-3">
              <Switch round checked={ajusta} onCheckedChange={setAjusta} />
              Ajustar la fecha esperada de respuesta
            </label>
          </MarcoOpciones>
          <FieldDescription>Si no la ajusta, se propone desde la fecha de la remisión más el plazo de seguimiento del establecimiento.</FieldDescription>
        </div>
        {ajusta && (
          <>
            {campoFecha("ate-ext-esperada", "Fecha esperada de respuesta", esperada, setEsperada, err("esperada"), { min: atencion }, true)}
            <div className="sm:col-span-2">
              <TextoLargo
                id="ate-ext-ajuste"
                label="Motivo del ajuste"
                required
                rows={3}
                max={1000}
                value={motivoAjuste}
                error={err("ajuste")}
                descripcion="Queda con su historial; sin diagnóstico ni detalle clínico."
                onChange={setMotivoAjuste}
              />
            </div>
          </>
        )}
        {campoFecha("ate-ext-fecha-respuesta", "Fecha de respuesta", fechaRespuesta, setFechaRespuesta, err("fechaRespuesta"), { min: atencion, max: new Date() })}
        {fechaRespuesta && (
          <div className="sm:col-span-2">
            <TextoLargo id="ate-ext-respuesta" label="Respuesta recibida" required rows={3} max={3000} value={respuesta} error={err("respuesta")} onChange={setRespuesta} />
          </div>
        )}
        {!fechaRespuesta && (
          <div className="flex flex-col gap-2 sm:col-span-2" data-invalid={Boolean(err("recordatorios")) || undefined}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Recordatorios (hasta {MAX_RECORDATORIOS})</span>
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={recordatorios.length >= MAX_RECORDATORIOS} onClick={() => setRecordatorios([...recordatorios, undefined])}>
                <ControlPointIcon data-icon="inline-start" />
                Agregar recordatorio
              </Button>
            </div>
            {recordatorios.map((d, i) => (
              // Sin id propio por fila: el índice es la identidad de un recordatorio aún sin guardar.
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  {campoFecha(`ate-ext-recordatorio-${i}`, `Fecha del recordatorio ${i + 1}`, d, (v) => setRecordatorios(recordatorios.map((x, j) => (j === i ? v : x))), undefined, { min: manana })}
                </div>
                <Button size="sm" type="button" variant="ghost" color="neutral" onClick={() => setRecordatorios(recordatorios.filter((_, j) => j !== i))}>
                  Quitar
                </Button>
              </div>
            ))}
            {err("recordatorios") && <FieldError>{err("recordatorios")}</FieldError>}
          </div>
        )}
        <div className="sm:col-span-2">
          <SoportesUpload label="Soportes" archivos={soportes} onChange={setSoportes} max={3} />
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
