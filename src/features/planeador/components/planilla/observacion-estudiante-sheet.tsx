import { useEffect, useRef, useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckIcon, ImageIcon, InfoIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useNotify } from "@/components/notice/notice-context"

import { ArchivoImage } from "@/features/files/components/archivo-image"
import {
  OBSERVACION_EVIDENCIAS_MAX,
  OBSERVACION_EVIDENCIA_MAX_BYTES,
  OBSERVACION_EVIDENCIA_MAX_MB,
  OBSERVACION_MAX_CARACTERES as MAX_CARACTERES,
} from "@/features/planeador/lib/observacion"
import type { CeldaEvidencia } from "@/features/planeador/api/types/planilla"

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

export interface EstudianteObservable {
  /** `PK_TACTIVIDAD_ESTUDIANTE` — el id que pide `PUT .../observar`. */
  id: number
  nombreCompleto: string
  observacion: string | null
  /** `yyyy-MM-dd` con asistencia válida; `null` si no hay ninguna y el
   *  backend va a rechazar la observación. */
  fecha: string | null
}

interface ObservacionEstudianteSheetProps {
  estudiante: EstudianteObservable | null
  /** Subtítulo del encabezado: la actividad sobre la que se observa. */
  contexto: string
  /** Imágenes ya adjuntas (`TACTIVIDAD_SOPORTE`, V461). */
  evidencias?: CeldaEvidencia[]
  guardando?: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (estudiante: EstudianteObservable, texto: string) => void
  /** `undefined` = deshabilita el botón "Agregar" (el caller no lo soporta). */
  onAgregarEvidencia?: (archivo: File) => void
  agregandoEvidencia?: boolean
  onQuitarEvidencia?: (evidencia: CeldaEvidencia) => void
  /** `pk` de la evidencia que se está quitando en este momento — para
   *  deshabilitar solo ESA miniatura, no todas. */
  quitandoEvidenciaPk?: number | null
  /** `true` si `estudiante.fecha` es `null` porque la actividad todavía no
   *  empieza (su ventana arranca a futuro) — matiza el aviso de "sin
   *  asistencia", que si no suena a que algo falta por registrar cuando en
   *  realidad todavía no hay clase. */
  actividadSinComenzar?: boolean
}

/**
 * Observación de UN estudiante en un panel lateral — mismo patrón que la
 * observación cualitativa de Informes (`ObservacionSheet`), que es de donde
 * viene la forma: avatar con iniciales, textarea grande con contador y un
 * solo botón Guardar.
 *
 * Dos diferencias con el de Informes, por el endpoint que hay detrás:
 * guardar vacío NO borra (`observar` no tiene borrado confirmado), y sin
 * fecha con asistencia válida no se puede guardar (gate del backend).
 */
