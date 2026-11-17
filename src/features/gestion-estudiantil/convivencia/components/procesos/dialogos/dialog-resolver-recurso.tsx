import { useCallback, useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, PencilIcon } from "@/components/ui/icons"
import { formatDateValue } from "@/lib/date-value"

import { useResolverRecurso } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import { useLimitesSancionQuery, useSancionesOpcionesQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-etapas-query"
import type { ProcesoDetalle, RecursoDTO } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { CampoArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-archivo"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { CampoOpcionUnica } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-opcion-unica"
import { ConstructorSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/constructor-sanciones"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import {
  avisoResolucion,
  filaDeSancion,
  hayErrores,
  mensajeResolucion,
  sancionesBody,
  sancionesVigentes,
  unirOpcionesSancion,
  validarResolucion,
  type SancionFila,
  type ValoresResolucion,
} from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  /** El recurso pendiente que se resuelve. */
  recurso: RecursoDTO
  onClose: () => void
}

/** Resolver recurso (G.2.PRD.ETA.5): resultado, motivación, sanciones (precargadas en Modifica) y acto firmado. */
export function DialogResolverRecurso({ proceso: p, recurso: r, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const resultados = useCatalogo("RESULTADO_RECURSO")
  const instancias = useCatalogo("INSTANCIA_DISCIPLINARIA")
  const vigentes = useMemo(() => sancionesVigentes(p), [p])
  const [v, setV] = useState<ValoresResolucion>(() => ({
    fecha: hoy,
    resultado: "",
    motivacion: "",
    sanciones: vigentes.map(filaDeSancion),
    acto: [],
  }))
  const [intento, setIntento] = useState(false)
  const set = useCallback((patch: Partial<ValoresResolucion>) => setV((prev) => ({ ...prev, ...patch })), [])
  const setSanciones = useCallback((sanciones: SancionFila[]) => set({ sanciones }), [set])

  const instanciaResuelve = instancias.find((i) => i.codigo === r.instancia_resuelve.codigo)?.value ?? ""
  const opcionesSancion = useSancionesOpcionesQuery(p.estudiante.fk_tmatricula, instanciaResuelve)
  const catalogo = useMemo(() => unirOpcionesSancion(opcionesSancion.data ?? [], vigentes), [opcionesSancion.data, vigentes])
  const limites = useLimitesSancionQuery(p.id, v.fecha).data
  const codigoResultado = codigoDe(resultados, v.resultado) ?? ""
  const vv = useMemo(() => ({ ...v, resultado: codigoResultado }), [v, codigoResultado])
  const e = useMemo(
    () => (intento ? validarResolucion(vv, catalogo, limites, hoy, r.fecha_presentacion) : {}),
    [intento, vv, catalogo, limites, hoy, r.fecha_presentacion],
  )
  const aviso = avisoResolucion(codigoResultado, r.tipo.codigo, p.acudiente?.nombre ?? "")

  const { error, mutationConfig } = useResultadoEtapa(onClose, mensajeResolucion)
  const mut = useResolverRecurso({ mutationConfig })
  const resolver = () => {
    setIntento(true)
    if (hayErrores(validarResolucion(vv, catalogo, limites, hoy, r.fecha_presentacion))) return enfocarPrimerError()
    mut.mutate({
      recursoId: r.id,
      fecha: v.fecha,
      resultado: Number(v.resultado),
      motivacion: v.motivacion,
      sanciones: codigoResultado === "MODIFICA" ? sancionesBody(v.sanciones, catalogo) : null,
      acto: v.acto[0],
    })
  }

  return (
    <DialogProcesoShell
      titulo={`Resolver recurso — ${p.estudiante.nombre}`}
      resumen={
        <ResumenProceso
          numero={p.numero}
          estado={p.estado}
          despues={[
            `${r.tipo.nombre} del ${formatFecha(r.fecha_presentacion)}, presentada por ${r.presentado_por.nombre.toLowerCase()}`,
            `Resuelve: ${r.instancia_resuelve.nombre}`,
          ]}
        />
      }
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Resolver recurso", icon: <PencilIcon data-icon="inline-start" />, onClick: resolver }}
      className="sm:max-w-3xl"
    >
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
        <CampoFecha id="resolucion-fecha" label="Fecha" value={v.fecha} min={r.fecha_presentacion} max={hoy} error={e.fecha} onChange={(fecha) => set({ fecha })} />
        <CampoOpcionUnica id="resolucion-resultado" label="Resultado" value={v.resultado} options={resultados} error={e.resultado} onChange={(resultado) => set({ resultado })} />
      </div>
      <TextoLargo id="resolucion-motivacion" label="Motivación" required max={5000} rows={4} value={v.motivacion} error={e.motivacion} onChange={(motivacion) => set({ motivacion })} />
      {codigoResultado === "MODIFICA" && (
        <ConstructorSanciones filas={v.sanciones} onChange={setSanciones} catalogo={catalogo} limites={limites} errores={e} intento={intento} obligatorio />
      )}
      <CampoArchivo label="Acto firmado*" archivos={v.acto} error={e.acto} onChange={(acto) => set({ acto })} />
      {aviso && (
        <Alert variant="info">
          <InfoIcon aria-hidden="true" />
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
    </DialogProcesoShell>
  )
}
