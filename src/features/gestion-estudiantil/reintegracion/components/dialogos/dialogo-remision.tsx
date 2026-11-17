import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, PaperPlaneTiltIcon } from "@/components/ui/icons"
import { Switch } from "@/components/ui/switch"
import { parseDateValue } from "@/lib/date-value"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { enfocarPrimerError, errorLargo } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { useRegistrarRemision } from "@/features/gestion-estudiantil/reintegracion/api/mutations/remisiones"
import { usePlazoRemisionesQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-remisiones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

const MAX_RECORDATORIOS = 5

/**
 * Remitir (§10.4): entidad, fecha de remisión, motivo y, opcionales, ajuste de la fecha esperada (con motivo),
 * respuesta ya recibida y hasta cinco recordatorios. Sin ajuste, la fecha esperada la propone el backend desde
 * el plazo de seguimiento del establecimiento (días hábiles).
 */
export function DialogoRemision({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const entidades = useCatalogo("ENTIDAD_REMISION")
  const { establecimientoId } = useOpcionesCascada("", "")
  const plazo = usePlazoRemisionesQuery(establecimientoId).data

  const [entidad, setEntidad] = useState("")
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [motivo, setMotivo] = useState("")
  const [ajusta, setAjusta] = useState(false)
  const [esperada, setEsperada] = useState<Date | undefined>()
  const [motivoAjuste, setMotivoAjuste] = useState("")
  const [fechaRespuesta, setFechaRespuesta] = useState<Date | undefined>()
  const [respuesta, setRespuesta] = useState("")
  const [recordatorios, setRecordatorios] = useState<(Date | undefined)[]>([])

  const apertura = parseDateValue(c.fecha_apertura.slice(0, 10))
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  const manana = new Date()
  manana.setHours(0, 0, 0, 0)
  manana.setDate(manana.getDate() + 1)

  const errores: Partial<
    Record<"entidad" | "fecha" | "motivo" | "esperada" | "ajuste" | "fechaRespuesta" | "respuesta" | "recordatorios", string>
  > = {}
  if (!entidad) errores.entidad = "La entidad es obligatoria."
  if (!fecha) errores.fecha = "La fecha de remisión es obligatoria."
  else if (fecha > hoy) errores.fecha = "La fecha de remisión no puede ser posterior a hoy."
  else if (apertura && fecha < apertura) errores.fecha = "La fecha de remisión no puede ser anterior a la apertura del caso."
  errores.motivo = errorLargo(motivo, 10, 2000, "El motivo")
  if (ajusta) {
    if (!esperada) errores.esperada = "La fecha esperada es obligatoria si se ajusta."
    else if (fecha && esperada <= fecha) errores.esperada = "La fecha esperada debe ser posterior a la fecha de remisión."
    errores.ajuste = errorLargo(motivoAjuste, 10, 1000, "El motivo del ajuste")
  }
  if (fechaRespuesta) {
    if (fecha && fechaRespuesta < fecha) errores.fechaRespuesta = "La fecha de respuesta no puede ser anterior a la remisión."
    if (!respuesta.trim()) errores.respuesta = "La respuesta recibida es obligatoria si hay fecha de respuesta."
  }
  const fechasRec = recordatorios.filter((d): d is Date => d != null)
  if (!fechaRespuesta && recordatorios.length > 0) {
    if (recordatorios.some((d) => !d)) errores.recordatorios = "Elija la fecha de cada recordatorio o quite el que sobre."
    else if (fechasRec.some((d) => d < manana)) errores.recordatorios = "Los recordatorios deben ser posteriores a hoy."
    else if (new Set(fechasRec.map((d) => d.getTime())).size !== fechasRec.length)
      errores.recordatorios = "No repita una fecha de recordatorio."
  }
  for (const k of Object.keys(errores) as (keyof typeof errores)[]) if (!errores[k]) delete errores[k]
  const err = (k: keyof typeof errores) => (s.intento ? errores[k] : undefined)

  const mut = useRegistrarRemision({
    mutationConfig: {
      onSuccess: () => {
        notify("Remisión registrada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function remitir() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: c.id,
      FK_ENTIDAD: Number(entidad),
      MOTIVO: motivo.trim(),
      FECHA: fechaParaBackend(fecha),
      ...(ajusta && esperada ? { FECHA_ESPERADA: fechaParaBackend(esperada), MOTIVO_AJUSTE: motivoAjuste.trim() } : {}),
      ...(fechaRespuesta ? { FECHA_RESPUESTA: fechaParaBackend(fechaRespuesta), RESPUESTA: respuesta.trim() } : {}),
      ...(!fechaRespuesta && fechasRec.length > 0 ? { RECORDATORIOS: fechasRec.map(fechaParaBackend) } : {}),
    })
  }

  const campoFecha = (
    id: string,
    label: string,
    value: Date | undefined,
    onChange: (d: Date | undefined) => void,
    error: string | undefined,
    limites: { min?: Date; max?: Date },
    requerido?: boolean,
  ) => (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {requerido && "*"}
      </FieldLabel>
      <DatePicker
        id={id}
        value={value}
        minDate={limites.min}
        maxDate={limites.max}
        aria-invalid={Boolean(error) || undefined}
        onChange={onChange}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )

  return (
    <DialogoOperacionShell
      titulo={`Remitir — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Remitir", icon: <PaperPlaneTiltIcon data-icon="inline-start" />, onClick: remitir }}
    >
      <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <ComboOpciones
          id="remision-entidad"
          label="Entidad"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={entidad}
          options={entidades.map((e) => ({ value: e.value, label: e.label }))}
          error={err("entidad")}
          onChange={setEntidad}
        />
        {campoFecha("remision-fecha", "Fecha de remisión", fecha, setFecha, err("fecha"), { min: apertura, max: new Date() }, true)}
        <div className="sm:col-span-2">
          <TextoLargo
            id="remision-motivo"
            label="Motivo"
            required
            rows={4}
            max={2000}
            value={motivo}
            error={err("motivo")}
            onChange={setMotivo}
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="flex h-11 items-center gap-3 text-sm">
            <Switch round checked={ajusta} onCheckedChange={setAjusta} />
            Ajustar la fecha esperada de respuesta
          </label>
          <FieldDescription>
            {plazo
              ? `Si no la ajusta, se propone desde la fecha de remisión más ${plazo.plazo_seguimiento_dias} días hábiles de seguimiento.`
              : "Si no la ajusta, se propone desde la fecha de remisión más el plazo de seguimiento del establecimiento."}
          </FieldDescription>
        </div>
        {ajusta && (
          <>
            {campoFecha("remision-esperada", "Fecha esperada de respuesta", esperada, setEsperada, err("esperada"), {}, true)}
            <div className="sm:col-span-2">
              <TextoLargo
                id="remision-ajuste"
                label="Motivo del ajuste"
                required
                rows={3}
                max={1000}
                value={motivoAjuste}
                error={err("ajuste")}
                onChange={setMotivoAjuste}
              />
            </div>
          </>
        )}
        {campoFecha("remision-fecha-respuesta", "Fecha de respuesta", fechaRespuesta, setFechaRespuesta, err("fechaRespuesta"), {
          min: fecha,
          max: new Date(),
        })}
        {fechaRespuesta && (
          <div className="sm:col-span-2">
            <TextoLargo
              id="remision-respuesta"
              label="Respuesta recibida"
              required
              rows={3}
              max={3000}
              value={respuesta}
              error={err("respuesta")}
              onChange={setRespuesta}
            />
          </div>
        )}
        {!fechaRespuesta && (
          <div className="flex flex-col gap-2 sm:col-span-2" data-invalid={Boolean(err("recordatorios")) || undefined}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Recordatorios (hasta {MAX_RECORDATORIOS})</span>
              <Button
                size="sm"
                type="button"
                variant="outline"
                color="neutral"
                disabled={recordatorios.length >= MAX_RECORDATORIOS}
                onClick={() => setRecordatorios([...recordatorios, undefined])}
              >
                <ControlPointIcon data-icon="inline-start" />
                Agregar recordatorio
              </Button>
            </div>
            {recordatorios.map((d, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  {campoFecha(
                    `remision-recordatorio-${i}`,
                    `Fecha del recordatorio ${i + 1}`,
                    d,
                    (v) => setRecordatorios(recordatorios.map((x, j) => (j === i ? v : x))),
                    undefined,
                    { min: manana },
                  )}
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  color="neutral"
                  onClick={() => setRecordatorios(recordatorios.filter((_, j) => j !== i))}
                >
                  Quitar
                </Button>
              </div>
            ))}
            {err("recordatorios") && <FieldError>{err("recordatorios")}</FieldError>}
          </div>
        )}
      </div>
    </DialogoOperacionShell>
  )
}
