import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { EnvelopeIcon, InfoIcon, MagnifyingGlassIcon, WarningIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { toDigitsOnly } from "@/lib/text-input"

import { SEGUNDOS_REENVIO } from "@/features/publico/inscribir/datos-demo"
import { enmascararCorreo } from "@/features/publico/inscribir/utils"
import {
  EJEMPLOS_DEMO,
  buscarInscripcionDemo,
  correoDemo,
  type InscripcionConsulta,
} from "@/features/publico/consultar/datos-demo"

/**
 * U.3 paso 1: número de inscripción + documento del aspirante + código que
 * llega al correo del acudiente. No revela si la inscripción existe (Regla 31):
 * el código "se envía" si los datos coinciden y el error es siempre el mismo.
 */
export function FormularioConsulta({ onEncontrada }: { onEncontrada: (i: InscripcionConsulta) => void }) {
  const [numero, setNumero] = useState("")
  const [documento, setDocumento] = useState("")
  const [codigo, setCodigo] = useState("")
  const [robot, setRobot] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [espera, setEspera] = useState(0)
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (espera <= 0) return
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [espera])

  const correo = correoDemo(numero, documento)
  const puedeEnviar = Boolean(numero && documento) && espera === 0
  const reloj = `${Math.floor(espera / 60)}:${String(espera % 60).padStart(2, "0")}`

  function enviarCodigo() {
    setEnviado(true)
    setEspera(SEGUNDOS_REENVIO)
  }

  function consultar(e: React.FormEvent) {
    e.preventDefault()
    setIntentado(true)
    setError(null)
    if (!numero || !documento || codigo.length !== 6 || !robot) return
    // Vista previa: cualquier código de 6 dígitos sirve; lo que se valida es la pareja número + documento.
    const encontrada = buscarInscripcionDemo(numero, documento)
    if (!encontrada) {
      setError("Los datos no coinciden o el código no es correcto. Revíselos e intente de nuevo.")
      return
    }
    onEncontrada(encontrada)
  }

  const invalido = (v: unknown) => intentado && !v

  return (
    <form noValidate onSubmit={consultar} className="flex flex-col gap-5">
      <Alert variant="info">
        <InfoIcon />
        <AlertDescription>
          Vista previa con datos de ejemplo (cualquier código de 6 dígitos):{" "}
          {EJEMPLOS_DEMO.map((d) => `${d.numero} / ${d.documento}`).join(" · ")}.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <WarningIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Field variant="outlined" data-invalid={invalido(numero) || undefined}>
        <FieldLabel htmlFor="consulta-numero">
          Número de inscripción <span data-required-mark="">*</span>
        </FieldLabel>
        <Input
          id="consulta-numero"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Agregar"
          value={numero}
          aria-invalid={invalido(numero)}
          onChange={(e) => setNumero(toDigitsOnly(e.target.value, 10))}
        />
      </Field>

      <Field variant="outlined" data-invalid={invalido(documento) || undefined}>
        <FieldLabel htmlFor="consulta-documento">
          Documento del aspirante <span data-required-mark="">*</span>
        </FieldLabel>
        <Input
          id="consulta-documento"
          autoComplete="off"
          placeholder="Agregar"
          value={documento}
          aria-invalid={invalido(documento)}
          onChange={(e) => setDocumento(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <Field variant="outlined" className="flex-1" data-invalid={(intentado && codigo.length !== 6) || undefined}>
            <FieldLabel htmlFor="consulta-codigo">
              Código de verificación <span data-required-mark="">*</span>
            </FieldLabel>
            <Input
              id="consulta-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Digite el código"
              value={codigo}
              aria-invalid={intentado && codigo.length !== 6}
              onChange={(e) => setCodigo(toDigitsOnly(e.target.value, 6))}
            />
          </Field>
          <Button type="button" variant="outline" color="neutral" className="mt-2" disabled={!puedeEnviar} onClick={enviarCodigo}>
            <EnvelopeIcon data-icon="inline-start" />
            {espera > 0 ? `Reenviar (${reloj})` : enviado ? "Reenviar código" : "Enviar código"}
          </Button>
        </div>
        <FieldDescription className={intentado && codigo.length !== 6 ? "text-red" : undefined}>
          {intentado && codigo.length !== 6
            ? "Digite los 6 dígitos del código."
            : enviado && correo
              ? `Lo enviamos a ${enmascararCorreo(correo)}. Vence en 15 minutos.`
              : "Si los datos coinciden, enviaremos el código al correo registrado."}
        </FieldDescription>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Lugar del captcha del sitio público (pendiente de conectar). */}
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={robot} onCheckedChange={(c) => setRobot(Boolean(c))} aria-invalid={invalido(robot)} />
          No soy un robot
        </label>
        {invalido(robot) && <p className="text-red text-xs">Confirme que no es un robot.</p>}
      </div>

      <Button type="submit" className="w-full">
        <MagnifyingGlassIcon data-icon="inline-start" />
        Consultar
      </Button>

    </form>
  )
}
