import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { cn } from "@/lib/utils"
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
import { BrainIcon, BrushIcon, CheckIcon, InfoIcon, SpinnerIcon, StarFillIcon } from "@/components/ui/icons"
import { ArchivoImage } from "@/features/files/components/archivo-image"

import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { useGenerarObservacionMutation } from "@/features/academic-management/reports/api/mutations/use-observacion"
import { useEvidenciasInformeQuery } from "@/features/academic-management/reports/api/query/use-evidencias-informe-query"
import type {
  EvidenciaInforme,
  FilaInforme,
} from "@/features/academic-management/reports/api/types"

const MAX_CARACTERES = 5000

function iniciales(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? "") + (partes[1]?.[0] ?? "")).toUpperCase()
}

/** El borrador que devolvió la IA, para reenviarlo tal cual al guardar. */
interface Borrador {
  texto: string
  observacionesOrigen: number
}

interface ObservacionSheetProps {
  fila: FilaInforme | null
  etiqueta: string
  guardando?: boolean
  onOpenChange: (open: boolean) => void
  onGuardar: (fila: FilaInforme, texto: string, borrador: Borrador | null) => void
  /** Sin permiso, rol de solo lectura o período cerrado: la hoja solo muestra. */
  soloLecturaMotivo?: string | null
}

