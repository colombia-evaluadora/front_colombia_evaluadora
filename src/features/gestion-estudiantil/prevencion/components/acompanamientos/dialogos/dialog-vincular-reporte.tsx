import { useEffect, useMemo, useState } from "react"

import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useNotify } from "@/components/notice/notice-context"
import { LinkIcon } from "@/components/ui/icons"

import { codigoDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { MarcoOpciones } from "@/features/gestion-estudiantil/commons/components/marco-opciones"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useVincularReporte } from "@/features/gestion-estudiantil/prevencion/api/mutations/acompanamientos"
import {
  useContextoMatriculaQuery,
  useOpcionesAcompAbiertosQuery,
  useOpcionesResponsablesAcompQuery,
} from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { ReporteConsumoRow } from "@/features/gestion-estudiantil/prevencion/api/types"
import { CampoFecha } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-fecha"
import { BadgeEstadoReporteConsumo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"
import { BloqueContexto } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/bloque-contexto"
import { CamposConsumo } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/form/campos-acompanamiento"
import { DialogoDuplicado } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/form/dialogo-duplicado"
import {
  TEXTO_ACOMP_MAX,
  consumoParaBackend,
  validarAcomp,
  valoresAcompVacios,
  type ValoresAcomp,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"

const VINCULAR = "VINCULAR"
const ABRIR = "ABRIR"
const aOpciones = (l: { value: string; label: string }[]) => l.map((o) => ({ value: o.value, label: o.label }))

/**
 * Vincular reporte (G.8.CON.7): a un acompañamiento por consumo abierto del mismo estudiante o a uno nuevo (con
 * los campos del formulario de consumo). Sin abiertos solo se ofrece abrir uno. El reporte queda Atendido.
 */
export function DialogVincularReporte({ reporte, onClose }: { reporte: ReporteConsumoRow; onClose: () => void }) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const destinos = useCatalogo("DESTINO_REPORTE_CONSUMO")
  const abiertosQ = useOpcionesAcompAbiertosQuery(reporte.fk_tmatricula)
  const abiertos = abiertosQ.data ?? []
  const hayAbiertos = abiertos.length > 0

  const [destino, setDestino] = useState("")
  // Sin abiertos solo se puede abrir uno nuevo; con abiertos, vincular es la opción natural.
  useEffect(() => {
    if (abiertosQ.isSuccess && !destino) setDestino(hayAbiertos ? VINCULAR : ABRIR)
  }, [abiertosQ.isSuccess, hayAbiertos, destino])
  const [acomp, setAcomp] = useState("")
  const contextoQ = useContextoMatriculaQuery(reporte.fk_tmatricula, destino === ABRIR)

  // Datos del acompañamiento nuevo: el reporte ya trae la fecha y su texto como punto de partida.
  const [v, setV] = useState<ValoresAcomp>(() => ({
    ...valoresAcompVacios(),
    fechaConocimiento: new Date(`${reporte.fecha_conocimiento.slice(0, 10)}T00:00:00`),
  }))
  const set = (p: Partial<ValoresAcomp>) => setV((prev) => ({ ...prev, ...p }))
  const origenes = useCatalogo("ORIGEN_INFO_CONSUMO")
  const sustancias = useCatalogo("SUSTANCIA_CONSUMO")
  const lugares = useCatalogo("LUGAR_CONSUMO")
  const codigos = { sustancia: codigoDe(sustancias, v.sustancia), lugar: codigoDe(lugares, v.lugar) }
  const responsablesQ = useOpcionesResponsablesAcompQuery({ matricula: reporte.fk_tmatricula, soloOrientacion: true }, destino === ABRIR)
  const responsables = useMemo(
    () => (responsablesQ.data ?? []).map((r) => ({ value: String(r.fk_tfuncionario), label: r.nombre })),
    [responsablesQ.data],
  )
  const actual = responsablesQ.data?.find((r) => r.es_usuario_actual)
  useEffect(() => {
    if (actual) setV((prev) => (prev.responsable ? prev : { ...prev, responsable: String(actual.fk_tfuncionario) }))
  }, [actual])

  const erroresNuevo = destino === ABRIR ? validarAcomp("CONSUMO", { ...v, estudiante: String(reporte.fk_tmatricula) }, codigos) : {}
  const errorDestino = !destino ? "Seleccione el destino del reporte." : undefined
  const errorAcomp = destino === VINCULAR && !acomp ? "Seleccione el acompañamiento abierto." : undefined
  const error = (k: keyof ValoresAcomp) => (s.intento ? erroresNuevo[k] : undefined)

  const [duplicado, setDuplicado] = useState<string | null>(null)
  const mut = useVincularReporte({
    mutationConfig: {
      onSuccess: () => {
        notify("Reporte vinculado: queda Atendido.", { variant: "success" })
        onClose()
      },
      onError: (e: Error) => {
        if (destino === ABRIR && isConflictError(e)) setDuplicado(getErrorMessage(e))
        else s.setError(e)
      },
    },
  })

  const enviar = (crearDeTodosModos = false) => {
    s.setIntento(true)
    s.setError(null)
    if (errorDestino || errorAcomp || Object.keys(erroresNuevo).length > 0) return enfocarPrimerError()
    setDuplicado(null)
    if (destino === VINCULAR) mut.mutate({ id: reporte.id, DESTINO: VINCULAR, ACOMPANAMIENTO: Number(acomp) })
    else
      mut.mutate({ id: reporte.id, DESTINO: ABRIR, CREAR_DE_TODOS_MODOS: crearDeTodosModos, ...consumoParaBackend(v, codigos) })
  }

  return (
    <>
      <DialogoOperacionShell
        titulo={`Vincular reporte — ${reporte.estudiante_nombre}`}
        resumen={
          <span className="flex flex-wrap items-center gap-2">
            Reporte del {formatFecha(reporte.fecha_conocimiento)} de {abreviarPersona(reporte.reportado_por) || "—"} ·
            <BadgeEstadoReporteConsumo estado={reporte.estado} nombre={reporte.estado_nombre} />· {reporte.grado_grupo}
          </span>
        }
        onClose={onClose}
        error={s.error}
        pending={mut.isPending}
        className="sm:max-w-3xl"
        confirmar={{ label: "Vincular reporte", icon: <LinkIcon data-icon="inline-start" />, onClick: () => enviar(false) }}
      >
        <MarcoOpciones
          id="vincular-destino"
          label="Destino del reporte"
          required
          error={s.intento ? errorDestino : undefined}
        >
          <RadioGroup
            aria-labelledby="vincular-destino-label"
            className="flex-col items-start"
            value={destino}
            onValueChange={(d) => setDestino(String(d))}
          >
            {destinos.map((d) => (
              <label key={d.value} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={d.codigo} disabled={d.codigo === VINCULAR && !hayAbiertos} />
                {d.label}
              </label>
            ))}
          </RadioGroup>
        </MarcoOpciones>

        {destino === VINCULAR && (
          <ComboOpciones
            id="vincular-acompanamiento"
            label="Acompañamiento abierto"
            required
            size="default"
            todos={false}
            placeholder="Seleccione"
            value={acomp}
            options={abiertos.map((a) => ({
              value: String(a.id),
              label: `Acompañamiento por consumo · abierto el ${formatFecha(a.fecha_conocimiento)} · ${a.estado_nombre} · ${abreviarPersona(a.responsable_nombre)}`,
            }))}
            description="Solo acompañamientos por consumo de este estudiante en estado Abierto o En seguimiento."
            error={s.intento ? errorAcomp : undefined}
            onChange={setAcomp}
          />
        )}

        {destino === ABRIR && (
          <div className="flex flex-col gap-4">
            <BloqueContexto contexto={contextoQ.data ?? null} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CampoFecha
                id="vincular-fecha-conocimiento"
                label="Fecha de conocimiento"
                required
                value={v.fechaConocimiento}
                error={error("fechaConocimiento")}
                onChange={(fechaConocimiento) => set({ fechaConocimiento })}
              />
              <ComboOpciones
                id="vincular-responsable"
                label="Responsable"
                required
                size="default"
                todos={false}
                placeholder="Seleccione"
                value={v.responsable}
                options={responsables}
                error={error("responsable")}
                onChange={(responsable) => set({ responsable })}
              />
            </div>
            <CamposConsumo
              f={{
                v,
                set,
                error,
                codigos,
                listas: { origenes: aOpciones(origenes), sustancias: aOpciones(sustancias), lugares: aOpciones(lugares) },
              }}
            />
            <TextoLargo
              id="vincular-descripcion"
              label="Descripción de lo observado o informado"
              required
              max={TEXTO_ACOMP_MAX}
              rows={3}
              value={v.descripcion}
              error={error("descripcion")}
              onChange={(descripcion) => set({ descripcion })}
            />
            <TextoLargo
              id="vincular-acuerdos"
              label="Necesidades y acuerdos de continuidad educativa"
              max={TEXTO_ACOMP_MAX}
              rows={3}
              value={v.acuerdos}
              error={error("acuerdos")}
              onChange={(acuerdos) => set({ acuerdos })}
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          El reporte original se conserva sin cambios y queda Atendido. El Responsable de enseñanza solo verá el estado, no
          el expediente.
        </p>
      </DialogoOperacionShell>
      {duplicado && (
        <DialogoDuplicado
          mensaje={duplicado}
          tipo="CONSUMO"
          matricula={reporte.fk_tmatricula}
          pending={mut.isPending}
          onClose={() => setDuplicado(null)}
          onCrear={() => enviar(true)}
        />
      )}
    </>
  )
}
