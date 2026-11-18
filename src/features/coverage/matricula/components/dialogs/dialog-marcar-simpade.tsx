import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { ClipboardCheckIcon } from "@/components/ui/icons"
import { useUser } from "@/lib/auth"
import { formatDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { useOpcionesFuncionariosQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import { useMarcarSimpadeMatricula } from "@/features/coverage/matricula/api/mutations/marcar-simpade"
import type { Matricula } from "@/features/coverage/matricula/api/types/matricula"

const formatFecha = (iso: string) => iso.split("-").reverse().join("/")

/**
 * Marcar como ingresado al SIMPADE (C.1.LIS.3b / RET.5): retiro por traslado.
 * Mismo modal que el de Reintegración (dialogo-simpade.tsx), pero aquí «Digitado
 * por» es obligatorio y arranca en el usuario actual.
 */
export function DialogMarcarSimpade({ matricula, onClose }: { matricula: Matricula; onClose: () => void }) {
  const { notify } = useNotify()
  const { data: user } = useUser()
  const { establecimientoId } = useOpcionesCascada("", "")
  const funcionarios = useOpcionesFuncionariosQuery({ establecimiento: establecimientoId }).data ?? []
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [elegido, setElegido] = useState<string | null>(null)
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const nombre = `${matricula.firstName} ${matricula.lastName}`
  const retiro = matricula.retiroTraslado

  // Por defecto, el funcionario del usuario actual (por nombre: el token no trae su id).
  const propio = funcionarios.find((f) => user?.name && f.nombre.toLowerCase() === user.name.toLowerCase())
  const digitado = elegido ?? (propio ? String(propio.fk_tfuncionario) : "")

  const mut = useMarcarSimpadeMatricula({
    mutationConfig: {
      onSuccess: () => {
        notify(`El retiro de ${nombre} quedó marcado como ingresado al SIMPADE.`, { variant: "success" })
        onClose()
      },
      onError: (e: Error) => setError(e),
    },
  })

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  const errorFecha = !fecha
    ? "La fecha de ingreso es obligatoria."
    : fecha > hoy
      ? "La fecha de ingreso no puede ser posterior a hoy."
      : undefined
  const errorDigitado = digitado ? undefined : "Elija quién lo digitó."

  function marcar() {
    setIntento(true)
    setError(null)
    if (errorFecha || errorDigitado || !fecha) return
    mut.mutate({ matriculaId: matricula.id, fechaIngreso: formatDateValue(fecha), funcionarioId: Number(digitado) })
  }

  return (
    <DialogoOperacionShell
      titulo={`Marcar como ingresado al SIMPADE — ${nombre}`}
      resumen={
        <span className="text-sm">
          Acta de retiro: N.º {retiro?.acta || "—"} · Retiro por traslado del {retiro?.fecha ? formatFecha(retiro.fecha) : "—"}
        </span>
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Marcar como ingresado", icon: <ClipboardCheckIcon data-icon="inline-start" />, onClick: marcar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field variant="outlined" className="gap-2" data-invalid={Boolean(intento && errorFecha) || undefined}>
          <FieldLabel htmlFor="simpade-fecha">
            Fecha de ingreso<span data-required-mark="">*</span>
          </FieldLabel>
          <DatePicker
            id="simpade-fecha"
            mode="date"
            value={fecha}
            maxDate={new Date()}
            aria-invalid={Boolean(intento && errorFecha) || undefined}
            onChange={setFecha}
          />
          {intento && errorFecha ? <FieldError>{errorFecha}</FieldError> : <FieldDescription>No posterior a hoy.</FieldDescription>}
        </Field>
        <ComboOpciones
          id="simpade-digitado"
          label="Digitado por"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={digitado}
          options={funcionarios.map((f) => ({ value: String(f.fk_tfuncionario), label: f.nombre }))}
          onChange={setElegido}
          error={intento ? errorDigitado : undefined}
        />
      </div>
    </DialogoOperacionShell>
  )
}
