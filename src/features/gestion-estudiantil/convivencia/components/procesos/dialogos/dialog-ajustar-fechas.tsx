import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarBlankIcon, InfoIcon } from "@/components/ui/icons"
import { formatDateValue } from "@/lib/date-value"

import { useAjustarFechas } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import { useLimitesSancionQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-etapas-query"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import { estaPendiente, hayErrores, mensajeAjuste, type Errores, sancionesVigentes, validarAjuste } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  /** Sanción a ajustar; sin ella se elige entre las pendientes con duración. */
  sancionId?: number
  onClose: () => void
}

/** Ajustar fechas — [Sanción] (G.2.PRD.CUM.2): nuevas fechas de inicio y fin, acotadas por el fin del período. */
export function DialogAjustarFechas({ proceso: p, sancionId, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const candidatas = useMemo(
    () => sancionesVigentes(p).filter((s) => s.tiene_duracion && estaPendiente(s) && (sancionId == null || s.id === sancionId)),
    [p, sancionId],
  )
  const [elegida, setElegida] = useState("")
  const [edicion, setEdicion] = useState<{ id: string; inicio: string; fin: string } | null>(null)
  const [intento, setIntento] = useState(false)
  const idSancion = elegida || (candidatas.length === 1 ? String(candidatas[0].id) : "")
  const sancion = candidatas.find((s) => String(s.id) === idSancion)
  // Las fechas arrancan en las vigentes de la sanción elegida; lo que se teclea las reemplaza.
  const inicio = edicion?.id === idSancion ? edicion.inicio : (sancion?.fecha_inicio ?? "")
  const fin = edicion?.id === idSancion ? edicion.fin : (sancion?.fecha_fin ?? "")
  const limites = useLimitesSancionQuery(p.id, hoy).data
  const opciones = useMemo(() => candidatas.map((s) => ({ value: String(s.id), label: s.nombre })), [candidatas])
  const e = useMemo(
    (): Errores => (intento ? { ...validarAjuste(inicio, fin, limites), ...(idSancion ? {} : { sancion: "Elija la sanción." }) } : {}),
    [intento, inicio, fin, limites, idSancion],
  )

  const { error, mutationConfig } = useResultadoEtapa(onClose, mensajeAjuste)
  const mut = useAjustarFechas({ mutationConfig })
  const ajustar = () => {
    setIntento(true)
    if (!idSancion || hayErrores(validarAjuste(inicio, fin, limites))) return enfocarPrimerError()
    mut.mutate({ sancionId: Number(idSancion), inicio, fin })
  }

  return (
    <DialogProcesoShell
      titulo={`Ajustar fechas — ${sancion?.nombre ?? "sanción"}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          antes={[p.estudiante.nombre]}
          despues={[
            p.fecha_en_firme && `En firme desde el ${formatFecha(p.fecha_en_firme)}`,
            sancion?.fecha_inicio && sancion.fecha_fin && `Fechas anteriores: ${formatFecha(sancion.fecha_inicio)} a ${formatFecha(sancion.fecha_fin)}`,
          ]}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Ajustar fechas", icon: <CalendarBlankIcon data-icon="inline-start" />, onClick: ajustar }}
      className="sm:max-w-lg"
    >
      {candidatas.length !== 1 && (
        <ComboOpciones id="ajuste-sancion" label="Sanción" required size="default" todos={false} value={idSancion} options={opciones} error={e.sancion} onChange={setElegida} />
      )}
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <CampoFecha id="ajuste-inicio" label="Fecha de inicio" value={inicio} error={e.inicio} onChange={(v) => setEdicion({ id: idSancion, inicio: v, fin })} />
        <CampoFecha id="ajuste-fin" label="Fecha de fin" value={fin} min={inicio || null} max={limites?.fin_maximo} error={e.fin} onChange={(v) => setEdicion({ id: idSancion, inicio, fin: v })} />
      </div>
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>Se avisará a {p.acudiente?.nombre ?? "el acudiente"} de las nuevas fechas.</AlertDescription>
      </Alert>
    </DialogProcesoShell>
  )
}