export function ObservacionEstudianteSheet({
  estudiante,
  contexto,
  evidencias = [],
  guardando,
  onOpenChange,
  onGuardar,
  onAgregarEvidencia,
  agregandoEvidencia,
  onQuitarEvidencia,
  quitandoEvidenciaPk,
  actividadSinComenzar,
}: ObservacionEstudianteSheetProps) {
  const [texto, setTexto] = useState("")
  const [evidenciaAmpliada, setEvidenciaAmpliada] = useState<CeldaEvidencia | null>(null)
  const [evidenciaAEliminar, setEvidenciaAEliminar] = useState<CeldaEvidencia | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const { notify } = useNotify()

  // OJO: la dependencia es el `id`, no el objeto `estudiante` completo. El
  // caller (`CeldaObservacionTrigger`) arma ese objeto de nuevo en cada
  // render mientras el panel está abierto (p. ej. cuando `notaActual`
  // refresca en segundo plano — cualquier guardado en OTRA celda invalida
  // el mismo prefijo de query). Con `[estudiante]` como dependencia, cada
  // una de esas referencias nuevas disparaba el efecto y pisaba lo que el
  // docente estaba escribiendo, todavía sin guardar, con el valor viejo del
  // servidor. Sincronizar solo al abrir (o al cambiar de estudiante) evita
  // perder texto a mitad de escritura.
  useEffect(() => {
    if (estudiante) setTexto(estudiante.observacion ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudiante?.id])

  const sinAsistencia = estudiante?.fecha == null
  const puedeGuardar = Boolean(texto.trim()) && !sinAsistencia && !guardando
  const limiteEvidenciasAlcanzado = evidencias.length >= OBSERVACION_EVIDENCIAS_MAX

  function handleSeleccionArchivo(archivo: File | undefined) {
    if (!archivo) return
    if (archivo.size > OBSERVACION_EVIDENCIA_MAX_BYTES) {
      notify(`La imagen supera el máximo de ${OBSERVACION_EVIDENCIA_MAX_MB} MB.`, { variant: "error" })
      return
    }
    onAgregarEvidencia?.(archivo)
  }

  return (
    <Sheet open={estudiante != null} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Observación del estudiante</SheetTitle>
          {estudiante && (
            <>
              <div className="flex items-center gap-3">
                <Avatar size="lg">
                  <AvatarFallback>{iniciales(estudiante.nombreCompleto)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold">{estudiante.nombreCompleto}</p>
                  {estudiante.fecha && (
                    <p className="text-xs text-muted-foreground">Asistencia: {estudiante.fecha}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{contexto}</p>
            </>
          )}
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8">
          <Field variant="outlined">
            <FieldLabel htmlFor="observacion-estudiante">Observación</FieldLabel>
            <Textarea
              id="observacion-estudiante"
              value={texto}
              maxLength={MAX_CARACTERES}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe la observación de este estudiante para esta actividad…"
              className={cn("min-h-40 resize-y", TEXTAREA_OUTLINED)}
            />
            <span className="self-end text-xs text-muted-foreground">
              {texto.length}/{MAX_CARACTERES}
            </span>
          </Field>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase">Evidencias</p>
            <div className="flex flex-wrap items-start gap-2">
              {evidencias.map((evidencia) => (
                <div key={evidencia.pk} className="group relative">
                  <button
                    type="button"
                    className="block cursor-zoom-in rounded-md"
                    aria-label="Ver evidencia en grande"
                    onClick={() => setEvidenciaAmpliada(evidencia)}
                  >
                    <ArchivoImage
                      archivoId={evidencia.fkTarchivo}
                      alt={evidencia.nombre ?? `Evidencia de ${estudiante?.nombreCompleto ?? ""}`}
                      className="size-20"
                    />
                  </button>
                  {onQuitarEvidencia && (
                    <Button
                      type="button"
                      variant="fill"
                      color="destructive"
                      size="icon-xs"
                      className="absolute -top-1.5 -right-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Quitar esta evidencia"
                      disabled={quitandoEvidenciaPk === evidencia.pk}
                      onClick={() => setEvidenciaAEliminar(evidencia)}
                    >
                      {quitandoEvidenciaPk === evidencia.pk ? (
                        <SpinnerIcon className="animate-spin" />
                      ) : (
                        <XIcon />
                      )}
                    </Button>
                  )}
                </div>
              ))}
              <Tooltip>
                {/* El trigger va en un `span`, no en el propio Button: un
                    <button disabled> nativo no dispara los eventos de hover
                    que necesita el Tooltip para abrirse. */}
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    variant="outline"
                    color="neutral"
                    size="icon"
                    className="size-20 flex-col gap-1 text-xs"
                    disabled={
                      !onAgregarEvidencia || sinAsistencia || agregandoEvidencia || limiteEvidenciasAlcanzado
                    }
                    onClick={() => inputArchivoRef.current?.click()}
                  >
                    {agregandoEvidencia ? (
                      <SpinnerIcon className="size-5 animate-spin" />
                    ) : (
                      <ImageIcon className="size-5" />
                    )}
                    Agregar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {sinAsistencia
                    ? actividadSinComenzar
                      ? "La actividad todavía no comienza: no se puede adjuntar evidencia todavía."
                      : "Sin asistencia registrada todavía no se puede adjuntar evidencia."
                    : limiteEvidenciasAlcanzado
                      ? `Máximo ${OBSERVACION_EVIDENCIAS_MAX} evidencias por observación.`
                      : `Subir una foto (máx. ${OBSERVACION_EVIDENCIA_MAX_MB} MB) como evidencia de esta observación.`}
                </TooltipContent>
              </Tooltip>
              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  e.target.value = ""
                  handleSeleccionArchivo(archivo)
                }}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            {sinAsistencia
              ? actividadSinComenzar
                ? "Esta actividad todavía no comienza: se podrá observar a este estudiante cuando empiece."
                : "Este estudiante no tiene asistencia registrada en la ventana de la actividad. Regístrala desde Asistencia para poder observarlo."
              : "Reemplaza la observación anterior. Guardar con el texto vacío no la borra."}
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button
            type="button"
            color="primary"
            disabled={!puedeGuardar}
            onClick={() => estudiante && onGuardar(estudiante, texto)}
          >
            {guardando ? (
              <SpinnerIcon className="animate-spin" data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>

      <Dialog open={evidenciaAmpliada != null} onOpenChange={(open) => !open && setEvidenciaAmpliada(null)}>
        <DialogContent className="max-w-2xl p-2 sm:max-w-2xl">
          <DialogTitle className="sr-only">
            {evidenciaAmpliada?.nombre ?? "Evidencia ampliada"}
          </DialogTitle>
          {evidenciaAmpliada && (
            <ArchivoImage
              archivoId={evidenciaAmpliada.fkTarchivo}
              alt={evidenciaAmpliada.nombre ?? "Evidencia"}
              className="max-h-[80vh] w-full"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={evidenciaAEliminar != null}
        onOpenChange={(open) => !open && setEvidenciaAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar esta evidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              La imagen se quita de la observación de este estudiante. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              color="destructive"
              onClick={() => {
                if (evidenciaAEliminar) onQuitarEvidencia?.(evidenciaAEliminar)
                setEvidenciaAEliminar(null)
              }}
            >
              <XIcon data-icon="inline-start" />
              Quitar
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
