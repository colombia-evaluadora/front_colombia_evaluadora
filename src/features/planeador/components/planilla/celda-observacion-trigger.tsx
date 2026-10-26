import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useOfflineWritable } from "@/lib/offline/outbox/hooks"
import { QUEUED_MESSAGE } from "@/lib/offline/outbox/engine"
import { EyeIcon, PlusIcon } from "@/components/ui/icons"

import { useNotaEstudianteQuery } from "@/features/planeador/api/query/use-nota-estudiante-query"
import { useObservarEstudianteMutation } from "@/features/planeador/api/mutations/use-observar-estudiante"
import {
  useAgregarObservacionSoporteMutation,
  useQuitarObservacionSoporteMutation,
} from "@/features/planeador/api/mutations/use-observacion-soporte"
import { ObservacionEstudianteSheet } from "@/features/planeador/components/planilla/observacion-estudiante-sheet"
import type { CeldaEvidencia } from "@/features/planeador/api/types/planilla"

interface CeldaObservacionTriggerProps {
  pkTactividadEstudiante: number
  /** Actividad de la celda: la mutación invalida solo sus calificaciones (X2). */
  actividadId: number
  /** `yyyy-MM-dd` — `PlanillaCelda.fechaAsistencia`: el día con asistencia
   *  válida de ESE estudiante. `null` = no hay ninguno y el backend va a
   *  rechazar la observación, así que no se deja abrir. */
  fecha: string | null
  estudianteNombre: string
  /** Subtítulo del panel: la actividad sobre la que se observa. */
  contexto: string
  /** Lo que ya trae la celda — evita esperar el `GET .../nota` para saber si
   *  el estudiante tiene o no observación. */
  observacionActual: string | null
  evidenciasActuales: CeldaEvidencia[]
  /** Enlace de evidencia guardado; `undefined` si la vista no lo trae. */
  enlaceActual?: string | null
  /** Momento guardado (INICIO/PROCESO/CIERRE); `undefined` si la vista no lo trae. */
  momentoActual?: string | null
  /** `true` si la ventana de la actividad todavía no empieza — matiza el
   *  aviso de "sin asistencia" en el panel. */
  actividadSinComenzar?: boolean
  /** Para las vistas que no viven de la query de la Planilla (la de detalle
   *  de una actividad) — la invalidación propia de la mutación no las
   *  alcanza. */
  onGuardado?: () => void
  /** Motivo por el que no se puede observar (No asistido, No presentó). */
  bloqueo?: string | null
  /** Body de observar de una corrección pendiente (`calificacion_propuesta`). */
  propuesta?: unknown
}

interface ObservacionPropuesta {
  observacion?: string | null
  momento?: string | null
  enlace?: string | null
}

/** Solo una corrección de observación trae `observacion` en la propuesta. */
function toObservacionPropuesta(propuesta: unknown): ObservacionPropuesta | null {
  if (!propuesta || typeof propuesta !== "object" || !("observacion" in propuesta)) return null
  return propuesta as ObservacionPropuesta
}

/**
 * Abre la observación de UNA celda (estudiante × actividad formativa) en el
 * mismo panel lateral que usa la vista de aprobación, en vez de un popover
 * anclado a la celda: el texto llega a 1000 caracteres y en el popover se leía
 * en una ventanita de dos líneas.
 */
