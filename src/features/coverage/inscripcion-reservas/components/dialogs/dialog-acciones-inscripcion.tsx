import type { ReactNode } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WarningIcon, XCircleIcon, XIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"

import {
  useAdmitirOpciones,
  useAnularInscripcion,
  useNoAdmitirOpciones,
} from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-inscripcion"
import { useMotivosInscripcion } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type { OpcionInscripcion } from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import { Marca } from "@/features/coverage/inscripcion-reservas/components/table/columns-inscripciones"
import { Aviso } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const plural = (n: number) => `${n} ${n === 1 ? "opción" : "opciones"}`

interface AccionProps {
  /** Opciones sobre las que se actúa; vacío = cerrado. */
  opciones: OpcionInscripcion[]
  onOpenChange: (open: boolean) => void
  /** Al terminar (p. ej. limpiar la selección). */
  onDone?: () => void
}

/**
 * Admitir (Regla 28): en el orden de admisión se admiten hasta agotar los
 * cupos; las que no alcanzan quedan En lista de espera.
 */
export function AdmitirDialog({
  opciones,
  cupos,
  onOpenChange,
  onDone,
}: AccionProps & { cupos: number }) {
  const admitir = useAdmitirOpciones()
  const n = opciones.length
  const admitidas = Math.min(n, cupos)
  const espera = n - admitidas

  function confirmar() {
    admitir.mutate(
      [...opciones].sort((a, b) => a.posicion - b.posicion).map((o) => o.id),
      {
        onSuccess: (r) => {
          toast.success(
            r.enListaEspera
              ? `Se admitieron ${r.admitidas} y ${r.enListaEspera} quedaron en lista de espera.`
              : `Se admitieron ${plural(r.admitidas)}.`,
          )
          onOpenChange(false)
          onDone?.()
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  return (
    <Dialog open={n > 0} onOpenChange={(o) => !o && !admitir.isPending && onOpenChange(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Admitir — {plural(n)}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 text-sm">
          <p>
            Hay {cupos} {cupos === 1 ? "cupo disponible" : "cupos disponibles"}. Según el orden de
            admisión:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Conteo valor={admitidas} className="text-green">
              <Marca label="Admitidas" color="success" punto />
            </Conteo>
            <Conteo valor={espera} className="text-orange">
              <Marca label="En lista de espera" color="orange" punto />
            </Conteo>
          </div>
          <p>
            A cada opción admitida se le crea su reserva de cupo.{" "}
            {espera
              ? `${plural(espera)} ${espera === 1 ? "queda" : "quedan"} en lista de espera hasta que se liberen cupos.`
              : "Ninguna queda en lista de espera."}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            color="neutral"
            disabled={admitir.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button disabled={admitir.isPending} onClick={confirmar}>
            {admitir.isPending && <Spinner data-icon="inline-start" />}
            Admitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Conteo({
  valor,
  className,
  children,
}: {
  valor: number
  className: string
  children: ReactNode
}) {
  return (
    <div className="grid justify-items-start gap-2 rounded-lg border border-border p-4">
      <span className={`text-2xl font-semibold tabular-nums ${className}`}>{valor}</span>
      {children}
    </div>
  )
}

const NO_ADMITIR_FORM_ID = "no-admitir-form"
const noAdmitirSchema = z.object({
  motivo: z.string().min(1, required("El motivo de no admisión")),
})

/**
 * No admitir (Sección 3.3): un solo Motivo de no admisión para todo el lote;
 * si a alguna le faltan documentos, recuerda que eso no impide matricular (Regla 40).
 */
export function NoAdmitirDialog({ opciones, onOpenChange, onDone }: AccionProps) {
  const n = opciones.length
  return (
    <Dialog open={n > 0} onOpenChange={(o) => !o && onOpenChange(false)}>
      {n > 0 && (
        // Se monta por apertura: el motivo arranca según las opciones elegidas.
        <NoAdmitirContenido
          key={opciones.map((o) => o.id).join()}
          opciones={opciones}
          onOpenChange={onOpenChange}
          onDone={onDone}
        />
      )}
    </Dialog>
  )
}

function NoAdmitirContenido({ opciones, onOpenChange, onDone }: AccionProps) {
  const noAdmitir = useNoAdmitirOpciones()
  const motivos = useMotivosInscripcion()
  const n = opciones.length
  const porDocumentos = opciones.some((o) => o.documentosIncompletos)

  const form = useAppForm({
    defaultValues: { motivo: porDocumentos ? "Documentación incompleta" : "" },
    validators: { onSubmit: noAdmitirSchema },
    onSubmit: ({ value }) =>
      noAdmitir.mutateAsync(
        { ids: opciones.map((o) => o.id), motivo: value.motivo },
        {
          onSuccess: () => {
            toast.success(
              n === 1 ? "La opción quedó No admitida." : `${n} opciones quedaron No admitidas.`,
            )
            onOpenChange(false)
            onDone?.()
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
  })

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {porDocumentos && <WarningIcon className="size-5 text-orange" aria-hidden />}
          No admitir — {plural(n)}
        </DialogTitle>
      </DialogHeader>
      <form
        id={NO_ADMITIR_FORM_ID}
        noValidate
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        {porDocumentos && (
          <p className="text-sm">
            La falta de documentos no impide la matrícula. ¿Desea no admitir de todos modos?
          </p>
        )}
        <form.AppField name="motivo">
          {(f) => (
            <f.SelectField
              label="Motivo de no admisión"
              required
              placeholder="Seleccionar"
              options={motivos.noAdmision.map((m) => ({ value: m, label: m }))}
              description={
                n > 1
                  ? "El mismo motivo para todas. Si los motivos son distintos, hágalo en lotes separados."
                  : undefined
              }
            />
          )}
        </form.AppField>
      </form>
      <DialogFooter>
        <Button
          variant="outline"
          color="neutral"
          disabled={noAdmitir.isPending}
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
        <Button type="submit" form={NO_ADMITIR_FORM_ID} disabled={noAdmitir.isPending}>
          {noAdmitir.isPending && <Spinner data-icon="inline-start" />}
          No admitir
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

const FORM_ID = "anular-inscripcion-form"
const schema = z.object({ motivo: z.string().min(1, required("El motivo de anulación")) })

/** Anular inscripción: todas sus opciones quedan Descartadas y sus reservas se liberan. */
export function AnularInscripcionDialog({
  inscripcion,
  onOpenChange,
  onDone,
}: {
  inscripcion: { id: string; numeroInscripcion: string } | null
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const anular = useAnularInscripcion()
  const motivos = useMotivosInscripcion()
  const form = useAppForm({
    defaultValues: { motivo: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      anular.mutateAsync(
        { id: inscripcion?.id ?? "", motivo: value.motivo },
        {
          onSuccess: () => {
            toast.success(`Se anuló la inscripción ${inscripcion?.numeroInscripcion ?? ""}.`)
            form.reset()
            onOpenChange(false)
            onDone?.()
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
  })

  function cerrar() {
    if (anular.isPending) return
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={inscripcion != null} onOpenChange={(o) => !o && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anular inscripción {inscripcion?.numeroInscripcion}</DialogTitle>
        </DialogHeader>
        <form
          id={FORM_ID}
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <form.AppField name="motivo">
            {(f) => (
              <f.SelectField
                label="Motivo de anulación"
                required
                placeholder="Seleccionar"
                options={motivos.anulacion.map((m) => ({ value: m, label: m }))}
              />
            )}
          </form.AppField>
          <Aviso tono="warning">
            Todas sus opciones quedarán Descartadas y sus reservas se liberarán.
          </Aviso>
        </form>
        <DialogFooter>
          <Button variant="outline" color="neutral" disabled={anular.isPending} onClick={cerrar}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} color="destructive" disabled={anular.isPending}>
            {anular.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <XCircleIcon data-icon="inline-start" />
            )}
            Anular inscripción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