export function ObservacionSheet({
  fila,
  etiqueta,
  guardando,
  onOpenChange,
  onGuardar,
  soloLecturaMotivo,
}: ObservacionSheetProps) {
  const soloLectura = Boolean(soloLecturaMotivo)
  const { notify } = useNotify()
  const [texto, setTexto] = React.useState("")
  const [borrador, setBorrador] = React.useState<Borrador | null>(null)
  const [evidenciaAmpliada, setEvidenciaAmpliada] = React.useState<EvidenciaInforme | null>(null)
  // 409 al generar: el docente ya editó el texto; confirmar reintenta con `sobrescribir`.
  const [confirmarSobrescribir, setConfirmarSobrescribir] = React.useState(false)
  const generar = useGenerarObservacionMutation()
  // Guardar se encola offline; generar con IA es solo en línea.
  const soloEnLinea = useOnlineOnly("Generar con IA necesita conexión. Puedes escribir la observación a mano.")

  // El Final resume los períodos consolidados; `periodoId: null` elige ese camino.
  const esFinal = fila?.modoPeriodo === "final"
  const periodoIdOnull = esFinal ? null : (fila?.periodoId ?? null)
  // Lo de la IA queda en BORRADOR hasta que se guarde.
  const esBorradorIa = fila?.observacionEstado === "BORRADOR"

  // En el Final, las de todo el año; sin evidencias no se pide nada.
  const evidencias = useEvidenciasInformeQuery(
    fila ? { matriculaId: fila.matriculaId, periodoId: esFinal ? null : fila.periodoId } : null,
    (fila?.evidencias ?? 0) > 0,
  )

  React.useEffect(() => {
    if (!fila) return
    setTexto(fila.observacion ?? "")
    setBorrador(null)
    setEvidenciaAmpliada(null)
  }, [fila])

  async function handleGenerar(sobrescribir = false) {
    if (!fila) return
    try {
      const generada = await generar.mutateAsync({
        matriculaId: fila.matriculaId,
        periodoId: periodoIdOnull,
        sobrescribir,
      })
      if (generada.texto.trim() === "") {
        notify(
          esFinal
            ? "Todavía no hay ningún período con su observación consolidada."
            : "El docente no dejó observaciones que resumir en este período.",
          { variant: "info" },
        )
        return
      }
      setTexto(generada.texto)
      setBorrador({ texto: generada.texto, observacionesOrigen: generada.observacionesOrigen })
    } catch (error) {
      if (isConflictError(error)) {
        setConfirmarSobrescribir(true)
        return
      }
      notify(getErrorMessage(error), { variant: "error" })
    }
  }

  function handleConfirmarSobrescribir() {
    setConfirmarSobrescribir(false)
    void handleGenerar(true)
  }

  return (
    <>
      <Sheet open={fila != null} onOpenChange={onOpenChange}>
        <SheetContent className="gap-0 p-0">
          <SheetHeader className="pb-4">
            <SheetTitle>{etiqueta} individual</SheetTitle>
            {fila && (
              <>
                <div className="flex items-center gap-3">
                  <Avatar size="lg">
                    <AvatarFallback>{iniciales(fila.nombreCompleto)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{fila.nombreCompleto}</p>
                    {fila.documento && (
                      <p className="text-xs text-muted-foreground">{fila.documento}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{fila.periodoNombre}</p>
              </>
            )}
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8">
            <div className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
              {soloLectura
                ? soloLecturaMotivo
                : borrador || esBorradorIa
                  ? "Borrador (IA) – pendiente de revisión. No sale en el boletín hasta que lo revises y lo guardes; si lo editas, se guarda como modificado."
                  : esFinal
                    ? "El borrador del año se arma con las observaciones ya consolidadas de cada período. Guardar con el texto vacío lo elimina."
                    : "Guardar con el texto vacío elimina la observación de este período."}
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
                      disabled={!texto || soloLectura}
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
                <FieldLabel htmlFor="observacion-individual">{etiqueta}</FieldLabel>
                <Textarea
                  id="observacion-individual"
                  value={texto}
                  maxLength={MAX_CARACTERES}
                  readOnly={soloLectura}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={
                    esFinal
                      ? "Genera el comentario del año y revísalo antes de guardarlo…"
                      : "Escribe la observación de este estudiante para este período…"
                  }
                  className={cn(TEXTAREA_OUTLINED, "min-h-40 resize-y")}
                />
                <span className="self-end text-xs text-muted-foreground">
                  {texto.length}/{MAX_CARACTERES}
                </span>
              </Field>
            </div>

            {(fila?.evidencias ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold uppercase">
                  Evidencias{esFinal ? " del año" : ""}
                </p>
                {evidencias.isPending ? (
                  <p className="text-xs text-muted-foreground">Cargando evidencias…</p>
                ) : (
                  <div className="flex flex-wrap items-start gap-2">
                    {(evidencias.data ?? []).map((evidencia) => (
                      <div key={evidencia.id} className="relative">
                        <button
                          type="button"
                          className="block cursor-zoom-in rounded-md"
                          aria-label="Ver evidencia en grande"
                          onClick={() => setEvidenciaAmpliada(evidencia)}
                        >
                          <ArchivoImage
                            archivoId={evidencia.archivoId}
                            alt={
                              evidencia.nombre ??
                              `Evidencia de ${evidencia.actividadTitulo ?? fila?.nombreCompleto ?? ""}`
                            }
                            className="size-20"
                          />
                        </button>
                        {evidencia.esFavorito && (
                          <span
                            className="absolute -top-1.5 -left-1.5 inline-flex rounded-full bg-background p-0.5 shadow-sm"
                            title="Evidencia favorita"
                            aria-label="Evidencia favorita"
                          >
                            <StarFillIcon className="size-4 text-amber-400" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!soloLectura && (
            <SheetFooter className="flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                color="neutral"
                disabled={guardando || generar.isPending || soloEnLinea.disabled}
                title={soloEnLinea.tooltip ?? undefined}
                onClick={() => handleGenerar()}
              >
                <BrainIcon data-icon="inline-start" />
                {generar.isPending ? "Generando…" : borrador ? "Regenerar" : "Generar con IA"}
              </Button>
              <Button
                type="button"
                color="primary"
                disabled={guardando || generar.isPending}
                onClick={() => fila && onGuardar(fila, texto, borrador)}
              >
                {guardando ? (
                  <SpinnerIcon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                {(borrador || esBorradorIa) && texto.trim() !== ""
                  ? "Aprobar y guardar"
                  : "Guardar"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Dialog
        open={evidenciaAmpliada != null}
        onOpenChange={(open) => !open && setEvidenciaAmpliada(null)}
      >
        <DialogContent className="max-w-2xl p-2 sm:max-w-2xl">
          <DialogTitle className="sr-only">
            {evidenciaAmpliada?.nombre ?? "Evidencia ampliada"}
          </DialogTitle>
          {evidenciaAmpliada && (
            <ArchivoImage
              archivoId={evidenciaAmpliada.archivoId}
              alt={evidenciaAmpliada.nombre ?? "Evidencia"}
              className="max-h-[80vh] w-full"
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmarSobrescribir} onOpenChange={setConfirmarSobrescribir}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Sobrescribir la observación del docente?</AlertDialogTitle>
            <AlertDialogDescription>
              El texto guardado fue modificado a mano después de la última generación. Volver a
              generar con IA reemplaza lo que el docente escribió.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleConfirmarSobrescribir}>
              Sobrescribir
            </AlertDialogAction>
            <AlertDialogCancel variant="fill" color="neutral">
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