export function CeldaObservacionTrigger({
  pkTactividadEstudiante,
  actividadId,
  fecha,
  estudianteNombre,
  contexto,
  observacionActual,
  evidenciasActuales,
  enlaceActual,
  momentoActual,
  actividadSinComenzar,
  onGuardado,
  bloqueo,
  propuesta,
}: CeldaObservacionTriggerProps) {
  const pendiente = toObservacionPropuesta(propuesta)
  const [abierto, setAbierto] = useState(false)
  // Observaciones y evidencias se guardan en el servidor (plan offline §7.5).
  // Fase 2: el texto de la observación se encola sin red; las evidencias
  // (archivos) siguen solo en línea (D-F2-12) y fallan visibles en el sheet.
  const soloEnLinea = useOfflineWritable()
  const { notify } = useNotify()

  const { data: notaActual } = useNotaEstudianteQuery(abierto ? pkTactividadEstudiante : undefined)

  const observar = useObservarEstudianteMutation({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.queued) notify(QUEUED_MESSAGE, { variant: "info" })
        // Periodo cerrado: queda la vigente hasta que el coordinador apruebe.
        else if (result.solicitudPendiente)
          notify("Periodo cerrado: la corrección quedó como solicitud al coordinador.", { variant: "info" })
        else notify("Observación guardada.")
        setAbierto(false)
        onGuardado?.()
      },
      // El error se muestra dentro del sheet (`errorGuardar`): un aviso de
      // pantalla quedaría detrás de su overlay.
    },
  })

  // Los errores de evidencias se muestran dentro de la sección Evidencias.
  const agregarEvidencia = useAgregarObservacionSoporteMutation({
    mutationConfig: {
      onSuccess: (pk) => {
        // `null` = quedó en la outbox: aparece al sincronizar.
        if (pk == null) notify(QUEUED_MESSAGE, { variant: "info" })
        onGuardado?.()
      },
    },
  })
  const quitarEvidencia = useQuitarObservacionSoporteMutation({
    mutationConfig: {
      onSuccess: () => onGuardado?.(),
    },
  })
  const evidenciaError = agregarEvidencia.error ?? quitarEvidencia.error

  const tieneObservacion = Boolean(observacionActual?.trim())
  const Icono = tieneObservacion ? EyeIcon : PlusIcon
  const etiqueta = tieneObservacion
    ? `Editar la observación de ${estudianteNombre}`
    : `Observar a ${estudianteNombre}`

  return (
    <>
      <Tooltip>
        {/* El trigger va en un `span`, no en el propio Button: un
            <button disabled> nativo no dispara los eventos de hover que
            necesita el Tooltip para abrirse. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Button
            variant="outline"
            color="neutral"
            size="icon-xs"
            disabled={fecha === null || Boolean(bloqueo) || soloEnLinea.disabled}
            aria-label={etiqueta}
            onClick={() => setAbierto(true)}
          >
            <Icono className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {soloEnLinea.tooltip
            ? soloEnLinea.tooltip
            : bloqueo
            ? bloqueo
            : fecha === null
            ? actividadSinComenzar
              ? "Esta actividad todavía no comienza: no se puede observar todavía."
              : `Sin asistencia registrada para ${estudianteNombre}`
            : etiqueta}
        </TooltipContent>
      </Tooltip>

      <ObservacionEstudianteSheet
        estudiante={
          abierto
            ? {
                id: pkTactividadEstudiante,
                nombreCompleto: estudianteNombre,
                // Pendiente de aprobación: se edita sobre lo propuesto, no lo vigente.
                observacion: pendiente ? (pendiente.observacion ?? "") : (notaActual?.observacion ?? observacionActual),
                // NULL en la propuesta = no se tocaba: queda lo vigente.
                enlace: pendiente?.enlace ?? enlaceActual,
                momento: pendiente?.momento ?? momentoActual,
                fecha,
                pendienteAprobacion: pendiente != null,
              }
            : null
        }
        contexto={contexto}
        evidencias={notaActual?.evidencias.length ? notaActual.evidencias : evidenciasActuales}
        actividadSinComenzar={actividadSinComenzar}
        guardando={observar.isPending}
        errorGuardar={observar.error ? getErrorMessage(observar.error) : null}
        onOpenChange={(open) => {
          if (!open) {
            setAbierto(false)
            observar.reset()
            agregarEvidencia.reset()
            quitarEvidencia.reset()
          }
        }}
        onGuardar={(estudiante, texto, enlace, momento) => {
          if (!fecha) return
          observar.mutate({ pkTactividadEstudiante: estudiante.id, actividadId, observacion: texto.trim(), fecha, enlace, momento })
        }}
        onAgregarEvidencia={(archivo) => {
          if (!fecha) return
          agregarEvidencia.mutate({ pkTactividadEstudiante, archivo, fecha })
        }}
        agregandoEvidencia={agregarEvidencia.isPending}
        errorEvidencia={evidenciaError ? getErrorMessage(evidenciaError) : null}
        onQuitarEvidencia={(evidencia) => {
          if (!fecha) return
          quitarEvidencia.mutate({ pkTactividadSoporte: evidencia.pk, pkTactividadEstudiante, fecha })
        }}
        quitandoEvidenciaPk={
          quitarEvidencia.isPending ? (quitarEvidencia.variables?.pkTactividadSoporte ?? null) : null
        }
      />
    </>
  )
}
