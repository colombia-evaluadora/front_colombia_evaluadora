import { useId, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CheckCircleFillIcon, FileTextIcon, PaperclipIcon, UploadSimpleIcon, XCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

const MAX_MB = 10

/**
 * "¿Tiene el PDF?": compara el archivo con el original emitido por la
 * plataforma (con el servicio, por su huella; ningún dato sale del PDF).
 *
 * Vista previa: coincide si el nombre del archivo trae el código del
 * documento (p. ej. `K7QM-4XPA-9TRB.pdf`); cualquier otro archivo no coincide.
 */
export function ComprobarArchivo({ codigo }: { codigo: string }) {
  const inputId = useId()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<"coincide" | "no-coincide" | null>(null)
  const [arrastrando, setArrastrando] = useState(false)

  function elegir(f: File | undefined) {
    setResultado(null)
    if (!f) return
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("El archivo debe ser un PDF.")
      setArchivo(null)
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_MB} MB.`)
      setArchivo(null)
      return
    }
    setError(null)
    setArchivo(f)
  }

  function comprobar() {
    if (!archivo) {
      setError("Seleccione el PDF que quiere comprobar.")
      return
    }
    setResultado(archivo.name.toUpperCase().includes(codigo.toUpperCase()) ? "coincide" : "no-coincide")
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Comprobar el archivo</h2>

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => {
          e.preventDefault()
          setArrastrando(false)
          elegir(e.dataTransfer.files[0])
        }}
        className={cn(
          "border-input hover:bg-muted/40 flex cursor-pointer flex-col items-center gap-2 rounded-sm border border-dashed px-4 py-8 text-center transition-colors",
          arrastrando && "border-primary bg-primary-22",
          error && "border-red",
        )}
      >
        <UploadSimpleIcon className="text-primary size-7" aria-hidden />
        <span className="text-sm">Arrastre el PDF aquí o haga clic para seleccionarlo</span>
        <span className="text-muted-foreground text-xs">PDF, máx. {MAX_MB} MB</span>
        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            elegir(e.target.files?.[0])
            e.target.value = ""
          }}
        />
      </label>
      {error && <p className="text-red -mt-2 text-xs">{error}</p>}

      {archivo && (
        <p className="flex items-center gap-2 text-sm">
          <PaperclipIcon className="text-muted-foreground size-4" aria-hidden />
          {archivo.name}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={comprobar}>
          <FileTextIcon data-icon="inline-start" />
          Comprobar
        </Button>
      </div>

      {resultado === "no-coincide" && (
        <Alert variant="destructive" role="alert">
          <XCircleIcon />
          <AlertTitle>No coincide</AlertTitle>
          <AlertDescription>
            El archivo no es idéntico al original. Si lo volvió a guardar o lo escaneó, pida el PDF original.
          </AlertDescription>
        </Alert>
      )}
      {resultado === "coincide" && (
        <Alert role="status" className="border-green-stroke bg-green-22 *:[svg]:text-green">
          <CheckCircleFillIcon />
          <AlertTitle>Coincide</AlertTitle>
          <AlertDescription>Es el archivo original, sin cambios.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
