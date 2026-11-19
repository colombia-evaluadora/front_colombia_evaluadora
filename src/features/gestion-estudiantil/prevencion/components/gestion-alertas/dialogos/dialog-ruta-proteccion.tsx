import { useCallback, useEffect, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, ShieldIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useActivarRutaProteccion } from "@/features/gestion-estudiantil/prevencion/api/mutations/gestion-alertas"
import { useGestionAlertaQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import type { ResumenGestion } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { useOpcionesGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/use-opciones-gestion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  ACTUACIONES_MAX,
  RECORDATORIOS_MAX,
  RUTA_TEXTO_MAX,
  rutaAjustada,
  validarRuta,
  type ValoresRuta,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-gestion"

const INICIAL: ValoresRuta = {
  entidad: "",
  fecha: new Date(),
  motivo: "",
  descripcion: "",
  entorno: "",
  residencia: "",
  actuaciones: [],
  esperada: undefined,
  motivoAjuste: "",
  recordatorios: [],
}

/**
 * Activar ruta de protección (G.8.GAL.5): todo lo que se escribe es sensible (Regla 1). La fecha esperada se
 * propone con el plazo de seguimiento de remisiones; cambiarla pide un motivo de 10 a 1000 caracteres.
 */
export function DialogRutaProteccion({ gestion, onClose }: { gestion: ResumenGestion; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const op = useOpcionesGestion()
  const defaults = useGestionAlertaQuery(gestion.id).data?.ruta_defaults ?? null
  const propuesta = defaults?.fecha_esperada_propuesta ?? null

  const [v, setV] = useState<ValoresRuta>(() => ({ ...INICIAL, fecha: new Date() }))
  const set = useCallback((p: Partial<ValoresRuta>) => setV((prev) => ({ ...prev, ...p })), [])
  // La propuesta llega con el detalle: se coloca una sola vez, si aún no se eligió otra.
  useEffect(() => {
    if (propuesta) setV((prev) => (prev.esperada ? prev : { ...prev, esperada: parseDateValue(propuesta) }))
  }, [propuesta])

  const ajustada = rutaAjustada(v, propuesta)
  const errores = validarRuta(v, propuesta)
  const err = (k: keyof ValoresRuta) => (s.intento ? errores[k] : undefined)
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)

  const mut = useActivarRutaProteccion({
    mutationConfig: {
      onSuccess: () => {
        notify("Ruta de protección activada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const activar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !v.fecha || !v.esperada) return enfocarPrimerError()
    const fechas = v.recordatorios.filter((d): d is Date => d != null).map(fechaParaBackend)
    mut.mutate({
      id: gestion.id,
      FK_ENTIDAD: Number(v.entidad),
      FECHA: fechaParaBackend(v.fecha),
      MOTIVO: v.motivo.trim(),
      DESCRIPCION: v.descripcion.trim(),
      ENTORNO_FAMILIAR: v.entorno.trim() || null,
      SITUACION_RESIDENCIA: v.residencia.trim() || null,
      ACTUACIONES: v.actuaciones.length ? v.actuaciones.map(Number) : null,
      FECHA_ESPERADA: fechaParaBackend(v.esperada),
      MOTIVO_AJUSTE: ajustada ? v.motivoAjuste.trim() : null,
      RECORDATORIOS: fechas.length ? fechas : null,
    })
  }

  const texto = (id: string, label: string, k: "motivo" | "descripcion" | "entorno" | "residencia", required?: boolean, ayuda?: string) => (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <TextoLargo id={id} label={label} required={required} rows={3} max={RUTA_TEXTO_MAX} value={v[k]} error={err(k)} onChange={(x) => set({ [k]: x })} />
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  )

  return (
    <DialogoOperacionShell
      titulo={`Activar ruta de protección — ${gestion.estudiante_nombre} · ${gestion.grado_grupo}`}
      resumen="Avisa de inmediato al Administrador del establecimiento y al Supervisor de sede, y registra la remisión. Todo lo que escriba aquí es sensible (Regla 1)."
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-3xl"
      confirmar={{ label: "Activar ruta de protección", icon: <ShieldIcon data-icon="inline-start" />, onClick: activar }}
    >
      <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <ComboOpciones
          id="ruta-entidad"
          label="Entidad"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.entidad}
          options={op.entidades}
          error={err("entidad")}
          onChange={(entidad) => set({ entidad })}
        />
        <div className="flex flex-col gap-1">
          <CampoFecha id="ruta-fecha" label="Fecha" required value={v.fecha} error={err("fecha")} onChange={(fecha) => set({ fecha })} />
          <p className="text-xs text-muted-foreground">No posterior a hoy.</p>
        </div>
        {texto("ruta-motivo", "Motivo del informe", "motivo", true, "La situación que motiva el reporte, sin diagnóstico.")}
        {texto("ruta-descripcion", "Descripción de la situación reportada", "descripcion", true)}
        {texto("ruta-entorno", "Entorno familiar y antecedentes institucionales", "entorno", false, "Solo los que se conocen.")}
        {texto("ruta-residencia", "Situación actual de residencia, cuidado y protección", "residencia")}

        <Field orientation="vertical" variant="plain" className="gap-2 sm:col-span-2" data-invalid={Boolean(err("actuaciones")) || undefined}>
          <FieldLabel id="ruta-actuaciones-etiqueta">Actuaciones institucionales</FieldLabel>
          <div role="group" aria-labelledby="ruta-actuaciones-etiqueta" className="flex flex-col gap-2">
            {op.actuaciones.map((o) => {
              const marcada = v.actuaciones.includes(o.value)
              return (
                <label key={o.value} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={marcada}
                    disabled={!marcada && v.actuaciones.length >= ACTUACIONES_MAX}
                    onCheckedChange={(si) =>
                      set({ actuaciones: si ? [...v.actuaciones, o.value] : v.actuaciones.filter((x) => x !== o.value) })
                    }
                  />
                  {o.label}
                </label>
              )
            })}
          </div>
          {err("actuaciones") ? (
            <FieldError>{err("actuaciones")}</FieldError>
          ) : (
            <FieldDescription>Las que el establecimiento ha realizado o solicita; salen en el reporte con su texto.</FieldDescription>
          )}
        </Field>

        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("esperada")) || undefined}>
          <FieldLabel htmlFor="ruta-esperada">Fecha esperada de respuesta*</FieldLabel>
          <DatePicker
            id="ruta-esperada"
            value={v.esperada}
            minDate={v.fecha}
            aria-invalid={Boolean(err("esperada")) || undefined}
            onChange={(esperada) => set({ esperada })}
          />
          {err("esperada") ? (
            <FieldError>{err("esperada")}</FieldError>
          ) : (
            defaults && (
              <FieldDescription>
                Propuesta con el plazo de seguimiento de remisiones ({defaults.plazo_dias_habiles} días hábiles).
              </FieldDescription>
            )
          )}
        </Field>
        {ajustada && (
          <div className="sm:col-span-2">
            <TextoLargo
              id="ruta-motivo-ajuste"
              label="Motivo del ajuste"
              required
              rows={2}
              max={RUTA_TEXTO_MAX}
              value={v.motivoAjuste}
              error={err("motivoAjuste")}
              onChange={(motivoAjuste) => set({ motivoAjuste })}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 sm:col-span-2" data-invalid={Boolean(err("recordatorios")) || undefined}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Recordatorios</span>
            <Button
              size="sm"
              type="button"
              variant="outline"
              color="neutral"
              disabled={v.recordatorios.length >= RECORDATORIOS_MAX}
              onClick={() => set({ recordatorios: [...v.recordatorios, undefined] })}
            >
              <ControlPointIcon data-icon="inline-start" />
              Agregar recordatorio
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Opcional · hasta {RECORDATORIOS_MAX} fechas. Cada fecha avisa una sola vez, ese día, mientras la remisión siga Enviada.
          </p>
          {v.recordatorios.map((d, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field orientation="vertical" variant="outlined" className="flex-1 gap-2">
                <FieldLabel htmlFor={`ruta-recordatorio-${i}`}>Fecha del recordatorio {i + 1}</FieldLabel>
                <DatePicker
                  id={`ruta-recordatorio-${i}`}
                  value={d}
                  minDate={manana}
                  onChange={(x) => set({ recordatorios: v.recordatorios.map((y, j) => (j === i ? x : y)) })}
                />
              </Field>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                color="neutral"
                onClick={() => set({ recordatorios: v.recordatorios.filter((_, j) => j !== i) })}
              >
                Quitar
              </Button>
            </div>
          ))}
          {err("recordatorios") && <FieldError>{err("recordatorios")}</FieldError>}
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
