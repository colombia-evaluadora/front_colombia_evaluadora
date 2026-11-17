import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EnvelopeIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { MatriculaTextField } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { SEGUNDOS_REENVIO } from "@/features/publico/inscribir/datos-demo"
import { enmascararCorreo } from "@/features/publico/inscribir/utils"

export interface FilaResumen {
  etiqueta: string
  valor: string
}

interface PasoConfirmacionProps {
  resumen: FilaResumen[]
  correo: string
  autoriza: boolean
  onAutorizaChange: (autoriza: boolean) => void
  codigo: string
  onCodigoChange: (codigo: string) => void
  intentosRestantes: number
  bloqueado: boolean
  intentado: boolean
  /** Mensaje del último intento fallido. */
  errorCodigo: string | null
}

/** Paso 5 · Resumen, autorización de datos y código enviado al correo del acudiente. */
export function PasoConfirmacion({
  resumen,
  correo,
  autoriza,
  onAutorizaChange,
  codigo,
  onCodigoChange,
  intentosRestantes,
  bloqueado,
  intentado,
  errorCodigo,
}: PasoConfirmacionProps) {
  const [verTexto, setVerTexto] = useState(false)
  const [espera, setEspera] = useState(SEGUNDOS_REENVIO)

  useEffect(() => {
    if (espera <= 0) return
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [espera])

  const reloj = `${Math.floor(espera / 60)}:${String(espera % 60).padStart(2, "0")}`
  const codigoInvalido = Boolean(errorCodigo) || (intentado && codigo.length !== 6)

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid overflow-hidden rounded-lg border text-sm md:grid-cols-2">
        {resumen.map((f) => (
          <div key={f.etiqueta} className="grid grid-cols-[minmax(0,10rem)_1fr] border-b md:odd:border-r">
            <dt className="bg-muted/40 text-muted-foreground border-r px-4 py-3">{f.etiqueta}</dt>
            <dd className="px-4 py-3">{f.valor || "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5">
        <label className="flex w-fit cursor-pointer items-start gap-2 text-sm">
          <Checkbox
            checked={autoriza}
            onCheckedChange={(c) => onAutorizaChange(Boolean(c))}
            aria-invalid={intentado && !autoriza}
          />
          <span>
            Autorizo el tratamiento de datos (Ley 1581 de 2012){" "}
            <button type="button" className="text-primary hover:underline" onClick={() => setVerTexto(true)}>
              Ver el texto
            </button>{" "}
            <span data-required-mark="">*</span>
          </span>
        </label>
        {intentado && !autoriza && <p className="text-red text-xs">Debe autorizar el tratamiento de datos para continuar.</p>}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          <MatriculaTextField
            id="codigo-verificacion"
            label="Código de verificación"
            required
            numeric
            maxLength={6}
            value={codigo}
            disabled={bloqueado}
            onChange={onCodigoChange}
            invalid={codigoInvalido}
          />
          <p className={cn("text-xs", codigoInvalido ? "text-red" : "text-muted-foreground")}>
            {errorCodigo ??
              (intentado && codigo.length !== 6
                ? "Digite los 6 dígitos del código."
                : `Lo enviamos a ${enmascararCorreo(correo)}. Vence en 15 minutos.`)}
          </p>
          <p className="text-muted-foreground text-xs">
            Tiene {intentosRestantes} {intentosRestantes === 1 ? "intento" : "intentos"} para digitar el código.
          </p>
        </div>
        <Button
          type="button"
          variant="link"
          className="sm:mt-7"
          disabled={espera > 0 || bloqueado}
          onClick={() => setEspera(SEGUNDOS_REENVIO)}
        >
          <EnvelopeIcon data-icon="inline-start" />
          {espera > 0 ? `Reenviar código (disponible en ${reloj})` : "Reenviar código"}
        </Button>
      </div>

      <Dialog open={verTexto} onOpenChange={setVerTexto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tratamiento de datos personales</DialogTitle>
            <DialogDescription>Ley 1581 de 2012 y Decreto 1377 de 2013.</DialogDescription>
          </DialogHeader>
          {/* Texto provisional: pendiente del texto aprobado por el área jurídica. */}
          <div className="text-muted-foreground flex flex-col gap-3 text-sm">
            <p>
              Al inscribir al aspirante, usted autoriza que sus datos personales y los del acudiente sean tratados para
              gestionar la inscripción, la asignación de cupo y la matrícula en los establecimientos de las opciones.
            </p>
            <p>
              Los datos de niñas, niños y adolescentes se tratan respetando su interés superior. Puede conocer,
              actualizar, rectificar o pedir la supresión de sus datos ante el establecimiento educativo.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setVerTexto(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
