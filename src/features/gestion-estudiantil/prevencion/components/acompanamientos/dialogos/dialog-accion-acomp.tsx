import { useEffect, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  subirSoporteAcomp,
  useGuardarAccionAcomp,
} from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import { useOpcionesResponsablesAcompQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { AcompAccion, ResumenAcomp } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { ResumenAcompDialogo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/resumen-acomp"
import {
  ACCION_REMISION,
  ACCION_TEXTO_MAX,
  MOTIVO_REMISION_MAX,
  RESPUESTA_MAX,
  SOPORTES_MAX,
  accionParaBackend,
  validarAccionAcomp,
  valoresAccionDesde,
  type ValoresAccionAcomp,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

interface Props {
  acomp: ResumenAcomp
  /** Con una acción, la edita (el backend no deja editar una con resultado). */
  accion?: AcompAccion | null
  onClose: () => void
}

/**
 * Registrar acción o remisión (G.8.EMB.5 / G.8.CON.4). Con el tipo Remisión externa (código REMISION_EXTERNA)
 * aparecen Entidad, Motivo, Fecha de la remisión (obligatoria solo en consumo) y Respuesta. Hasta 5 soportes.
 */
export function DialogAccionAcomp({ acomp, accion = null, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [v, setV] = useState<ValoresAccionAcomp>(() => valoresAccionDesde(accion))
  const set = (p: Partial<ValoresAccionAcomp>) => setV((prev) => ({ ...prev, ...p }))
  const [archivos, setArchivos] = useState<File[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const tipos = useCatalogo(acomp.tipo === "EMBARAZO" ? "ACCION_ACOMP_EMBARAZO" : "ACCION_ACOMP_CONSUMO")
  const entidades = useCatalogo("ENTIDAD_REMISION")
  const esRemision = codigoDe(tipos, v.tipo) === ACCION_REMISION

  const [buscar, setBuscar] = useState("")
  const responsablesQ = useOpcionesResponsablesAcompQuery({ matricula: acomp.fk_tmatricula, soloOrientacion: false, search: buscar })
  const responsables = useMemo(() => {
    const lista = (responsablesQ.data ?? []).map((r) => ({ value: String(r.fk_tfuncionario), label: r.nombre }))
    if (accion && !lista.some((o) => o.value === String(accion.fk_tfuncionario_responsable)))
      lista.push({ value: String(accion.fk_tfuncionario_responsable), label: accion.responsable_nombre })
    return lista
  }, [responsablesQ.data, accion])
  const actual = responsablesQ.data?.find((r) => r.es_usuario_actual)
  useEffect(() => {
    if (!accion && actual) setV((prev) => (prev.responsable ? prev : { ...prev, responsable: String(actual.fk_tfuncionario) }))
  }, [accion, actual])

  const errores = validarAccionAcomp(acomp.tipo, v, esRemision)
  const error = (k: keyof ValoresAccionAcomp) => (s.intento ? errores[k] : undefined)
  const existentes = accion?.soportes.length ?? 0

  const mut = useGuardarAccionAcomp({
    mutationConfig: {
      onSuccess: () => {
        notify(accion ? "Acción modificada." : "Acción registrada.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = async () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) return enfocarPrimerError()
    try {
      setSubiendo(true)
      // Paso 1 de file-service: cada archivo se reserva y devuelve su pk; luego se envían en SOPORTES.
      const nuevos = await Promise.all(archivos.map((f) => subirSoporteAcomp(f)))
      const ids = [...(accion?.soportes.map((x) => x.fk_tarchivo) ?? []), ...nuevos]
      mut.mutate(accionParaBackend(acomp.id, accion?.id ?? null, v, esRemision, ids))
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <DialogoOperacionShell
      titulo={`${accion ? "Modificar acción" : "Registrar acción o remisión"} — ${acomp.estudiante_nombre}`}
      resumen={<ResumenAcompDialogo a={acomp} />}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending || subiendo}
      className="sm:max-w-3xl"
      confirmar={{ label: accion ? "Guardar" : "Registrar", icon: <FloppyDiskIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ComboOpciones
          id="accion-tipo"
          label="Tipo de acción"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.tipo}
          options={tipos}
          error={error("tipo")}
          onChange={(tipo) => set({ tipo })}
        />
        <CampoFecha
          id="accion-fecha"
          label="Fecha"
          required
          hastaHoy={false}
          value={v.fecha}
          error={error("fecha")}
          onChange={(fecha) => set({ fecha })}
        />
        <ComboOpciones
          id="accion-responsable"
          label="Responsable"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.responsable}
          options={responsables}
          description="Funcionario autorizado de la misma sede y jornada."
          error={error("responsable")}
          onInputChange={setBuscar}
          onChange={(responsable) => set({ responsable })}
        />
        <CampoFecha
          id="accion-plazo"
          label="Plazo"
          hastaHoy={false}
          value={v.plazo}
          error={error("plazo")}
          onChange={(plazo) => set({ plazo })}
        />
      </div>
      <TextoLargo
        id="accion-descripcion"
        label="Descripción"
        required
        max={ACCION_TEXTO_MAX}
        rows={3}
        value={v.descripcion}
        error={error("descripcion")}
        onChange={(descripcion) => set({ descripcion })}
      />
      {esRemision && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ComboOpciones
              id="accion-entidad"
              label="Entidad de remisión"
              required
              size="default"
              todos={false}
              placeholder="Seleccione"
              value={v.entidad}
              options={entidades}
              error={error("entidad")}
              onChange={(entidad) => set({ entidad })}
            />
            <CampoFecha
              id="accion-fecha-remision"
              label="Fecha de la remisión"
              required={acomp.tipo === "CONSUMO"}
              value={v.fechaRemision}
              error={error("fechaRemision")}
              onChange={(fechaRemision) => set({ fechaRemision })}
            />
          </div>
          <TextoLargo
            id="accion-motivo-remision"
            label="Motivo de la remisión"
            required
            max={MOTIVO_REMISION_MAX}
            rows={2}
            value={v.motivo}
            error={error("motivo")}
            onChange={(motivo) => set({ motivo })}
          />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {esRemision && (
          <TextoLargo
            id="accion-respuesta"
            label="Respuesta"
            max={RESPUESTA_MAX}
            rows={2}
            placeholder="Se registra cuando se reciba"
            value={v.respuesta}
            error={error("respuesta")}
            onChange={(respuesta) => set({ respuesta })}
          />
        )}
        <TextoLargo
          id="accion-resultado"
          label="Resultado"
          max={ACCION_TEXTO_MAX}
          rows={2}
          placeholder="Al realizar la acción"
          value={v.resultado}
          error={error("resultado")}
          onChange={(resultado) => set({ resultado })}
        />
      </div>
      <SoportesUpload
        label={`Soportes (${existentes + archivos.length} de ${SOPORTES_MAX}) · PDF, JPG o PNG, máximo 10 MB cada uno`}
        archivos={archivos}
        onChange={setArchivos}
        max={SOPORTES_MAX - existentes}
        disabled={mut.isPending || subiendo}
      />
    </DialogoOperacionShell>
  )
}
