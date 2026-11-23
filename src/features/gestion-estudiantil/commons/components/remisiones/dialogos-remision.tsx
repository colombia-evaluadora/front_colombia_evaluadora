import { useCallback, useState } from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ChatTextIcon, FloppyDiskIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  GESTION_REMISION_MAX,
  RESPUESTA_REMISION_MAX,
  RUTA_TEXTO_MAX,
  validarGestionRemision,
  validarRespuestaRemision,
  type ValoresGestionRemision,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-gestion"
// Remisión externa común (V669): se reutilizan las mutaciones de Reintegración, que ya la gestionan.
import {
  useRegistrarGestion,
  useResponderRemision,
} from "@/features/gestion-estudiantil/reintegracion/api/mutations/remisiones"

/**
 * Lo que muestran los modales de una remisión externa (Prevención G.8.GAL.8, Reintegración G.9.REM.4-5).
 * Con `estudiante_nombre` el título lo lleva tras la entidad; sin él, solo la entidad.
 */
export interface ResumenRemision {
  id: number
  entidad_nombre: string
  estudiante_nombre?: string | null
  fecha_remision: string | null
  fecha_esperada: string | null
  estado_etiqueta: string
  vencida: boolean
}

interface PropsDialogo {
  remision: ResumenRemision
  onClose: () => void
  /** Clave de otro módulo que también cambia con la gestión (las mutaciones ya invalidan Reintegración). */
  invalidar?: QueryKey
}

function ResumenDeRemision({ r }: { r: ResumenRemision }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      Fecha de remisión {formatFecha(r.fecha_remision) || "—"} · Fecha esperada actual {formatFecha(r.fecha_esperada) || "—"}
      <Badge variant="soft" color="info">
        <span>{r.estado_etiqueta}</span>
      </Badge>
      {r.vencida && (
        <Badge variant="soft" color="destructive">
          <span>Respuesta pendiente — plazo vencido</span>
        </Badge>
      )}
    </span>
  )
}

const tituloDe = (accion: string, r: ResumenRemision) =>
  `${accion} — ${r.entidad_nombre}${r.estudiante_nombre ? ` · ${r.estudiante_nombre}` : ""}`

/** Las mutaciones de Reintegración invalidan su módulo; `invalidar` suma el de quien lo usa. */
function useAlTerminar(mensaje: string, onClose: () => void, setError: (e: unknown) => void, invalidar?: QueryKey) {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  return {
    onSuccess: () => {
      if (invalidar) queryClient.invalidateQueries({ queryKey: invalidar })
      notify(mensaje, { variant: "success" })
      onClose()
    },
    onError: (e: Error) => setError(e),
  }
}

