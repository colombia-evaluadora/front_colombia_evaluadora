import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
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
  /** `true` si la ventana de la actividad todavía no empieza — matiza el
   *  aviso de "sin asistencia" en el panel. */
  actividadSinComenzar?: boolean
  /** Para las vistas que no viven de la query de la Planilla (la de detalle
   *  de una actividad) — la invalidación propia de la mutación no las
   *  alcanza. */
  onGuardado?: () => void
}

/**
 * Abre la observación de UNA celda (estudiante × actividad formativa) en el
 * mismo panel lateral que usa la vista de aprobación, en vez de un popover
 * anclado a la celda: el texto llega a 500 caracteres y en el popover se leía
 * en una ventanita de dos líneas.
 */
export function CeldaObservacionTrigger({
  pkTactividadEstudiante,
  fecha,
  estudianteNombre,
  contexto,
  observacionActual,
  evidenciasActuales,
  actividadSinComenzar,
  onGuardado,
}: CeldaObservacionTriggerProps) {
  const [abierto, setAbierto] = useState(false)
  const { notify } = useNotify()

  const { data: notaActual } = useNotaEstudianteQuery(abierto ? pkTactividadEstudiante : undefined)

  const observar = useObservarEstudianteMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Observación guardada.")
        setAbierto(false)
        onGuardado?.()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const agregarEvidencia = useAgregarObservacionSoporteMutation({
    mutationConfig: {
      onSuccess: () => onGuardado?.(),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })
  const quitarEvidencia = useQuitarObservacionSoporteMutation({
    mutationConfig: {
      onSuccess: () => onGuardado?.(),
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

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
            disabled={fecha === null}
            aria-label={etiqueta}
            onClick={() => setAbierto(true)}
          >
            <Icono className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {fecha === null
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
                observacion: notaActual?.observacion ?? observacionActual,
                fecha,
              }
            : null
        }
        contexto={contexto}
        evidencias={notaActual?.evidencias.length ? notaActual.evidencias : evidenciasActuales}
        actividadSinComenzar={actividadSinComenzar}
        guardando={observar.isPending}
        onOpenChange={(open) => {
          if (!open) setAbierto(false)
        }}
        onGuardar={(estudiante, texto) => {
          if (!fecha) return
          observar.mutate({ pkTactividadEstudiante: estudiante.id, observacion: texto.trim(), fecha })
        }}
        onAgregarEvidencia={(archivo) => {
          if (!fecha) return
          agregarEvidencia.mutate({ pkTactividadEstudiante, archivo, fecha })
        }}
        agregandoEvidencia={agregarEvidencia.isPending}
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
