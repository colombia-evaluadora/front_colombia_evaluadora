import { useCallback, useMemo, useState } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field"
import { GavelIcon } from "@/components/ui/icons"
import { formatDateValue } from "@/lib/date-value"

import { useRegistrarDecision } from "@/features/gestion-estudiantil/convivencia/api/mutations/procesos-etapas"
import { useLimitesSancionQuery, useSancionesOpcionesQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-etapas-query"
import type { EtapaDescargos } from "@/features/gestion-estudiantil/convivencia/api/procesos-detalle-types"
import type { ProcesoDetalle } from "@/features/gestion-estudiantil/convivencia/api/procesos-types"
import { formatFecha } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/convivencia/api/validaciones"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { CampoArchivo } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-archivo"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { CampoOpcionUnica } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-opcion-unica"
import { ConstructorSanciones } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/constructor-sanciones"
import { DialogProcesoShell, ResumenProceso } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/dialog-proceso-shell"
import { useResultadoEtapa } from "@/features/gestion-estudiantil/convivencia/hooks/use-resultado-etapa"
import {
  hayErrores,
  mensajeDecision,
  sancionesBody,
  validarDecision,
  type SancionFila,
  type ValoresDecision,
} from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  proceso: ProcesoDetalle
  onClose: () => void
}

/** Registrar decisión (G.2.PRD.ETA.2): instancia, resultado, cargos probados, motivación, sanciones y acto firmado. */
export function DialogRegistrarDecision({ proceso: p, onClose }: Props) {
  const [hoy] = useState(() => formatDateValue(new Date()))
  const descargos = p.etapas.descargos as EtapaDescargos
  const cargos = p.etapas.apertura.cargos
  const instancias = useCatalogo("INSTANCIA_DISCIPLINARIA")
  const resultados = useCatalogo("RESULTADO_DISCIPLINARIO")
  const [v, setV] = useState<ValoresDecision>({
    fecha: hoy,
    instancia: "",
    resultado: "",
    cargos: cargos.map((c) => c.id),
    motivacion: "",
    sanciones: [],
    acto: [],
  })
  const [intento, setIntento] = useState(false)
  const set = useCallback((patch: Partial<ValoresDecision>) => setV((prev) => ({ ...prev, ...patch })), [])
  const setSanciones = useCallback((sanciones: SancionFila[]) => set({ sanciones }), [set])

  const opcionesSancion = useSancionesOpcionesQuery(p.estudiante.fk_tmatricula, v.instancia)
  const catalogo = useMemo(() => opcionesSancion.data ?? [], [opcionesSancion.data])
  const limites = useLimitesSancionQuery(p.id, v.fecha).data
  const resultadoCodigo = codigoDe(resultados, v.resultado)
  const sanciona = resultadoCodigo === "SANCIONAR"
  const vv = useMemo(() => ({ ...v, resultado: resultadoCodigo ?? "" }), [v, resultadoCodigo])
  const e = useMemo(
    () => (intento ? validarDecision(vv, catalogo, limites, hoy, descargos.fecha ?? null) : {}),
    [intento, vv, catalogo, limites, hoy, descargos.fecha],
  )

  const { error, mutationConfig } = useResultadoEtapa(onClose, mensajeDecision)
  const mut = useRegistrarDecision({ mutationConfig })

  const registrar = () => {
    setIntento(true)
    if (hayErrores(validarDecision(vv, catalogo, limites, hoy, descargos.fecha ?? null))) return enfocarPrimerError()
    mut.mutate({
      procesoId: p.id,
      fecha: v.fecha,
      instancia: Number(v.instancia),
      resultado: Number(v.resultado),
      cargosProbados: sanciona ? v.cargos : null,
      motivacion: v.motivacion,
      sanciones: sanciona ? sancionesBody(v.sanciones, catalogo) : null,
      acto: v.acto[0],
    })
  }

  const alternarCargo = (id: number, marcado: boolean) =>
    set({ cargos: marcado ? [...v.cargos, id] : v.cargos.filter((c) => c !== id) })

  return (
    <DialogProcesoShell
      titulo={`Registrar decisión — ${p.estudiante.nombre}`}
      resumen={<ResumenProceso numero={p.numero} estado={p.estado} despues={[descargos.fecha && `Descargos: ${formatFecha(descargos.fecha)}`]} />}
      onClose={onClose}
      error={error}
      pending={mut.isPending}
      confirmar={{ label: "Registrar decisión", icon: <GavelIcon data-icon="inline-start" />, onClick: registrar }}
      className="sm:max-w-3xl"
    >
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3">
        <CampoFecha id="decision-fecha" label="Fecha de la decisión" value={v.fecha} min={descargos.fecha} max={hoy} error={e.fecha} onChange={(fecha) => set({ fecha })} />
        <ComboOpciones
          id="decision-instancia"
          label="Instancia que decide"
          required
          size="default"
          todos={false}
          value={v.instancia}
          options={instancias}
          error={e.instancia}
          onChange={(instancia) => set({ instancia, sanciones: [] })}
        />
        <CampoOpcionUnica id="decision-resultado" label="Resultado" value={v.resultado} options={resultados} error={e.resultado} onChange={(resultado) => set({ resultado })} />
      </div>
      {sanciona && (
        <FieldSet data-invalid={Boolean(e.cargos) || undefined}>
          <FieldLegend variant="label">Cargos probados*</FieldLegend>
          <ul className="flex flex-col gap-2">
            {cargos.map((c) => (
              <li key={c.id}>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={v.cargos.includes(c.id)} onCheckedChange={(m) => alternarCargo(c.id, m === true)} />
                  <span>
                    <span className="font-medium">
                      {c.orden}. {c.codigo} · {c.codigo_descripcion}
                    </span>
                    <span className="text-muted-foreground"> · {c.clasificacion_nombre}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {e.cargos && <FieldError>{e.cargos}</FieldError>}
        </FieldSet>
      )}
      <TextoLargo id="decision-motivacion" label="Motivación" required max={5000} rows={4} value={v.motivacion} error={e.motivacion} onChange={(motivacion) => set({ motivacion })} />
      {sanciona && (
        <ConstructorSanciones
          filas={v.sanciones}
          onChange={setSanciones}
          catalogo={catalogo}
          limites={limites}
          errores={e}
          intento={intento}
          obligatorio
        />
      )}
      <CampoArchivo label="Acto de decisión firmado*" archivos={v.acto} error={e.acto} onChange={(acto) => set({ acto })} />
    </DialogProcesoShell>
  )
}

