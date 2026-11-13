import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ClipboardCheckIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { useOpcionesCascada } from "@/features/gestion-estudiantil/commons/hooks/use-opciones-cascada"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { useMarcarSimpade } from "@/features/gestion-estudiantil/reintegracion/api/mutations/casos"
import { useOpcionesFuncionariosQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"

/**
 * Marcar como ingresado al SIMPADE: fecha de ingreso (no posterior a hoy) y Digitado por, que por defecto es
 * quien marca. Quien puede marcarla la corrige con la misma acción.
 */
export function DialogoSimpade({ caso: c, onClose }: { caso: CasoDetalle; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const { establecimientoId } = useOpcionesCascada("", "")
  const funcionarios = useOpcionesFuncionariosQuery({ establecimiento: establecimientoId }).data ?? []
  const [fecha, setFecha] = useState<Date | undefined>(() =>
    c.simpade ? parseDateValue(c.simpade.fecha_ingreso.slice(0, 10)) : new Date(),
  )
  const [digitado, setDigitado] = useState(c.simpade ? String(c.simpade.fk_tusuario) : "")
  const corrige = c.simpade != null

  const mut = useMarcarSimpade({
    mutationConfig: {
      onSuccess: () => {
        notify(corrige ? "Ingreso al SIMPADE corregido." : "Caso marcado como ingresado al SIMPADE.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)
  const errorFecha = !fecha
    ? "La fecha de ingreso es obligatoria."
    : fecha > hoy
      ? "La fecha de ingreso no puede ser posterior a hoy."
      : undefined

  function marcar() {
    s.setIntento(true)
    s.setError(null)
    if (errorFecha || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: c.id, FECHA: fechaParaBackend(fecha), FK_DIGITADO_POR: digitado ? Number(digitado) : null })
  }

  return (
    <DialogoOperacionShell
      titulo={`Marcar como ingresado al SIMPADE — ${c.estudiante_nombre}`}
      resumen={
        <div className="flex flex-col gap-1 text-sm">
          <span>Acta de retiro: {c.acta ? `N.º ${c.acta.numero}` : "aún sin generar"}</span>
          <span>Retiro de la matrícula: {c.retiro ? formatFecha(c.retiro.fecha_retiro) : "sin retiro"}</span>
        </div>
      }
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{
        label: corrige ? "Corregir ingreso" : "Marcar como ingresado",
        icon: <ClipboardCheckIcon data-icon="inline-start" />,
        onClick: marcar,
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(s.intento && errorFecha) || undefined}
        >
          <FieldLabel htmlFor="simpade-fecha">Fecha de ingreso*</FieldLabel>
          <DatePicker
            id="simpade-fecha"
            value={fecha}
            maxDate={new Date()}
            aria-invalid={Boolean(s.intento && errorFecha) || undefined}
            onChange={setFecha}
          />
          {s.intento && errorFecha && <FieldError>{errorFecha}</FieldError>}
        </Field>
        <ComboOpciones
          id="simpade-digitado"
          label="Digitado por"
          size="default"
          todos="Quien marca (por defecto)"
          placeholder="Quien marca (por defecto)"
          value={digitado}
          options={funcionarios.map((f) => ({ value: String(f.fk_tusuario), label: f.nombre }))}
          onChange={setDigitado}
        />
      </div>
    </DialogoOperacionShell>
  )
}
