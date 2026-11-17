import { useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, ListChecksIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  subirSoporteActividad,
  useRegistrarSesion,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/actividades"
import { useParticipantesQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { ActividadDetalle } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { avisarExito } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/avisos"
import {
  dateAFechaIso,
  fechaIsoADate,
  formatHoras,
  numeroDecimal,
  unDecimal,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

const OBSERVACION_MAX = 1000
const DURACION_MIN = 0.5
const DURACION_MAX = 12
const MAX_PARTICIPANTES = 1000

interface Props {
  actividad: ActividadDetalle
  servicioSocial: boolean
  onClose: () => void
}

type Campo = "fecha" | "duracion" | "horas" | "soporte"

/**
 * Nueva sesión (G.5.ACT.SES.1-3): Fecha, Duración, Asistentes (Inscritos, todos marcados de entrada), Horas por
 * asistente en Servicio social, Observación y Soporte (obligatorio con entidad externa).
 */
export function DialogoNuevaSesion({ actividad: a, servicioSocial, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const inicio = fechaIsoADate(a.fecha_inicio)
  const fin = fechaIsoADate(a.fecha_fin)
  const hoy = useMemo(() => {
    const t = new Date()
    return new Date(t.getFullYear(), t.getMonth(), t.getDate())
  }, [])
  const maxFecha = fin && fin < hoy ? fin : hoy
  const exigeSoporte = Boolean(a.entidad_externa)

  const [fecha, setFecha] = useState<Date | undefined>(() => (inicio && hoy < inicio ? undefined : maxFecha))
  const [duracion, setDuracion] = useState("1,0")
  const [quitados, setQuitados] = useState<Set<number>>(new Set())
  const [horasPorAsistente, setHorasPorAsistente] = useState<Record<number, string>>({})
  const [observacion, setObservacion] = useState("")
  const [soporte, setSoporte] = useState<File[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const participantes = useParticipantesQuery(a.id, {
    estado: "INSCRITO",
    pageIndex: 0,
    pageSize: MAX_PARTICIPANTES,
  })
  const inscritos = participantes.data?.rows ?? []
  const marcados = inscritos.filter((p) => !quitados.has(p.id))
  const todosMarcados = inscritos.length > 0 && marcados.length === inscritos.length

  const duracionNum = numeroDecimal(duracion)
  const duracionValida = duracionNum != null && duracionNum >= DURACION_MIN && duracionNum <= DURACION_MAX && unDecimal(duracionNum)
  const textoHoras = (id: number) => horasPorAsistente[id] ?? duracion
  const horasValidas = (id: number) => {
    const n = numeroDecimal(textoHoras(id))
    return n != null && n >= DURACION_MIN && unDecimal(n) && (duracionNum == null || n <= duracionNum)
  }

  const errores: Partial<Record<Campo, string>> = {}
  if (!fecha) errores.fecha = "La fecha es obligatoria."
  if (!duracionValida) errores.duracion = "La duración debe estar entre 0,5 y 12 horas, con un decimal."
  if (servicioSocial && duracionValida && marcados.some((p) => !horasValidas(p.id)))
    errores.horas = `Las horas de cada asistente van desde 0,5 hasta la duración de la sesión (${formatHoras(duracionNum)} h), con un decimal.`
  if (exigeSoporte && soporte.length === 0) errores.soporte = "Adjunte el soporte de la sesión: la actividad tiene entidad externa."
  const error = (c: Campo) => (s.intento ? errores[c] : undefined)

  const mut = useRegistrarSesion({
    mutationConfig: {
      onSuccess: (r) => {
        avisarExito(
          notify,
          servicioSocial
            ? `Sesión guardada; se sumaron las horas de ${r.asistentes} ${r.asistentes === 1 ? "estudiante" : "estudiantes"} a su servicio social.`
            : "Sesión guardada.",
        )
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = async () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    try {
      let archivo: number | null = null
      if (soporte[0]) {
        setSubiendo(true)
        archivo = await subirSoporteActividad(soporte[0])
      }
      mut.mutate({
        id: a.id,
        FECHA: dateAFechaIso(fecha!),
        DURACION_HORAS: duracionNum!,
        OBSERVACION: observacion,
        FK_ARCHIVO_SOPORTE: archivo,
        ASISTENTES: marcados.map((p) => ({
          participante: p.id,
          horas: servicioSocial ? numeroDecimal(textoHoras(p.id)) : null,
        })),
      })
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  const alternarTodos = () => setQuitados(todosMarcados ? new Set(inscritos.map((p) => p.id)) : new Set())
  const alternar = (id: number) =>
    setQuitados((q) => {
      const n = new Set(q)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  return (
    <DialogoOperacionShell
      titulo={`Nueva sesión — ${a.nombre}${servicioSocial ? " (Servicio social)" : ""}`}
      resumen={
        a.entidad_externa ? (
          <span className="text-sm">
            Entidad externa: {a.entidad_externa}
            {a.supervisor_externo ? ` · Supervisor: ${a.supervisor_externo}` : ""}
          </span>
        ) : undefined
      }
      className="sm:max-w-2xl"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending || subiendo}
      confirmar={{ label: "Guardar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <div className="max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-1 gap-4 p-1 sm:grid-cols-2">
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error("fecha")) || undefined}>
            <FieldLabel htmlFor="sesion-fecha">Fecha*</FieldLabel>
            <DatePicker
              id="sesion-fecha"
              value={fecha}
              minDate={inicio}
              maxDate={maxFecha}
              aria-invalid={Boolean(error("fecha")) || undefined}
              onChange={setFecha}
            />
            {error("fecha") && <FieldError>{error("fecha")}</FieldError>}
          </Field>
          <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error("duracion")) || undefined}>
            <FieldLabel htmlFor="sesion-duracion">Duración (horas)*</FieldLabel>
            <Input
              id="sesion-duracion"
              inputMode="decimal"
              value={duracion}
              aria-invalid={Boolean(error("duracion")) || undefined}
              onChange={(e) => setDuracion(e.target.value.replace(/[^\d.,]/g, ""))}
            />
            {error("duracion") && <FieldError>{error("duracion")}</FieldError>}
          </Field>

          <fieldset className="flex flex-col gap-2 sm:col-span-2" data-invalid={Boolean(error("horas")) || undefined}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm">
                <strong className="font-semibold">Asistentes</strong>{" "}
                <span className="text-muted-foreground">
                  {inscritos.length} {inscritos.length === 1 ? "inscrito" : "inscritos"} · {marcados.length}{" "}
                  {marcados.length === 1 ? "marcado" : "marcados"}
                </span>
              </legend>
              <Button type="button" size="sm" variant="outline" disabled={inscritos.length === 0} onClick={alternarTodos}>
                <ListChecksIcon data-icon="inline-start" />
                {todosMarcados ? "Quitar todos" : "Marcar todos"}
              </Button>
            </div>
            {inscritos.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {participantes.isPending ? "Cargando participantes…" : "La actividad no tiene participantes inscritos."}
              </p>
            )}
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {inscritos.map((p) => {
                const marcado = !quitados.has(p.id)
                const horasMal = servicioSocial && marcado && duracionValida && !horasValidas(p.id)
                return (
                  <li key={p.id} className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      <Checkbox checked={marcado} onCheckedChange={() => alternar(p.id)} />
                      <span className="truncate" title={p.estudiante_nombre}>
                        {p.estudiante_nombre} · {p.grado_grupo}
                      </span>
                    </label>
                    {servicioSocial && marcado && (
                      <Input
                        aria-label={`Horas de ${p.estudiante_nombre}`}
                        className="w-20"
                        size="sm"
                        inputMode="decimal"
                        value={textoHoras(p.id)}
                        aria-invalid={horasMal || undefined}
                        onChange={(e) =>
                          setHorasPorAsistente((h) => ({ ...h, [p.id]: e.target.value.replace(/[^\d.,]/g, "") }))
                        }
                      />
                    )}
                  </li>
                )
              })}
            </ul>
            {servicioSocial && (
              <p className="text-xs text-muted-foreground">Las horas de cada asistente se suman a su servicio social.</p>
            )}
            {error("horas") && <FieldError>{error("horas")}</FieldError>}
          </fieldset>

          <div className="sm:col-span-2">
            <TextoLargo
              id="sesion-observacion"
              label="Observación"
              rows={3}
              max={OBSERVACION_MAX}
              value={observacion}
              onChange={setObservacion}
            />
          </div>

          {(exigeSoporte || servicioSocial) && (
            <div className="flex flex-col gap-1 sm:col-span-2" data-invalid={Boolean(error("soporte")) || undefined}>
              <span className="text-sm">Soporte{exigeSoporte ? "*" : ""}</span>
              <SoportesUpload label="Soporte de la sesión" archivos={soporte} onChange={setSoporte} max={1} />
              {error("soporte") ? (
                <FieldError>{error("soporte")}</FieldError>
              ) : (
                <FieldDescription>Reporte firmado por el supervisor externo. PDF o imagen, máximo 10 MB.</FieldDescription>
              )}
            </div>
          )}
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
