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
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BrushIcon,
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { ArchivoImage } from "@/features/files/components/archivo-image"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { EvidenciaFavoritoButton } from "@/features/planeador/components/planilla/evidencia-favorito-button"
import {
  OBSERVACION_EVIDENCIAS_MAX,
  OBSERVACION_EVIDENCIA_ACCEPT,
  OBSERVACION_EVIDENCIA_MAX_MB,
  OBSERVACION_EVIDENCIA_TIPOS_LABEL,
  OBSERVACION_MAX_CARACTERES as MAX_CARACTERES,
  esEvidenciaImagen,
  extensionEvidencia,
  validarEvidencia,
} from "@/features/planeador/lib/observacion"
import type { CeldaEvidencia } from "@/features/planeador/api/types/planilla"

/** Evidencia que no es imagen (PDF, DOC…): tarjeta con ícono que la abre en otra pestaña. */
function EvidenciaDocumento({ evidencia }: { evidencia: CeldaEvidencia }) {
  const { data: url, isPending } = useArchivoViewUrl(evidencia.fkTarchivo)
  const nombre = evidencia.nombre ?? "Documento"

  return (
    <button
      type="button"
      title={nombre}
      aria-label={`Abrir ${nombre}`}
      disabled={!url || isPending}
      onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
      className="flex size-20 flex-col items-center justify-center gap-1 rounded-md border bg-muted/40 px-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-60"
    >
      <FileTextIcon className="size-6" />
      <span className="font-semibold">{extensionEvidencia(evidencia.nombre)}</span>
      <span className="w-full truncate text-[10px]">{nombre}</span>
    </button>
  )
}

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

export interface EstudianteObservable {
  id: number
  nombreCompleto: string
  observacion: string | null
  fecha: string | null
}

