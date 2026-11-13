import { useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CopyIcon } from "@/components/ui/icons"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCopiarEstrategia } from "@/features/gestion-estudiantil/prevencion/api/mutations/estrategias"
import { useOpcionesPeriodosAcademicosQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import { useEstrategiaQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-estrategias-query"
import type { ResumenEstrategia } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import { validarCopia } from "@/features/gestion-estudiantil/prevencion/utils/formularios-estrategias"

interface Props {
  estrategia: ResumenEstrategia
  onClose: () => void
}

/**
 * Copiar estrategia (G.8.EST.5): crea una estrategia nueva con los mismos datos y fechas nuevas. Los
 * beneficiarios que siguen Cursando (`beneficiarios_copiables`, del detalle) entran con la nueva fecha de
 * inicio como ingreso. El Período Académico es opcional: sin él, se queda en el mismo.
 */
export function DialogCopiarEstrategia({ estrategia, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const { establecimientoId } = useAmbitoPrevencion("")
  const detalle = useEstrategiaQuery(estrategia.id, { pageIndex: 0, pageSize: 1 })
  const periodos = useOpcionesPeriodosAcademicosQuery(establecimientoId)

  const [inicio, setInicio] = useState<Date | undefined>()
  const [fin, setFin] = useState<Date | undefined>()
  const [periodo, setPeriodo] = useState("")
  const [conBeneficiarios, setConBeneficiarios] = useState<"vacia" | "traer">("vacia")

  const periodoOpciones = useMemo(
    () => (periodos.data ?? []).map((p) => ({ value: String(p.fk_tperiodo_academico), label: p.nombre })),
    [periodos.data],
  )
  const copiables = detalle.data?.beneficiarios_copiables ?? 0
  const errores = validarCopia({ inicio, fin })
  const err = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const mut = useCopiarEstrategia({
    mutationConfig: {
      onSuccess: () => {
        notify("Estrategia copiada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  function copiar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0 || !inicio) {
      enfocarPrimerError()
      return
    }
    mut.mutate({
      id: estrategia.id,
      FECHA_INICIO: fechaParaBackend(inicio),
      FECHA_FIN: fin ? fechaParaBackend(fin) : null,
      PERIODO_ACADEMICO: periodo ? Number(periodo) : null,
      CON_BENEFICIARIOS: conBeneficiarios === "traer",
    })
  }

  return (
    <DialogoOperacionShell
      titulo={`Copiar estrategia — ${estrategia.nombre}`}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Copiar", icon: <CopyIcon data-icon="inline-start" />, onClick: copiar }}
    >
      <p className="text-sm">Se creará una estrategia nueva con los mismos datos.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("inicio")) || undefined}>
          <FieldLabel htmlFor="copiar-inicio">Fecha de inicio*</FieldLabel>
          <DatePicker id="copiar-inicio" value={inicio} aria-invalid={Boolean(err("inicio")) || undefined} onChange={setInicio} />
          {err("inicio") && <FieldError>{err("inicio")}</FieldError>}
        </Field>
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fin")) || undefined}>
          <FieldLabel htmlFor="copiar-fin">Fecha de fin</FieldLabel>
          <DatePicker
            id="copiar-fin"
            value={fin}
            minDate={inicio}
            aria-invalid={Boolean(err("fin")) || undefined}
            onChange={setFin}
          />
          {err("fin") && <FieldError>{err("fin")}</FieldError>}
        </Field>
        <div className="sm:col-span-2">
          <ComboOpciones
            id="copiar-periodo"
            label="Período Académico"
            size="default"
            todos="El mismo de la estrategia"
            placeholder="El mismo de la estrategia"
            value={periodo}
            options={periodoOpciones}
            onChange={setPeriodo}
          />
        </div>
      </div>
      <Field orientation="vertical" variant="outlined" className="gap-2" role="group" aria-labelledby="copiar-beneficiarios">
        <FieldLabel id="copiar-beneficiarios">Beneficiarios</FieldLabel>
        <RadioGroup
          aria-labelledby="copiar-beneficiarios"
          className="flex flex-col gap-2 px-3.5 py-2"
          value={conBeneficiarios}
          onValueChange={(v) => setConBeneficiarios(v as "vacia" | "traer")}
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="vacia" />
            Empezar vacía
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="traer" disabled={copiables === 0} />
            Traer los {copiables} que siguen Cursando (ingreso {inicio ? formatFecha(fechaParaBackend(inicio)) : "la nueva fecha de inicio"})
          </label>
        </RadioGroup>
      </Field>
    </DialogoOperacionShell>
  )
}
