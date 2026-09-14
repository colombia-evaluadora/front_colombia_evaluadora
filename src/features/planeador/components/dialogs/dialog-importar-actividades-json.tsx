import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import {
  CheckCircleIcon,
  FileUploadOutlinedIcon,
  SpinnerIcon,
  WarningIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileUpload, FileUploadDropzone } from "@/components/ui/file-upload"

import { useImportarActividadesJson } from "@/features/planeador/api/mutations/importar-actividades-json"
import type {
  ActividadExportada,
  InformeImportacion,
} from "@/features/planeador/api/types/actividad-intercambio"

interface DialogImportarActividadesJsonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Importar actividades desde un archivo `.json` — mismo formato que produce
 * `useExportarActividadesJson` (colección Postman
 * `planeador-actividades-exportar-importar`). Controlado desde afuera
 * (`open`/`onOpenChange`, sin `DialogTrigger` propio) porque quien lo abre
 * es un ítem del menú "…" del toolbar: un `Dialog` anidado dentro de un
 * `DropdownMenuItem` se desmonta apenas el menú cierra, así que el trigger
 * vive en la página y este componente solo controla su propio contenido.
 *
 * Dos pasos, no uno: elegir el archivo dispara automáticamente el paso 1
 * (`SOLO_VALIDAR: true`, no escribe nada) para mostrar el informe fila por
 * fila; después "Importar" aplica.
 *
 * "Importar" se habilita si hay al menos una fila válida, aunque otras
 * tengan problemas. Antes exigía `conError === 0` porque el paso 2 era todo
 * o nada: una sola fila mala hacía que no se escribiera ninguna, así que
 * dejar aplicar habría sido engañoso. Desde V340 el backend importa fila por
 * fila —omite las que ya rechazó la validación, aísla las que fallan al
 * crearse— así que ese gate dejaba fuera el caso que más se da: reimportar
 * un archivo del que solo alguna actividad ya existía.
 */
export function DialogImportarActividadesJson({
  open,
  onOpenChange,
}: DialogImportarActividadesJsonProps) {
  const [actividades, setActividades] = useState<ActividadExportada[] | null>(null)
  const [informe, setInforme] = useState<InformeImportacion | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const { notify } = useNotify()

  const validar = useImportarActividadesJson({
    mutationConfig: {
      onSuccess: (data) => setInforme(data),
      onError: () => setParseError("No se pudo validar el archivo contra el servidor."),
    },
  })
  const aplicar = useImportarActividadesJson({
    mutationConfig: {
      onSuccess: (data) => {
        setInforme(data)
        // Siempre se avisa, no solo cuando entró algo: con la importación
        // fila por fila el resultado normal es parcial, y el mensaje del
        // servidor ya dice cuántas entraron y cuántas no.
        notify(data.mensaje, data.aplicadas > 0 ? undefined : { variant: "error" })
      },
      onError: () => notify("No se pudo importar el archivo.", { variant: "error" }),
    },
  })

  function reset() {
    setActividades(null)
    setInforme(null)
    setParseError(null)
  }

  async function handleFileAccept(file: File) {
    setParseError(null)
    setInforme(null)
    setActividades(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setParseError("El archivo no es un JSON válido.")
      return
    }

    // El exportador siempre entrega un array (una sola actividad es un
    // array de uno); se tolera también un objeto suelto por si el archivo
    // viene armado a mano.
    const list = Array.isArray(parsed) ? parsed : [parsed]
    if (list.length === 0) {
      setParseError("El archivo no trae ninguna actividad.")
      return
    }

    const actividadesArchivo = list as ActividadExportada[]
    setActividades(actividadesArchivo)
    validar.mutate({ actividades: actividadesArchivo, soloValidar: true })
  }

  function handleAplicar() {
    if (!actividades) return
    aplicar.mutate({ actividades, soloValidar: false })
  }

  // Cualquier respuesta del paso 2 cierra el flujo, se haya importado todo,
  // parte o nada: el informe ya dice qué pasó con cada fila y reintentar a
  // ciegas el mismo archivo no arregla nada. Para volver a probar está
  // "Elegir otro archivo".
  const yaAplicado = informe?.modo === "aplicacion"
  // Basta con que quede algo importable: las demás se omiten, no bloquean.
  const puedeAplicar = informe != null && informe.validas > 0 && !yaAplicado

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar actividades</DialogTitle>
          <DialogDescription>
            Subí un archivo <code>.json</code> exportado desde el Planeador (o con el mismo formato)
            para revisarlo antes de crear las actividades.
          </DialogDescription>
        </DialogHeader>

        {!informe && !validar.isPending && (
          <FileUpload accept="application/json,.json" maxFiles={1} onFileAccept={handleFileAccept}>
            <FileUploadDropzone className="gap-2 rounded-md">
              <FileUploadOutlinedIcon className="text-muted-foreground size-6" />
              <p className="text-sm">
                Arrastrá el archivo <code>.json</code> acá, o hacé click para elegirlo.
              </p>
            </FileUploadDropzone>
          </FileUpload>
        )}

        {parseError && <p className="text-red text-sm">{parseError}</p>}

        {validar.isPending && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
            <SpinnerIcon className="animate-spin" /> Validando archivo…
          </div>
        )}

        {informe && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{informe.mensaje}</p>
            <ul className="scrollbar-slim flex max-h-64 flex-col overflow-y-auto text-sm">
              {informe.filas.map((fila) => (
                <li
                  key={fila.indice}
                  className="flex items-start gap-2 border-b py-1.5 last:border-0"
                >
                  {/* `omitida` se distingue de `fallida`: la primera ni se
                      intentó (la validación ya la había rechazado), la
                      segunda se intentó y el servidor la rechazó. Para el
                      usuario son cosas distintas y el motivo va debajo. */}
                  {fila.estado === "ok" || fila.estado === "importada" ? (
                    <CheckCircleIcon className="text-green mt-0.5 size-4 shrink-0" />
                  ) : fila.estado === "omitida" ? (
                    <WarningIcon className="text-yellow mt-0.5 size-4 shrink-0" />
                  ) : (
                    <XCircleIcon className="text-red mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate">{fila.nombre}</p>
                    {fila.errores?.map((error, index) => (
                      <p key={index} className="text-muted-foreground text-xs">
                        {error}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="link"
              color="neutral"
              size="sm"
              type="button"
              className="self-start"
              onClick={reset}
            >
              Elegir otro archivo
            </Button>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            {yaAplicado ? "Cerrar" : "Cancelar"}
          </DialogClose>
          {!yaAplicado && (
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={!puedeAplicar || aplicar.isPending}
              aria-busy={aplicar.isPending}
              onClick={handleAplicar}
            >
              {aplicar.isPending && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Importar{informe ? ` (${informe.validas})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
