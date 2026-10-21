import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  SpinnerIcon,
  XCircleIcon,
} from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"

import { bitacoraKeys } from "@/features/bitacora/api/query-keys"
import { restaurarEvento, useRestaurarEvento } from "@/features/bitacora/api/mutations/restaurar-evento"
import {
  BITACORA_ACCIONES,
  BITACORA_MODULOS,
  TIPO_RESTAURACION_LABEL,
  type BitacoraEstado,
  type BitacoraEvento,
  type BitacoraModulo,
} from "@/features/bitacora/api/types/bitacora"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500
// La vista previa valida el evento, no el motivo: va uno válido de relleno.
const MOTIVO_VISTA_PREVIA = "Vista previa de la restauración."

interface DialogRestaurarEventoProps {
  modulo: BitacoraModulo
  establecimiento: string
  evento: BitacoraEvento | null
  estado: BitacoraEstado | undefined
  onClose: () => void
  onRestaurado: () => void
}

/** Restaurar información (§12.3): valida antes y crea un evento Restauración. */
export function DialogRestaurarEvento(props: DialogRestaurarEventoProps) {
  return (
    <Dialog open={props.evento != null} onOpenChange={(next) => !next && props.onClose()}>
      {props.evento && <Contenido key={props.evento.id} {...props} evento={props.evento} />}
    </Dialog>
  )
}

function Contenido({
  modulo,
  establecimiento,
  evento,
  estado,
  onClose,
  onRestaurado,
}: DialogRestaurarEventoProps & { evento: BitacoraEvento }) {
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const restaurar = useRestaurarEvento({ mutationConfig: { onSuccess: onRestaurado } })

  // El back corre todas las validaciones sin escribir (vigencia, dependencias, reglas del módulo).
  const vistaPrevia = useQuery({
    queryKey: bitacoraKeys.vistaPrevia(evento.id),
    queryFn: () =>
      restaurarEvento({ id: evento.id, motivo: MOTIVO_VISTA_PREVIA, establecimiento, vistaPrevia: true }),
    retry: false,
    gcTime: 0,
  })

  const recuperar = evento.tipoRestauracion === "RECUPERAR_REGISTRO"
  const puede = vistaPrevia.isSuccess

  const largo = motivo.trim().length
  const errorMotivo =
    largo === 0
      ? "El motivo es obligatorio."
      : largo < MOTIVO_MIN
        ? `El motivo debe tener al menos ${MOTIVO_MIN} caracteres.`
        : null

  function handleRestaurar() {
    setIntento(true)
    if (errorMotivo || !puede) return
    restaurar.mutate({ id: evento.id, motivo: motivo.trim(), establecimiento })
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Restaurar información</DialogTitle>
      </DialogHeader>

      {restaurar.isError && (
        <p role="alert" className="rounded-md bg-red-22 px-3 py-2 text-sm text-red">
          {getErrorMessage(restaurar.error)}
        </p>
      )}

      <dl className="grid gap-x-4 gap-y-2 rounded-md border border-border px-3 py-2 text-sm sm:grid-cols-[10rem_1fr]">
        <Dato label="Evento">
          {format(evento.fecha, "dd/MM/yyyy HH:mm")}, {evento.usuario.nombre}
          {evento.usuario.rol ? ` (${evento.usuario.rol})` : ""}
          {evento.sede ? `, ${evento.sede}` : ""}, {BITACORA_ACCIONES[evento.accion]}
        </Dato>
        <Dato label="Tipo de restauración">
          {evento.tipoRestauracion && TIPO_RESTAURACION_LABEL[evento.tipoRestauracion]}{" "}
          <span className="text-muted-foreground">(lo determina el evento)</span>
        </Dato>
      </dl>

      {!recuperar && estado && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Campo</TableHead>
              <TableHead>Valor actual</TableHead>
              <TableHead>Se restaurará a</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estado.cambios.map((c) => (
              <TableRow key={c.campo} className="hover:bg-transparent">
                <TableCell className="text-muted-foreground">{c.campo}</TableCell>
                <TableCell className={c.actual !== c.nuevo ? "text-red" : undefined}>{c.actual ?? "—"}</TableCell>
                <TableCell>{c.anterior ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Field orientation="vertical" variant="outlined" data-invalid={(intento && errorMotivo) || undefined}>
        <FieldLabel htmlFor="restaurar-motivo">Motivo *</FieldLabel>
        <Textarea
          id="restaurar-motivo"
          className={TEXTAREA_OUTLINED}
          value={motivo}
          maxLength={MOTIVO_MAX}
          placeholder="Por qué se deshace este cambio"
          aria-invalid={Boolean(intento && errorMotivo)}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex justify-between gap-2">
          {intento && errorMotivo ? <FieldError>{errorMotivo}</FieldError> : <span />}
          <CharacterCounter value={motivo} max={MOTIVO_MAX} />
        </div>
      </Field>

      <ul
        className={
          "flex flex-col gap-2 rounded-md border px-3 py-2 text-sm " +
          (vistaPrevia.isError ? "border-red-stroke bg-red-22/40" : "border-border")
        }
      >
        {vistaPrevia.isPending ? (
          <li className="flex items-center gap-2 text-muted-foreground">
            <SpinnerIcon className="size-4 animate-spin" aria-hidden />
            Comprobando si se puede restaurar…
          </li>
        ) : vistaPrevia.isError ? (
          <Validacion ok={false}>
            <span className="font-medium">{getErrorMessage(vistaPrevia.error)}</span>
            {evento.eventosPosteriores.length > 0 && (
              <span className="block text-muted-foreground">
                Eventos posteriores:{" "}
                {evento.eventosPosteriores
                  .map((p) => `${p.fecha.replace("T", " ").slice(0, 16)}, ${p.usuario}${p.campo ? ` (${p.campo})` : ""}`)
                  .join("; ")}
                . Revise ese evento antes de restaurar.
              </span>
            )}
          </Validacion>
        ) : (
          <>
            <Validacion ok>
              {recuperar
                ? "Las dependencias del registro siguen existiendo."
                : "El valor actual sigue siendo el que dejó el evento."}
            </Validacion>
            <Validacion ok>Se cumplen las reglas vigentes del módulo {BITACORA_MODULOS[modulo]}.</Validacion>
          </>
        )}
      </ul>

      <DialogFooter>
        <Button size="sm" variant="outline" color="neutral" onClick={onClose} disabled={restaurar.isPending}>
          Cancelar
        </Button>
        <Button size="sm" color="primary" disabled={!puede || restaurar.isPending} onClick={handleRestaurar}>
          <ArrowCounterClockwiseIcon data-icon="inline-start" />
          Restaurar
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function Validacion({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <CheckCircleIcon aria-label="Cumple" className="mt-0.5 size-4 shrink-0 text-green" />
      ) : (
        <XCircleIcon aria-label="No cumple" className="mt-0.5 size-4 shrink-0 text-red" />
      )}
      <span>{children}</span>
    </li>
  )
}

function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}
