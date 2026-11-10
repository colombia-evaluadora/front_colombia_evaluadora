import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckSquareIcon, PlusCircleIcon, XIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"

import { MatriculaSelectField } from "@/features/coverage/matricula/components/forms/form-create-matricula/fields"
import {
  useAmpliarInscripcion,
  useElegirOpcion,
} from "@/features/coverage/inscripcion-reservas/api/mutations/ampliar-elegir"
import { useInscripcionDetalleQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { OpcionCupoInput } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import { ESTADO_OPCION_UI } from "@/features/coverage/inscripcion-reservas/api/ui-mappings-inscripcion"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import { useCascadaOpciones } from "@/features/coverage/inscripcion-reservas/hooks/use-cascada-opciones"

export interface InscripcionObjetivo {
  inscripcionId: string
  aspirante: string
  /** Grado de la inscripción: la opción nueva debe ser del mismo (Regla 27). */
  grado: string
}

const vacia: OpcionCupoInput = { establecimiento: "", sede: "", jornada: "" }

/**
 * Ampliar inscripción (Regla 27): una opción más con la misma cascada de Nueva inscripción.
 * Nace Pendiente, al final del orden de preferencia; la autorización de datos ya dada la cubre.
 */
export function AmpliarInscripcionDialog({
  objetivo,
  onOpenChange,
}: {
  objetivo: InscripcionObjetivo | null
  onOpenChange: (open: boolean) => void
}) {
  const ampliar = useAmpliarInscripcion()
  const { establecimientos, sedesDe, jornadasDe } = useCascadaOpciones(objetivo?.grado)
  const [opcion, setOpcion] = useState(vacia)
  const [intentado, setIntentado] = useState(false)

  function cerrar() {
    if (ampliar.isPending) return
    setOpcion(vacia)
    setIntentado(false)
    onOpenChange(false)
  }

  function guardar() {
    setIntentado(true)
    if (!objetivo || !opcion.establecimiento || !opcion.sede || !opcion.jornada) return
    ampliar.mutate(
      { id: objetivo.inscripcionId, grado: objetivo.grado, opcion },
      {
        onSuccess: () => {
          toast.success(
            `Se amplió la inscripción de ${objetivo.aspirante} con ${opcion.establecimiento} · ${opcion.sede}.`,
          )
          setOpcion(vacia)
          setIntentado(false)
          onOpenChange(false)
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog open={objetivo != null} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ampliar inscripción — {objetivo?.aspirante}</DialogTitle>
          <DialogDescription>
            La opción nueva es de {objetivo?.grado}, queda Pendiente y va al final del orden de
            preferencia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <MatriculaSelectField
            id="ampliar-establecimiento"
            label="Establecimiento"
            required
            value={opcion.establecimiento}
            options={establecimientos}
            onChange={(establecimiento) => setOpcion({ establecimiento, sede: "", jornada: "" })}
            invalid={intentado && !opcion.establecimiento}
          />
          <MatriculaSelectField
            id="ampliar-sede"
            label="Sede"
            required
            value={opcion.sede}
            options={sedesDe(opcion.establecimiento)}
            onChange={(sede) => setOpcion({ ...opcion, sede, jornada: "" })}
            invalid={intentado && !opcion.sede}
            disabled={!opcion.establecimiento}
          />
          <MatriculaSelectField
            id="ampliar-jornada"
            label="Jornada"
            required
            value={opcion.jornada}
            options={jornadasDe(opcion)}
            onChange={(jornada) => setOpcion({ ...opcion, jornada })}
            invalid={intentado && !opcion.jornada}
            disabled={!opcion.sede}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={ampliar.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button disabled={ampliar.isPending} onClick={guardar}>
            {ampliar.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <PlusCircleIcon data-icon="inline-start" />
            )}
            Ampliar inscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Elegir opción (Regla 38): con dos o más Admitidas, el funcionario elige a nombre del acudiente.
 * Con una sola, es "Quedarme con esta opción": mismo efecto, descarta las demás.
 */
export function ElegirOpcionDialog({
  objetivo,
  onOpenChange,
}: {
  objetivo: Pick<InscripcionObjetivo, "inscripcionId" | "aspirante"> | null
  onOpenChange: (open: boolean) => void
}) {
  const detalle = useInscripcionDetalleQuery(objetivo?.inscripcionId ?? "")
  const elegir = useElegirOpcion()
  const [elegida, setElegida] = useState("")

  const admitidas = (detalle.data?.opciones ?? []).filter((o) => o.estado === "ADMITIDA")
  const opcionId = elegida || (admitidas.length === 1 ? admitidas[0].id : "")
  const opcion = admitidas.find((o) => o.id === opcionId)

  function cerrar() {
    if (elegir.isPending) return
    setElegida("")
    onOpenChange(false)
  }

  function confirmar() {
    if (!opcion) return
    elegir.mutate(opcion.id, {
      onSuccess: () => {
        toast.success(
          `${objetivo?.aspirante} se queda con ${opcion.establecimiento} · ${opcion.sede} · ${opcion.jornada}.`,
        )
        setElegida("")
        onOpenChange(false)
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    })
  }

  return (
    <Dialog open={objetivo != null} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {opcion
              ? `Elegir ${opcion.establecimiento} · ${opcion.sede} · ${opcion.jornada}`
              : `Elegir opción — ${objetivo?.aspirante}`}
          </DialogTitle>
          <DialogDescription>
            {admitidas.length > 1
              ? "Quedó admitida en varias opciones. Elija con cuál se queda el aspirante, a nombre del acudiente."
              : "El aspirante se queda con su opción admitida."}
          </DialogDescription>
        </DialogHeader>
        {detalle.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : admitidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta inscripción no tiene opciones Admitidas.
          </p>
        ) : (
          <div className="grid gap-4">
            {admitidas.length > 1 && (
              <RadioGroup
                className="grid gap-2"
                value={opcionId}
                onValueChange={(v) => setElegida(String(v))}
              >
                {admitidas.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm has-data-checked:border-primary"
                  >
                    <RadioGroupItem value={o.id} />
                    <span className="grid flex-1 gap-0.5">
                      <span className="font-medium">
                        Opción {o.preferencia}: {o.establecimiento}
                      </span>
                      <span className="text-muted-foreground">
                        {o.sede} · {o.jornada}
                      </span>
                    </span>
                    <Marca {...ESTADO_OPCION_UI[o.estado]} />
                  </label>
                ))}
              </RadioGroup>
            )}
            <Aviso tono="warning">
              Las demás opciones quedarán Descartadas y sus cupos se liberarán.
            </Aviso>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={elegir.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button disabled={!opcion || elegir.isPending} onClick={confirmar}>
            {elegir.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckSquareIcon data-icon="inline-start" />
            )}
            Quedarme con esta opción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