/** Registrar gestión (§10.4): sin detalle clínico; puede fijar una nueva fecha esperada con motivo. */
export function DialogoGestionRemision({ remision: r, onClose, invalidar }: PropsDialogo) {
  const s = useEstadoDialogo()
  const { user } = useAuth()
  const [v, setV] = useState<ValoresGestionRemision>(() => ({
    fecha: new Date(),
    descripcion: "",
    ajusta: false,
    nuevaFecha: undefined,
    motivoAjuste: "",
  }))
  const set = useCallback((p: Partial<ValoresGestionRemision>) => setV((prev) => ({ ...prev, ...p })), [])
  const errores = validarGestionRemision(v, r.fecha_remision)
  const err = (k: keyof ValoresGestionRemision) => (s.intento ? errores[k] : undefined)
  const mut = useRegistrarGestion({ mutationConfig: useAlTerminar("Gestión registrada.", onClose, s.setError, invalidar) })
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)

  return (
    <DialogoOperacionShell
      titulo={tituloDe("Registrar gestión", r)}
      resumen={<ResumenDeRemision r={r} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-2xl"
      confirmar={{
        label: "Registrar gestión",
        icon: <FloppyDiskIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (Object.keys(errores).length > 0 || !v.fecha) return enfocarPrimerError()
          mut.mutate({
            id: r.id,
            FECHA: fechaParaBackend(v.fecha),
            DESCRIPCION: v.descripcion.trim(),
            NUEVA_FECHA: v.ajusta && v.nuevaFecha ? fechaParaBackend(v.nuevaFecha) : null,
            MOTIVO_AJUSTE: v.ajusta ? v.motivoAjuste.trim() : null,
          })
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CampoFecha id="gestion-remision-fecha" label="Fecha" required value={v.fecha} error={err("fecha")} onChange={(fecha) => set({ fecha })} />
          <p className="text-xs text-muted-foreground">No posterior a hoy ni anterior a la fecha de la remisión.</p>
        </div>
        <Field orientation="vertical" variant="outlined" className="gap-2">
          <FieldLabel htmlFor="gestion-remision-registrada-por">Registrado por</FieldLabel>
          <Input id="gestion-remision-registrada-por" value={user?.name ?? ""} readOnly disabled />
        </Field>
        <div className="sm:col-span-2">
          <TextoLargo
            id="gestion-remision-descripcion"
            label="Descripción"
            required
            rows={3}
            max={GESTION_REMISION_MAX}
            value={v.descripcion}
            error={err("descripcion")}
            descripcion="De 10 a 2000 caracteres; sin detalle clínico."
            onChange={(descripcion) => set({ descripcion })}
          />
        </div>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <Switch size="sm" round checked={v.ajusta} onCheckedChange={(ajusta) => set({ ajusta })} />
          Fijar nueva fecha esperada
        </label>
        {v.ajusta && (
          <>
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("nuevaFecha")) || undefined}>
              <FieldLabel htmlFor="gestion-remision-nueva">Nueva fecha esperada*</FieldLabel>
              <DatePicker
                id="gestion-remision-nueva"
                value={v.nuevaFecha}
                minDate={manana}
                aria-invalid={Boolean(err("nuevaFecha")) || undefined}
                onChange={(nuevaFecha) => set({ nuevaFecha })}
              />
              {err("nuevaFecha") ? <FieldError>{err("nuevaFecha")}</FieldError> : <FieldDescription>Posterior a hoy.</FieldDescription>}
            </Field>
            <div className="sm:col-span-2">
              <TextoLargo
                id="gestion-remision-ajuste"
                label="Motivo del ajuste"
                required
                rows={2}
                max={RUTA_TEXTO_MAX}
                value={v.motivoAjuste}
                error={err("motivoAjuste")}
                descripcion="De 10 a 1000 caracteres; queda con el historial de la fecha esperada."
                onChange={(motivoAjuste) => set({ motivoAjuste })}
              />
            </div>
          </>
        )}
      </div>
    </DialogoOperacionShell>
  )
}

/** Registrar respuesta: deja la remisión Respondida (Regla 46) y cancela los recordatorios pendientes. */
export function DialogoRespuestaRemision({ remision: r, onClose, invalidar }: PropsDialogo) {
  const s = useEstadoDialogo()
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [respuesta, setRespuesta] = useState("")
  const errores = validarRespuestaRemision({ fecha, respuesta }, r.fecha_remision)
  const mut = useResponderRemision({ mutationConfig: useAlTerminar("Respuesta registrada.", onClose, s.setError, invalidar) })

  return (
    <DialogoOperacionShell
      titulo={tituloDe("Registrar respuesta", r)}
      resumen={<ResumenDeRemision r={r} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-2xl"
      confirmar={{
        label: "Registrar respuesta",
        icon: <ChatTextIcon data-icon="inline-start" />,
        onClick: () => {
          s.setIntento(true)
          s.setError(null)
          if (Object.keys(errores).length > 0 || !fecha) return enfocarPrimerError()
          mut.mutate({ id: r.id, FECHA_RESPUESTA: fechaParaBackend(fecha), RESPUESTA: respuesta.trim() })
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <CampoFecha
            id="respuesta-remision-fecha"
            label="Fecha de respuesta"
            required
            value={fecha}
            error={s.intento ? errores.fecha : undefined}
            onChange={setFecha}
          />
          <p className="text-xs text-muted-foreground">No anterior a la Fecha de remisión.</p>
        </div>
        <div className="sm:col-span-2">
          <TextoLargo
            id="respuesta-remision-texto"
            label="Respuesta recibida"
            required
            rows={4}
            max={RESPUESTA_REMISION_MAX}
            value={respuesta}
            error={s.intento ? errores.respuesta : undefined}
            descripcion="Obligatoria si hay Fecha de respuesta. Información sensible: al registrarla, la remisión queda Respondida."
            onChange={setRespuesta}
          />
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
