import { useState, type ReactNode } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ArrowCounterClockwiseIcon, CheckCircleIcon, XCircleIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea, TEXTAREA_OUTLINED } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"

import { useRestaurarEvento } from "@/features/bitacora/api/mutations/restaurar-evento"
import {
  BITACORA_MODULOS,
  restauracionDe,
  type BitacoraEvento,
  type BitacoraModulo,
} from "@/features/bitacora/api/types/bitacora"

const MOTIVO_MIN = 10
const MOTIVO_MAX = 500

interface DialogRestaurarEventoProps {
  modulo: BitacoraModulo
  evento: BitacoraEvento | null
  onClose: () => void
  onRestaurado: () => void
}

/** Restaurar información (§12.3): valida antes y crea un evento Restauración. */
export function DialogRestaurarEvento({ modulo, evento, onClose, onRestaurado }: DialogRestaurarEventoProps) {
  return (
    <Dialog open={evento != null} onOpenChange={(next) => !next && onClose()}>
      {evento && (
        <Contenido key={evento.id} modulo={modulo} evento={evento} onClose={onClose} onRestaurado={onRestaurado} />
      )}
    </Dialog>
  )
}

function Contenido({
  modulo,
  evento,
  onClose,
  onRestaurado,
}: DialogRestaurarEventoProps & { evento: BitacoraEvento }) {
  const [motivo, setMotivo] = useState("")
  const [intento, setIntento] = useState(false)
  const restaurar = useRestaurarEvento({ mutationConfig: { onSuccess: onRestaurado } })

  const restauracion = restauracionDe(evento)
  const tipo = "tipo" in restauracion ? restauracion.tipo : ""
  const recuperar = tipo === "Recuperar registro eliminado"
  // Restaurar valor solo si nadie cambió los campos después del evento.
  const sinCambiosDespues = recuperar || evento.cambios.every((c) => c.actual === c.nuevo)
  const puedeRestaurar = sinCambiosDespues

  const largo = motivo.trim().length
  const errorMotivo =
    largo === 0
      ? "El motivo es obligatorio."
      : largo < MOTIVO_MIN
        ? `El motivo debe tener al menos ${MOTIVO_MIN} caracteres.`
        : null

  function handleRestaurar() {
    setIntento(true)
    if (errorMotivo || !puedeRestaurar) return
    restaurar.mutate({ modulo, evento, motivo: motivo.trim() })
  }

  const modulonombre = BITACORA_MODULOS[modulo].nombre

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
          {format(evento.fecha, "dd/MM/yyyy HH:mm")}, {evento.usuario.nombre} ({evento.usuario.rol})
          {evento.sede ? `, ${evento.sede}` : ""}, {evento.accion}
        </Dato>
        <Dato label="Tipo de restauración">
          {tipo} <span className="text-muted-foreground">(lo determina el evento)</span>
        </Dato>
      </dl>

      {!recuperar && (
        <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Campo</TableHead>
                <TableHead>Valor actual</TableHead>
                <TableHead>Se restaurará a</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evento.cambios.map((c) => (
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
          (puedeRestaurar ? "border-border" : "border-red-stroke bg-red-22/40")
        }
      >
        {recuperar ? (
          <Validacion ok>Las dependencias del registro siguen existiendo.</Validacion>
        ) : sinCambiosDespues ? (
          <Validacion ok>El valor actual sigue siendo el que dejó el evento.</Validacion>
        ) : (
          <Validacion ok={false}>
            <span className="font-medium">El valor actual cambió después del evento.</span>
            <span className="block text-muted-foreground">
              Eventos posteriores: {evento.posteriores?.join("; ")}. Revise ese evento antes de restaurar.
            </span>
          </Validacion>
        )}
        {/* Las reglas vigentes las valida el back al restaurar. */}
        <Validacion ok>Se cumplen las reglas vigentes del módulo {modulonombre}.</Validacion>
      </ul>

      <DialogFooter>
        <Button size="sm" variant="outline" color="neutral" onClick={onClose} disabled={restaurar.isPending}>
          Cancelar
        </Button>
        <Button
          size="sm"
          color="primary"
          disabled={!puedeRestaurar || restaurar.isPending}
          onClick={handleRestaurar}
        >
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
