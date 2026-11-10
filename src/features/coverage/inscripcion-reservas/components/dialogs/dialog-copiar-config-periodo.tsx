import { useState } from "react"
import { format, parseISO } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircleIcon, CopyIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"

import { useCopiarConfigPeriodo } from "@/features/coverage/inscripcion-reservas/api/mutations/configuracion"
import { nombrePeriodo } from "@/features/coverage/inscripcion-reservas/api/query/use-configuracion-query"
import type {
  PeriodoInscripcionConfig,
  ResultadoCopia,
} from "@/features/coverage/inscripcion-reservas/api/types/configuracion"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const MODO = { MANUAL: "Manual", AUTOMATICA: "Automática" } as const

/** Copiar configuración de un período a otros períodos en Inscripciones. */
export function CopiarConfigPeriodoDialog({
  origen,
  periodos,
  onOpenChange,
}: {
  origen: PeriodoInscripcionConfig | null
  periodos: PeriodoInscripcionConfig[]
  onOpenChange: (open: boolean) => void
}) {
  // Se monta con `key` por origen: todos los demás marcados por defecto.
  return (
    <Dialog open={origen != null} onOpenChange={(o) => !o && onOpenChange(false)}>
      {origen && (
        <Contenido
          key={origen.id}
          origen={origen}
          destinos={periodos.filter((p) => p.id !== origen.id)}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function Contenido({
  origen,
  destinos,
  onClose,
}: {
  origen: PeriodoInscripcionConfig
  destinos: PeriodoInscripcionConfig[]
  onClose: () => void
}) {
  const copiar = useCopiarConfigPeriodo()
  const [marcados, setMarcados] = useState(() => destinos.map((p) => p.id))
  const [intentado, setIntentado] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCopia | null>(null)
  const sinDestino = marcados.length === 0

  function confirmar() {
    setIntentado(true)
    if (sinDestino) return
    copiar.mutate(
      { id: origen.id, destinos: marcados },
      {
        onSuccess: (r) => {
          // Todo copiado: basta un aviso. Si alguno falló, el resultado se muestra en el modal (Sección 3.8).
          if (r.noCopiados.length === 0) {
            toast.success(
              `Se copió la configuración a ${r.copiados.length} ${r.copiados.length === 1 ? "período" : "períodos"}.`,
            )
            onClose()
          } else {
            setResultado(r)
          }
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  if (resultado) return <Resultado origen={origen} resultado={resultado} onClose={onClose} />

  const valores: [string, string][] = [
    [
      "Fecha de liberación de reservas",
      origen.fechaLiberacionReservas
        ? format(parseISO(origen.fechaLiberacionReservas), "dd/MM/yyyy")
        : "—",
    ],
    ["Modo de aceptación de traslados", MODO[origen.modoTraslado]],
    ["Plazo de respuesta del traslado", `${origen.plazoRespuestaTraslado} días`],
    ["Confirmación del acudiente", origen.requiereConfirmacionAcudiente ? "Sí" : "No"],
  ]

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Copiar configuración de {nombrePeriodo(origen)}</DialogTitle>
      </DialogHeader>

      <div className="grid gap-5 text-sm">
        <section className="grid gap-2">
          <h3 className="font-medium">Valores que se copian</h3>
          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
            {valores.map(([label, valor]) => (
              <div key={label} className="grid content-start gap-1">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        <fieldset className="grid gap-2.5" aria-invalid={intentado && sinDestino}>
          <legend className="mb-2.5 font-medium">
            Copiar a <span className="text-red">*</span>
          </legend>
          {destinos.length === 0 ? (
            <p className="text-muted-foreground">No hay otros períodos en Inscripciones.</p>
          ) : (
            destinos.map((p) => (
              <label key={p.id} className="flex w-fit cursor-pointer items-center gap-2">
                <Checkbox
                  checked={marcados.includes(p.id)}
                  onCheckedChange={(c) =>
                    setMarcados(c ? [...marcados, p.id] : marcados.filter((x) => x !== p.id))
                  }
                />
                {nombrePeriodo(p)}
              </label>
            ))
          )}
          {intentado && sinDestino ? (
            <p className="text-xs text-red">Elija al menos un período.</p>
          ) : (
            <p className="text-xs text-muted-foreground">Solo períodos en Inscripciones.</p>
          )}
        </fieldset>

        <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          color="neutral"
          disabled={copiar.isPending}
          onClick={() => !copiar.isPending && onClose()}
        >
          <XIcon data-icon="inline-start" />
          Cancelar
        </Button>
        <Button disabled={copiar.isPending || destinos.length === 0} onClick={confirmar}>
          {copiar.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CopyIcon data-icon="inline-start" />
          )}
          Copiar
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

/** Resultado de la copia: en qué períodos se copió y en cuáles no, con el motivo. */
function Resultado({
  origen,
  resultado,
  onClose,
}: {
  origen: PeriodoInscripcionConfig
  resultado: ResultadoCopia
  onClose: () => void
}) {
  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Resultado de copiar {nombrePeriodo(origen)}</DialogTitle>
      </DialogHeader>
      <div className="grid gap-4 text-sm">
        {resultado.copiados.length > 0 && (
          <section className="grid gap-2">
            <h3 className="font-medium">Se copió a</h3>
            <ul className="grid gap-1.5">
              {resultado.copiados.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <CheckCircleIcon className="size-4 shrink-0 text-green" aria-hidden />
                  {p.periodo}
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="grid gap-2">
          <h3 className="font-medium">No se copió</h3>
          <ul className="grid gap-2">
            {resultado.noCopiados.map((p) => (
              <li key={p.id}>
                <Aviso tono="warning">
                  La configuración no se copió a {p.periodo} porque {p.motivo}.
                </Aviso>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Entendido</Button>
      </DialogFooter>
    </DialogContent>
  )
}
