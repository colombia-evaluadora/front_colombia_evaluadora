import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { CheckIcon, SpinnerIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"
import { Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import { evalCol } from "@/lib/eval-col-client"

import { useAprobacionesAsistenciaMutation } from "@/features/academic-management/asistencia/api/mutations/use-aprobaciones-asistencia-mutation"
import { useGuardarPlanillaMutation } from "@/features/academic-management/reports/api/mutations/use-guardar-planilla"
import { useRechazarPlanillaMutation } from "@/features/academic-management/reports/api/mutations/use-rechazar-planilla"
import type { AprobacionBot, EstadoSolicitudAprobacion } from "@/features/comunicaciones/chat/api/types"
import { planeadorKeys } from "@/features/planeador/api/query-keys"
import { TEXTAREA_OUTLINED } from "@/features/planeador/components/forms/form-editar-actividad/constants"

const MOTIVO_MAX = 1000
const MEDIA_ALERTA = "size-12 rounded-full bg-orange-22 text-orange *:[svg:not([class*='size-'])]:size-7"

/** "Se aplicarán 2 modificaciones en 2 estudiantes." (diseño 400:43856). */
function resumenCambios(filas: PendienteRow[]) {
  const n = filas.length
  const estudiantes = new Set(filas.map((f) => f.fk_tmatricula).filter((m) => m != null)).size
  const verbo = n === 1 ? "Se aplicará 1 modificación" : `Se aplicarán ${n} modificaciones`
  if (estudiantes === 0) return `${verbo}.`
  return `${verbo} en ${estudiantes === 1 ? "1 estudiante" : `${estudiantes} estudiantes`}.`
}

interface PendienteRow {
  pk_tsolicitud_aprobacion: number
  fk_tasignatura: number | null
  fk_tperiodo_evaluacion: number | null
  fk_tmatricula: number | null
}

/** Lo que sigue pendiente de la tarjeta: la planilla entera en notas, la solicitud en lo demás. */
const pendientesBotKey = (a: AprobacionBot) => ["aprobaciones", "bot", a.tipo, a.grupoId] as const

function usePendientesTarjeta(a: AprobacionBot) {
  return useQuery({
    queryKey: pendientesBotKey(a),
    // El mismo `GET /aprobaciones/pendientes` de Informes y Asistencia (ya filtrado por alcance).
    queryFn: () => evalCol.getRows<PendienteRow>(`/aprobaciones/pendientes?tipo=${a.tipo}&grupo=${a.grupoId}`),
    select: (rows) =>
      rows.filter((r) =>
        a.tipo === "CORRECCION_RESULTADO"
          ? r.fk_tasignatura === a.asignaturaId && r.fk_tperiodo_evaluacion === a.periodoId
          : r.pk_tsolicitud_aprobacion === a.solicitudId,
      ),
    enabled: a.resolver && a.grupoId != null,
  })
}

const ESTADO_UI: Record<EstadoSolicitudAprobacion, { label: string; color: "warning" | "success" | "destructive" }> = {
  PENDIENTE: { label: "Pendiente", color: "warning" },
  APROBADA: { label: "Aprobada", color: "success" },
  RECHAZADA: { label: "Rechazada", color: "destructive" },
}

export function EstadoSolicitudBadge({ estado }: { estado: EstadoSolicitudAprobacion }) {
  const ui = ESTADO_UI[estado] ?? ESTADO_UI.PENDIENTE
  return (
    <Badge variant="soft" color={ui.color}>
      {ui.label}
    </Badge>
  )
}

/**
 * Aprobar / Rechazar desde Colevabot sin lógica propia: en una corrección de nota (Regla 55) son los
 * mismos servicios de la planilla de Informes ("Aprobar y actualizar consolidado" =
 * `POST /informes/planilla/guardar`, que aprueba las correcciones y recalcula el consolidado; y
 * "Rechazar cambios" = `POST /aprobaciones/rechazar-masivo`). Recuperación (Reglas 69-71) y
 * asistencia (Regla 75) usan `POST /aprobaciones/{aprobar|rechazar}-masivo`, como Asistencia.
 */
export function AprobacionBotAcciones({ aprobacion: a }: { aprobacion: AprobacionBot }) {
  const queryClient = useQueryClient()
  const { notify } = useNotify()
  const pendientes = usePendientesTarjeta(a)
  const guardarPlanilla = useGuardarPlanillaMutation()
  const rechazarPlanilla = useRechazarPlanillaMutation()
  const decidir = useAprobacionesAsistenciaMutation()
  const [aprobando, setAprobando] = React.useState(false)
  const [rechazando, setRechazando] = React.useState(false)
  const [motivo, setMotivo] = React.useState("")

  // Aprobada / rechazada ya se ven en el color de la tarjeta (diseño 400:47651 / 400:47937).
  if (!a.resolver) return a.estado === "PENDIENTE" ? <EstadoSolicitudBadge estado={a.estado} /> : null

  const esNota = a.tipo === "CORRECCION_RESULTADO"
  const filas = pendientes.data ?? []
  const ocupado = guardarPlanilla.isPending || rechazarPlanilla.isPending || decidir.isPending

  function refrescar() {
    queryClient.invalidateQueries({ queryKey: ["aprobaciones", "bot"] })
    queryClient.invalidateQueries({ queryKey: planeadorKeys.all })
  }

  async function aprobar() {
    try {
      if (esNota) {
        const matriculas = [...new Set(filas.map((f) => f.fk_tmatricula).filter((m): m is number => m != null))]
        await guardarPlanilla.mutateAsync({
          grupoId: Number(a.grupoId),
          asignaturaId: Number(a.asignaturaId),
          periodoId: Number(a.periodoId),
          matriculas,
        })
      } else {
        await decidir.mutateAsync({ decision: "aprobar", ids: [a.solicitudId], motivo: "" })
      }
      setAprobando(false)
      notify("Solicitud aprobada: el cambio ya se aplicó.", { variant: "success" })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      refrescar()
    }
  }

  async function rechazar() {
    try {
      if (esNota) {
        await rechazarPlanilla.mutateAsync({
          grupoId: Number(a.grupoId),
          asignaturaId: Number(a.asignaturaId),
          periodoId: Number(a.periodoId),
          motivo,
        })
      } else {
        await decidir.mutateAsync({ decision: "rechazar", ids: [a.solicitudId], motivo })
      }
      setRechazando(false)
      setMotivo("")
      notify("Solicitud rechazada: sigue vigente el valor anterior.", { variant: "success" })
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
    } finally {
      refrescar()
    }
  }

  if (pendientes.isPending) {
    return <SpinnerIcon className="size-4 animate-spin text-muted-foreground" aria-label="Consultando la solicitud" />
  }
  if (pendientes.isError) {
    return (
      <p className="text-xs text-muted-foreground">
        No se pudo consultar el estado de la solicitud.{" "}
        <Button size="sm" variant="link" onClick={() => void pendientes.refetch()}>
          Reintentar
        </Button>
      </p>
    )
  }
  if (filas.length === 0) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="soft" color="neutral">
          Resuelta
        </Badge>
        Ya no hay cambios pendientes por aprobar.
      </p>
    )
  }

  return (
    <div className="space-y-2 border-t pt-3">
      {esNota && filas.length > 1 && (
        <p className="text-xs text-muted-foreground">{filas.length} cambios pendientes en esta planilla.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="fill" color="success" disabled={ocupado} onClick={() => setAprobando(true)}>
          <CheckIcon data-icon="inline-start" />
          {esNota ? "Aprobar y actualizar consolidado" : "Aprobar"}
        </Button>
        <Button size="sm" variant="outline" color="destructive" disabled={ocupado} onClick={() => setRechazando(true)}>
          <XIcon data-icon="inline-start" />
          Rechazar
        </Button>
      </div>
      {/* Confirmaciones del diseño 400:43856 / 400:44915: ícono de alerta, pregunta, "Sí" y "Cancelar". */}
      <AlertDialog open={aprobando} onOpenChange={(next) => !ocupado && setAprobando(next)}>
        <AlertDialogContent size="sm" className="data-[size=sm]:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className={MEDIA_ALERTA}>
              <WarningCircleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Aprobar los cambios propuestos?</AlertDialogTitle>
            <AlertDialogDescription>
              {esNota
                ? `${resumenCambios(filas)} Esta acción actualizará las notas oficiales.`
                : "Se aplicará el cambio propuesto y reemplazará el valor vigente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button color="primary" disabled={ocupado} aria-busy={ocupado} onClick={aprobar}>
              {ocupado && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
              Sí
            </Button>
            <AlertDialogCancel variant="fill" color="neutral" disabled={ocupado}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rechazando} onOpenChange={(next) => !ocupado && setRechazando(next)}>
        <AlertDialogContent size="sm" className="data-[size=sm]:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia className={MEDIA_ALERTA}>
              <WarningCircleIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>¿Rechazar los cambios propuestos?</AlertDialogTitle>
            <AlertDialogDescription>
              {esNota
                ? "Se descartan las correcciones pendientes de esta planilla y queda la nota vigente."
                : "Se descarta el cambio y queda el valor vigente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* El diseño no pide motivo, pero el backend lo exige al rechazar (rechazar-masivo). */}
          <Field variant="outlined">
            <FieldLabel htmlFor={`motivo-rechazo-bot-${a.solicitudId}`}>Motivo</FieldLabel>
            <Textarea
              id={`motivo-rechazo-bot-${a.solicitudId}`}
              value={motivo}
              maxLength={MOTIVO_MAX}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Por qué rechazas los cambios"
              className={TEXTAREA_OUTLINED}
            />
          </Field>
          <AlertDialogFooter>
            <Button color="primary" disabled={motivo.trim() === "" || ocupado} aria-busy={ocupado} onClick={rechazar}>
              {ocupado && <SpinnerIcon className="animate-spin" data-icon="inline-start" />}
              Sí
            </Button>
            <AlertDialogCancel variant="fill" color="neutral" disabled={ocupado}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