interface ObservacionEstudianteSheetProps {
  estudiante: EstudianteObservable | null
  contexto: string
  evidencias?: CeldaEvidencia[]
  guardando?: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (estudiante: EstudianteObservable, texto: string) => void
  onAgregarEvidencia?: (archivo: File) => void
  agregandoEvidencia?: boolean
  onQuitarEvidencia?: (evidencia: CeldaEvidencia) => void
  quitandoEvidenciaPk?: number | null
  /** Error del backend al agregar/quitar evidencia: se muestra en la sección. */
  errorEvidencia?: string | null
  /** Error del backend al guardar: dentro del sheet, no detrás de su overlay. */
  errorGuardar?: string | null
  actividadSinComenzar?: boolean
}

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
  errorEvidencia,
  errorGuardar,
  actividadSinComenzar,
}: ObservacionEstudianteSheetProps) {
  const [texto, setTexto] = useState("")
  // "Momento": sin endpoint todavía, queda como borrador local sin persistir.
  const [momento, setMomento] = useState("")
  const [evidenciaAmpliada, setEvidenciaAmpliada] = useState<CeldaEvidencia | null>(null)
  const [evidenciaAEliminar, setEvidenciaAEliminar] = useState<CeldaEvidencia | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const textoGuardadoRef = useRef("")

  useEffect(() => {
    if (estudiante) {
      textoGuardadoRef.current = estudiante.observacion ?? ""
      setTexto(textoGuardadoRef.current)
      setMomento("")
      setErrorLocal(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudiante?.id])

  const sinAsistencia = estudiante?.fecha == null
  const puedeGuardar = (Boolean(texto.trim()) || evidencias.length > 0) && !sinAsistencia && !guardando
  const limiteEvidenciasAlcanzado = evidencias.length >= OBSERVACION_EVIDENCIAS_MAX

  function handleOpenChange(open: boolean) {
    if (!open && (texto !== textoGuardadoRef.current || momento !== "")) {
      setConfirmarSalida(true)
      return
    }
    onOpenChange(open)
  }

  function handleSeleccionArchivo(archivo: File | undefined) {
    if (!archivo) return
    // El error se muestra dentro de la sección Evidencias, no arriba.
    const error = validarEvidencia(archivo, evidencias.length)
    setErrorLocal(error)
    if (error) return
    onAgregarEvidencia?.(archivo)
  }

  const mensajeErrorEvidencia = errorLocal ?? errorEvidencia ?? null

  return (
    <Sheet open={estudiante != null} onOpenChange={handleOpenChange}>
      <SheetContent className="gap-0 p-0">
        <SheetHeader className="pb-4">
          <SheetTitle>Observación individual</SheetTitle>
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
          <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            {sinAsistencia
              ? actividadSinComenzar
                ? "Esta actividad todavía no comienza: se podrá observar a este estudiante cuando empiece."
                : "Este estudiante no tiene asistencia registrada en la ventana de la actividad. Regístrala desde Asistencia para poder observarlo."
              : "La observacion que se añada se utilizara para construir el informe del periodo en el estudiante."}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger render={<span className="inline-flex" />}>
                  <Button
                    type="button"
                    variant="outline"
                    color="neutral"
                    size="icon-xs"
                    disabled={!texto}
                    aria-label="Borrar toda la observación"
                    onClick={() => setTexto("")}
                  >
                    <BrushIcon className="size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Borrar toda la observación</TooltipContent>
              </Tooltip>
            </div>
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

            <Field variant="outlined" className="mt-4">
              <FieldLabel htmlFor="momento-estudiante">
                Momento{" "}
                <span className="text-muted-foreground font-normal">(borrador — aún no se guarda)</span>
              </FieldLabel>
              <Input
                id="momento-estudiante"
                value={momento}
                maxLength={100}
                onChange={(e) => setMomento(e.target.value)}
                placeholder="Ej. Inicio, Desarrollo, Cierre…"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase">Evidencias</p>
            <div className="flex flex-wrap items-start gap-2">
              {evidencias.map((evidencia) => (
                <div key={evidencia.pk} className="group relative">
                  {esEvidenciaImagen(evidencia.nombre) ? (
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
                  ) : (
                    <EvidenciaDocumento evidencia={evidencia} />
                  )}
                  {estudiante && (
                    <EvidenciaFavoritoButton
                      pkTactividadEstudiante={estudiante.id}
                      pkTactividadSoporte={evidencia.pk}
                    />
                  )}
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
                      ? `Máximo ${OBSERVACION_EVIDENCIAS_MAX} evidencias por estudiante.`
                      : `Subir un archivo ${OBSERVACION_EVIDENCIA_TIPOS_LABEL} (máx. ${OBSERVACION_EVIDENCIA_MAX_MB} MB).`}
                </TooltipContent>
              </Tooltip>
              <input
                ref={inputArchivoRef}
                type="file"
                accept={OBSERVACION_EVIDENCIA_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0]
                  e.target.value = ""
                  handleSeleccionArchivo(archivo)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {OBSERVACION_EVIDENCIA_TIPOS_LABEL} · máx. {OBSERVACION_EVIDENCIA_MAX_MB} MB por archivo · hasta{" "}
              {OBSERVACION_EVIDENCIAS_MAX} archivos
            </p>
            {mensajeErrorEvidencia && (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-red">
                <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
                {mensajeErrorEvidencia}
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2">
          {errorGuardar && (
            <p role="alert" className="mr-auto flex min-w-0 flex-1 items-start gap-1.5 text-xs text-red">
              <WarningCircleIcon className="mt-0.5 size-3.5 shrink-0" />
              {errorGuardar}
            </p>
          )}
          <Button
            type="button"
            color="primary"
            disabled={!puedeGuardar}
            onClick={() => {
              if (!estudiante) return
              textoGuardadoRef.current = texto
              onGuardar(estudiante, texto)
            }}
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
              La evidencia se quita de la observación de este estudiante. No se puede deshacer.
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

      <AlertDialog open={confirmarSalida} onOpenChange={(open) => !open && setConfirmarSalida(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar los cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              La observación que escribiste todavía no se ha guardado. Si sales ahora, se pierde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              color="destructive"
              onClick={() => {
                setConfirmarSalida(false)
                onOpenChange(false)
              }}
            >
              Salir sin guardar
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral">
              Seguir editando
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
