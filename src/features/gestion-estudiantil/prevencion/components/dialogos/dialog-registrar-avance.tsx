import { useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { parseDateValue } from "@/lib/date-value"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useRegistrarAvance } from "@/features/gestion-estudiantil/prevencion/api/mutations/planes"
import { usePlanQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-valoraciones-query"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { DESCRIPCION_MAX, validarAvance } from "@/features/gestion-estudiantil/prevencion/utils/formularios-seguimiento"

interface Props {
  planId: number
  estudianteNombre: string
  /** Acción preseleccionada (desde la fila de una acción del detalle). */
  accionId?: number
  onClose: () => void
}

const recortar = (t: string, n = 40) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

/** Registrar avance (G.8.VAL.6): acción no cumplida, fecha, descripción y «Acción cumplida». */
export function DialogRegistrarAvance({ planId, estudianteNombre, accionId, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const plan = usePlanQuery(planId)
  const [accion, setAccion] = useState(accionId != null ? String(accionId) : "")
  const [fecha, setFecha] = useState<Date | undefined>(() => new Date())
  const [descripcion, setDescripcion] = useState("")
  const [cumplida, setCumplida] = useState(false)

  const opciones = useMemo(
    () =>
      (plan.data?.acciones ?? [])
        .filter((a) => a.estado !== "CUMPLIDA" && a.puede_registrar_avance)
        .map((a) => ({ value: String(a.id), label: `${a.tipo_nombre} · ${recortar(a.descripcion)}` })),
    [plan.data],
  )

  const mut = useRegistrarAvance({
    mutationConfig: {
      onSuccess: () => {
        notify("Avance registrado.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })
  const errores = validarAvance({ accion, fecha, descripcion }, plan.data?.fecha_inicio ?? null)
  const err = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !fecha) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: Number(accion), FECHA: fechaParaBackend(fecha), DESCRIPCION: descripcion, CUMPLIDA: cumplida })
  }

  return (
    <DialogoOperacionShell
      titulo={`Registrar avance — ${estudianteNombre}`}
      onClose={onClose}
      error={s.error ?? (plan.isError ? plan.error : null)}
      pending={mut.isPending}
      confirmar={{
        label: "Registrar",
        icon: <ControlPointIcon data-icon="inline-start" />,
        onClick: registrar,
        disabled: !plan.data,
      }}
    >
      {!plan.data ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <div className="sm:col-span-3">
            <ComboOpciones
              id="avance-accion"
              label="Acción"
              required
              size="default"
              todos={false}
              placeholder="Seleccione"
              value={accion}
              options={opciones}
              error={err("accion")}
              onChange={setAccion}
            />
          </div>
          <div className="sm:col-span-2">
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fecha")) || undefined}>
              <FieldLabel htmlFor="avance-fecha">Fecha*</FieldLabel>
              <DatePicker
                id="avance-fecha"
                value={fecha}
                minDate={parseDateValue(plan.data.fecha_inicio)}
                maxDate={new Date()}
                aria-invalid={Boolean(err("fecha")) || undefined}
                onChange={setFecha}
              />
              {err("fecha") && <FieldError>{err("fecha")}</FieldError>}
            </Field>
          </div>
          <div className="sm:col-span-5">
            <TextoLargo
              id="avance-descripcion"
              label="Descripción del avance"
              required
              max={DESCRIPCION_MAX}
              placeholder="Qué se hizo en esta acción"
              value={descripcion}
              error={err("descripcion")}
              onChange={setDescripcion}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-5">
            <Checkbox checked={cumplida} onCheckedChange={(v) => setCumplida(v === true)} />
            Acción cumplida
          </label>
        </div>
      )}
    </DialogoOperacionShell>
  )
}
