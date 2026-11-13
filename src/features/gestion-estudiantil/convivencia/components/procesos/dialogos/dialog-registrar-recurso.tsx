import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileTextIcon, InfoIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDateValue } from "@/lib/date-value"

import { useRegistrarRecurso } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import { useOpcionesRecursoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-etapas-query"
import type { EtapaDecision } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-archivo"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { CampoOpcionUnica } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-opcion-unica"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import { hayErrores, validarRecurso, type ValoresRecurso } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  onClose: () => void
}

/** Registrar recurso (G.2.PRD.ETA.4): reposición o apelación; la instancia que resuelve parte de la que decidió en reposición. */
export function DialogRegistrarRecurso({ proceso: p, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const opciones = useOpcionesRecursoQuery(p.id).data
  const presentaciones = useCatalogo("PRESENTACION_RECURSO")
  const decision = p.etapas.decision as EtapaDecision
  const [v, setV] = useState<ValoresRecurso>({ tipo: "", fecha: hoy, presentacion: "", argumentos: "", escrito: [], instancia: "" })
  const [intento, setIntento] = useState(false)
  const set = (patch: Partial<ValoresRecurso>) => setV((prev) => ({ ...prev, ...patch }))

  const tipos = useMemo(() => (opciones?.tipos ?? []).map((t) => ({ value: String(t.fk_tlv), label: t.nombre })), [opciones])
  // Con un solo tipo disponible se elige solo; el resto de valores por defecto se deriva en render, sin efectos.
  const tipo = v.tipo || (tipos.length === 1 ? tipos[0].value : "")
  const codigoTipo = opciones?.tipos.find((t) => String(t.fk_tlv) === tipo)?.codigo
  const esApelacion = codigoTipo === "APELACION"
  const instanciaDecision = opciones?.instancia_decision ? String(opciones.instancia_decision.fk_tlv) : ""
  const opcionesInstancia = useMemo(
    () =>
      (opciones?.instancias ?? [])
        .filter((i) => !esApelacion || String(i.fk_tlv) !== instanciaDecision)
        .map((i) => ({ value: String(i.fk_tlv), label: i.nombre })),
    [opciones, esApelacion, instanciaDecision],
  )
  const instancia = v.instancia || (codigoTipo === "REPOSICION" ? instanciaDecision : "")
  const vv = useMemo(() => ({ ...v, tipo, instancia }), [v, tipo, instancia])
  const desde = opciones?.fecha_notificacion ?? null
  const limite = opciones?.limite ?? null
  const e = useMemo(() => (intento ? validarRecurso(vv, hoy, desde, limite) : {}), [intento, vv, hoy, desde, limite])

  const { error, mutationConfig } = useResultadoEtapa(onClose, "Recurso registrado.")
  const mut = useRegistrarRecurso({ mutationConfig })
  const registrar = () => {
    setIntento(true)
    if (hayErrores(validarRecurso(vv, hoy, desde, limite))) return enfocarPrimerError()
    mut.mutate({
      procesoId: p.id,
      tipo: Number(tipo),
      fecha: v.fecha,
      presentacion: Number(v.presentacion),
      argumentos: v.argumentos,
      escrito: v.escrito[0],
      instancia: Number(instancia),
    })
  }

  return (
    <DialogProcesoShell
      titulo={`Registrar recurso — ${p.estudiante.nombre}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          despues={[
            decision.instancia && `Decisión del ${decision.instancia.nombre}`,
            desde && `Notificación: ${formatFecha(desde)}`,
            limite && `Plazo para recurrir: ${formatFecha(limite)}`,
          ]}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar recurso", icon: <FileTextIcon data-icon="inline-start" />, onClick: registrar, disabled: !opciones }}
    >
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <ComboOpciones
          id="recurso-tipo"
          label="Tipo de recurso"
          required
          size="default"
          todos={false}
          value={tipo}
          options={tipos}
          error={e.tipo}
          onChange={(t) => set({ tipo: t, instancia: "" })}
        />
        <CampoFecha id="recurso-fecha" label="Fecha de presentación" value={v.fecha} min={desde} max={limite && limite < hoy ? limite : hoy} error={e.fecha} onChange={(fecha) => set({ fecha })} />
      </div>
      <CampoOpcionUnica id="recurso-presentado" label="Presentado por" value={v.presentacion} options={presentaciones} error={e.presentacion} onChange={(presentacion) => set({ presentacion })} />
      <TextoLargo id="recurso-argumentos" label="Argumentos" required max={5000} rows={4} value={v.argumentos} error={e.argumentos} onChange={(argumentos) => set({ argumentos })} />
      <CampoArchivo label="Escrito del recurso*" archivos={v.escrito} error={e.escrito} onChange={(escrito) => set({ escrito })} />
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ComboOpciones
            id="recurso-instancia"
            label="Instancia que resuelve"
            required
            size="default"
            todos={false}
            value={instancia}
            options={opcionesInstancia}
            error={e.instancia}
            onChange={(i) => set({ instancia: i })}
          />
        </div>
        <Tooltip>
          <TooltipTrigger render={<span role="img" aria-label="Ayuda: instancia que resuelve" className="mt-3 inline-flex text-muted-foreground" />}>
            <InfoIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>En reposición, la misma que decidió; en apelación, una distinta.</TooltipContent>
        </Tooltip>
      </div>
      <Alert variant="info">
        <InfoIcon aria-hidden="true" />
        <AlertDescription>El proceso pasará a En recurso.</AlertDescription>
      </Alert>
    </DialogProcesoShell>
  )
}
