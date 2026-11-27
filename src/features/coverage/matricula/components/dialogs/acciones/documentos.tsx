import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { CaretDownIcon, CheckCircleIcon, FilePdfIcon, FileTextIcon, FileZipIcon, IdentificationCardIcon, LockIcon, SpinnerIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import {
  useConfiguracionConstanciaQuery,
  useGenerarCarnes,
  useGenerarConstancias,
  useGenerarHojas,
  useGenerarPaquete,
  usePreviaCarnesQuery,
  usePreviaPaqueteQuery,
} from "@/features/coverage/matricula/api/acciones-lote"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"
import {
  MatriculasAfectadas,
  nombreDe,
  tituloAccion,
} from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { BotonAccion } from "@/features/coverage/matricula/components/dialogs/acciones/boton-accion"

const DIRIGIDA_MIN = 3
const DIRIGIDA_MAX = 150
const DIRIGIDA_DEFAULT = "A quien interese"

/**
 * Generar constancia(s) de estudio (Sección 2.17, Regla 58): un solo «Dirigida a»
 * para todas y un solo PDF. Solo matrículas Cursando. Con numeración se puede
 * generar como borrador (sin número, con marca BORRADOR y sin QR).
 */
export function DialogGenerarConstancias({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const { data: config } = useConfiguracionConstanciaQuery()
  const generar = useGenerarConstancias()
  const [dirigidaA, setDirigidaA] = useState(DIRIGIDA_DEFAULT)
  const [borrador, setBorrador] = useState(true)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const largo = dirigidaA.trim().length
  const valido = largo >= DIRIGIDA_MIN && largo <= DIRIGIDA_MAX
  const uno = matriculas.length === 1
  const titulo = uno ? "Generar constancia de estudio" : "Generar constancias de estudio"

  function confirmar() {
    if (!valido) return
    generar.mutate(
      { matriculaIds: matriculas.map((m) => m.id), dirigidaA: dirigidaA.trim(), borrador: Boolean(config?.numeracion) && borrador },
      {
        onSuccess: () => {
          notify(uno ? `Se generó la constancia de estudio de ${nombreDe(matriculas[0])}.` : `Se generaron ${matriculas.length} constancias de estudio.`)
          onDone?.()
          onOpenChange(false)
        },
        onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => !generar.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tituloAccion(titulo, matriculas)}</DialogTitle>
          <MatriculasAfectadas matriculas={matriculas} />
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        <Field variant="outlined" className="gap-1.5" data-invalid={!valido || undefined}>
          <FieldLabel htmlFor="constancia-dirigida">
            Dirigida a<span data-required-mark="">*</span>
          </FieldLabel>
          <Input
            id="constancia-dirigida"
            variant="outlined"
            maxLength={DIRIGIDA_MAX}
            value={dirigidaA}
            aria-invalid={!valido}
            onChange={(e) => setDirigidaA(e.target.value)}
          />
          <FieldDescription className={cn(!valido && "text-red")}>
            {valido ? "Se puede cambiar; p. ej. el nombre de la entidad que la pide." : `Entre ${DIRIGIDA_MIN} y ${DIRIGIDA_MAX} caracteres.`}
          </FieldDescription>
        </Field>

        {/* La fecha la pone el sistema (hoy): campo de solo lectura con candado (§13). */}
        <Field variant="outlined" className="gap-1.5">
          <FieldLabel htmlFor="constancia-fecha">Fecha de expedición</FieldLabel>
          <div className="relative">
            <Input
              id="constancia-fecha"
              variant="outlined"
              readOnly
              className="pr-9"
              value={new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}
            />
            <LockIcon aria-hidden className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </Field>

        {config?.numeracion ? (
          <MarcoOpciones
            id="constancia-borrador-marco"
            label="Generar como borrador"
            descripcion="No consume número y sale con la marca BORRADOR, sin código QR."
          >
            <label className="flex cursor-pointer items-center gap-2">
              <Switch aria-labelledby="constancia-borrador-marco-label" checked={borrador} onCheckedChange={setBorrador} />
              {borrador ? "Sí" : "No"}
            </label>
          </MarcoOpciones>
        ) : null}

        <DialogFooter>
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={!valido || generar.isPending} onClick={confirmar}>
            {generar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FilePdfIcon data-icon="inline-start" />
            )}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Generar carné(s) estudiantil(es) (Sección 2.18, Regla 61): un solo PDF.
 * Antes avisa cuántos no tienen foto: su carné sale con una silueta.
 */
export function DialogGenerarCarnes({
  matriculas,
  onOpenChange,
  onDone,
}: {
  matriculas: Matricula[]
  onOpenChange: (open: boolean) => void
  onDone?: () => void
}) {
  const { notify } = useNotify()
  const ids = matriculas.map((m) => m.id)
  const { data: previa, isPending } = usePreviaCarnesQuery(ids)
  const generar = useGenerarCarnes()
  const [error, setError] = useState<{ id: number; message: string } | null>(null)
  const total = matriculas.length
  const uno = total === 1
  const sinFoto = previa?.sinFoto ?? 0

  function confirmar() {
    generar.mutate(ids, {
      onSuccess: () => {
        notify(uno ? `Se generó el carné estudiantil de ${nombreDe(matriculas[0])}.` : `Se generaron ${total} carnés estudiantiles.`)
        onDone?.()
        onOpenChange(false)
      },
      onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !generar.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {sinFoto ? <WarningCircleIcon className="size-5 shrink-0 text-yellow" aria-hidden /> : null}
            {uno ? "Generar carné estudiantil" : "Generar carnés"}
          </DialogTitle>
          {uno ? <DialogDescription>{nombreDe(matriculas[0])}</DialogDescription> : null}
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando las fotos…
          </div>
        ) : sinFoto ? (
          <p className="text-sm">
            <span className="font-semibold">
              {uno ? "El estudiante" : `${sinFoto} de los ${total} estudiantes`}
            </span>{" "}
            no {sinFoto === 1 ? "tiene" : "tienen"} foto; su carné saldrá con una silueta.
            <span className="block text-muted-foreground">La foto se carga en la matrícula.</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {uno ? "Se generará el carné en PDF." : `Se generarán ${total} carnés en un solo PDF.`} El carné anterior de cada estudiante queda reemplazado.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button type="button" variant="fill" color="primary" size="sm" disabled={isPending || generar.isPending} onClick={confirmar}>
            {generar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <IdentificationCardIcon data-icon="inline-start" />
            )}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Paquete de soporte (Regla 73): un solo PDF con el documento de identidad, el
 * boletín de un período y la hoja de matrícula firmada. Lo que falte se indica
 * en el paquete y no lo bloquea.
 */
export function DialogPaqueteSoporte({ matricula, onOpenChange }: { matricula: Matricula; onOpenChange: (open: boolean) => void }) {
  const { notify } = useNotify()
  const { data: previa, isPending } = usePreviaPaqueteQuery(matricula.id)
  const generar = useGenerarPaquete()
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const piezas = previa
    ? [
        { label: "Documento de identidad", ok: previa.documentoIdentidad, detalle: null },
        { label: "Boletín", ok: Boolean(previa.boletin), detalle: previa.boletin },
        { label: "Hoja de matrícula firmada", ok: previa.hojaFirmada, detalle: null },
      ]
    : []
  const faltan = piezas.filter((p) => !p.ok).length

  return (
    <Dialog open onOpenChange={(o) => !generar.isPending && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar paquete de soporte — {nombreDe(matricula)}</DialogTitle>
          <DialogDescription>Un solo PDF para entregar a la Secretaría o a una auditoría.</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={error} onClose={() => setError(null)} variant="error" />

        {isPending ? (
          <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
            <SpinnerIcon className="animate-spin" /> Revisando los soportes…
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border text-sm">
            {piezas.map((p) => (
              <li key={p.label} className="flex items-start gap-3 px-4 py-2.5">
                {p.ok ? (
                  <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-green" aria-hidden />
                ) : (
                  <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-yellow" aria-hidden />
                )}
                <span>
                  {p.label}
                  <span className="block text-muted-foreground">
                    {p.ok ? (p.detalle ?? "Incluido") : "No disponible: se indica en el paquete"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {faltan ? (
          <p className="text-xs text-muted-foreground">Lo que falta no impide generar el paquete.</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" color="neutral" type="button" size="sm" onClick={() => onOpenChange(false)}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={!previa || generar.isPending}
            onClick={() =>
              generar.mutate(matricula.id, {
                onSuccess: () => {
                  notify(`Se generó el paquete de soporte de ${nombreDe(matricula)}.`)
                  onOpenChange(false)
                },
                onError: (err) => setError({ id: Date.now(), message: getErrorMessage(err) }),
              })
            }
          >
            {generar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileZipIcon data-icon="inline-start" />
            )}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Documentos de una matrícula Cursando: hoja de matrícula, constancia, carné y paquete de soporte (fila y detalle). */
export function AccionesDocumentos({ matricula, modo = "icon" }: { matricula: Matricula; modo?: "icon" | "button" | "menu" }) {
  const { notify } = useNotify()
  const hojas = useGenerarHojas()
  const [abierto, setAbierto] = useState<"constancia" | "carne" | "paquete" | null>(null)
  if (matricula.status !== "Cursando") return null
  const nombre = nombreDe(matricula)
  const cerrar = (open: boolean) => !open && setAbierto(null)
  const generarHoja = () =>
    hojas.mutate([matricula.id], {
      onSuccess: () => notify(`Se generó la hoja de matrícula de ${nombre}.`),
      onError: (err) => notify(getErrorMessage(err), { variant: "error" }),
    })
  const dialogos = (
    <>
      {abierto === "constancia" ? <DialogGenerarConstancias matriculas={[matricula]} onOpenChange={cerrar} /> : null}
      {abierto === "carne" ? <DialogGenerarCarnes matriculas={[matricula]} onOpenChange={cerrar} /> : null}
      {abierto === "paquete" ? <DialogPaqueteSoporte matricula={matricula} onOpenChange={cerrar} /> : null}
    </>
  )

  // Encabezado del detalle: los cuatro documentos en un solo botón desplegable, para que buscador y
  // acciones quepan en la misma línea (CLAUDE.md §13).
  if (modo === "menu")
    return (
      <>
        <OnlineOnlyAction>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" color="neutral" size="sm" disabled={hojas.isPending} />}
            >
              {hojas.isPending ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileTextIcon data-icon="inline-start" />}
              Generar documento
              <CaretDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={generarHoja}>
                <FileTextIcon />
                Hoja de matrícula
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAbierto("constancia")}>
                <FilePdfIcon />
                Constancia de estudio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAbierto("carne")}>
                <IdentificationCardIcon />
                Carné estudiantil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAbierto("paquete")}>
                <FileZipIcon />
                Paquete de soporte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </OnlineOnlyAction>
        {dialogos}
      </>
    )

  return (
    <>
      <OnlineOnlyAction>
        <BotonAccion
          modo={modo}
          label="Generar hoja de matrícula"
          ariaLabel={`Generar hoja de matrícula de ${nombre}`}
          Icon={hojas.isPending ? SpinnerIcon : FileTextIcon}
          disabled={hojas.isPending}
          onClick={generarHoja}
        />
      </OnlineOnlyAction>
      <OnlineOnlyAction>
        <BotonAccion
          modo={modo}
          label="Generar constancia de estudio"
          ariaLabel={`Generar constancia de estudio de ${nombre}`}
          Icon={FilePdfIcon}
          onClick={() => setAbierto("constancia")}
        />
      </OnlineOnlyAction>
      <OnlineOnlyAction>
        <BotonAccion
          modo={modo}
          label="Generar carné estudiantil"
          ariaLabel={`Generar carné estudiantil de ${nombre}`}
          Icon={IdentificationCardIcon}
          onClick={() => setAbierto("carne")}
        />
      </OnlineOnlyAction>
      <OnlineOnlyAction>
        <BotonAccion
          modo={modo}
          label="Generar paquete de soporte"
          ariaLabel={`Generar paquete de soporte de ${nombre}`}
          Icon={FileZipIcon}
          onClick={() => setAbierto("paquete")}
        />
      </OnlineOnlyAction>
      {dialogos}
    </>
  )
}
