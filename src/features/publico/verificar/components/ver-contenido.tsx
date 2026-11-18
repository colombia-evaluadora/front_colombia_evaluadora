import { useState } from "react"
import { addHours, format } from "date-fns"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { EyeIcon, XCircleIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { toDigitsOnly } from "@/lib/text-input"

import { HORAS_BLOQUEO_CONTENIDO, MAX_INTENTOS_CONTENIDO } from "@/features/publico/verificar/datos-demo"

interface VerContenidoProps {
  /** Documento completo del estudiante (vista previa: se compara aquí; con el servicio, en el backend). */
  documentoCorrecto: string
  onAutorizado: () => void
}

/**
 * Segundo factor para ver el contenido: el número de documento COMPLETO del
 * estudiante. 5 intentos por código; al agotarlos se bloquea 24 horas.
 */
export function VerContenido({ documentoCorrecto, onAutorizado }: VerContenidoProps) {
  const [numero, setNumero] = useState("")
  const [intentos, setIntentos] = useState(MAX_INTENTOS_CONTENIDO)
  const [error, setError] = useState<string | null>(null)
  const [bloqueadoHasta, setBloqueadoHasta] = useState<Date | null>(null)

  function ver(e: React.FormEvent) {
    e.preventDefault()
    if (bloqueadoHasta) return
    if (!numero) {
      setError("Escriba el número de documento.")
      return
    }
    if (numero === documentoCorrecto) {
      onAutorizado()
      return
    }
    const quedan = intentos - 1
    setIntentos(quedan)
    setNumero("")
    if (quedan <= 0) {
      setError(null)
      setBloqueadoHasta(addHours(new Date(), HORAS_BLOQUEO_CONTENIDO))
      return
    }
    setError(`El número no corresponde. ${quedan === 1 ? "Queda 1 intento" : `Quedan ${quedan} intentos`}.`)
  }

  return (
    <form noValidate onSubmit={ver} className="flex flex-col gap-5">
      <h2 className="text-base font-semibold">Ver el contenido</h2>

      {bloqueadoHasta && (
        <Alert variant="destructive">
          <XCircleIcon />
          <AlertTitle>Ver el contenido está bloqueado para este código</AlertTitle>
          <AlertDescription>
            Se superaron los {MAX_INTENTOS_CONTENIDO} intentos con un número de documento errado. Vuelva a intentarlo después
            del {format(bloqueadoHasta, "dd/MM/yyyy")} a las {format(bloqueadoHasta, "HH:mm")}.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Field variant="outlined" className="flex-1" data-invalid={Boolean(error) || undefined}>
          <FieldLabel htmlFor="documento-completo">
            Número de documento completo del estudiante <span data-required-mark="">*</span>
          </FieldLabel>
          <Input
            id="documento-completo"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Agregar"
            value={numero}
            disabled={Boolean(bloqueadoHasta)}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setNumero(toDigitsOnly(e.target.value, 15))
              setError(null)
            }}
          />
          {error ? (
            <FieldDescription className="text-red">{error}</FieldDescription>
          ) : (
            !bloqueadoHasta && <FieldDescription>Sin puntos ni espacios. Tiene {intentos} intentos.</FieldDescription>
          )}
        </Field>
        <Button type="submit" className="sm:mt-2" disabled={Boolean(bloqueadoHasta)}>
          <EyeIcon data-icon="inline-start" />
          Ver contenido
        </Button>
      </div>
    </form>
  )
}
