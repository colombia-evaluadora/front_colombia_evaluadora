import { useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, FloppyDiskIcon } from "@/components/ui/icons"
import { parseDateValue } from "@/lib/date-value"

import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { fechaParaBackend } from "@/features/gestion-estudiantil/prevencion/utils/formularios"
import {
  subirSoporteReintegracion,
  useModificarIntervencion,
  useRegistrarIntervencion,
} from "@/features/gestion-estudiantil/reintegracion/api/mutations/intervenciones"
import { useOpcionesListaQuery } from "@/features/gestion-estudiantil/reintegracion/api/query/use-opciones-query"
import type { CasoDetalle, IntervencionDetalle, IntervencionInput } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { ResumenCasoDialogo } from "@/features/gestion-estudiantil/reintegracion/components/dialogos/resumen-caso-dialogo"

type Seccion = Exclude<keyof IntervencionInput, "id" | "FK_TIPO" | "FECHA_PROGRAMADA" | "FECHA_REALIZACION" | "FK_RESULTADO" | "EVIDENCIAS">

/** Secciones de la intervención (las mismas de la atención de orientación, §5.2) con su máximo. */
const SECCIONES: { campo: Seccion; label: string; max: number }[] = [
  { campo: "TRABAJO_REALIZADO", label: "Trabajo realizado", max: 3000 },
  { campo: "COMPORTAMIENTO_CASA", label: "Comportamiento en casa", max: 2000 },
  { campo: "RELACION_FAMILIARES", label: "Relación con los familiares", max: 2000 },
  { campo: "ESTRATEGIAS_DISCIPLINARIAS", label: "Estrategias disciplinarias", max: 2000 },
  { campo: "PRUEBAS_APLICADAS", label: "Pruebas aplicadas", max: 1000 },
  { campo: "COMPROMISOS", label: "Compromisos", max: 2000 },
  { campo: "RECOMENDACIONES_FAMILIA", label: "Recomendaciones a la familia", max: 2000 },
  { campo: "RECOMENDACIONES_DOCENTE", label: "Recomendaciones al docente", max: 2000 },
]

const VISITA = "VISITA_DOMICILIARIA"

const ISO = (d: Date) => fechaParaBackend(d)

const MAX_EVIDENCIAS = 5

const textosDe = (i?: IntervencionDetalle) =>
  Object.fromEntries(
    SECCIONES.map((x) => [x.campo, i?.[x.campo.toLowerCase() as Lowercase<Seccion>] ?? ""]),
  ) as Record<Seccion, string>

interface Props {
  caso: CasoDetalle
  onClose: () => void
  /** Con la intervención cargada, el diálogo la modifica (G.9.INT.2) en vez de registrar una nueva. */
  intervencion?: IntervencionDetalle
}

/**
 * Registrar o modificar intervención (§10.3): tipo, fecha programada (obligatoria en una visita domiciliaria),
 * fecha de realización con su resultado y trabajo realizado, las ocho secciones y hasta cinco evidencias por
 * file-service. Al modificar, `EVIDENCIAS` es el conjunto completo: las que se conservan más las nuevas.
 */
export function DialogoIntervencion({ caso: c, onClose, intervencion }: Props) {
  const edita = intervencion != null
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const tipos = useOpcionesListaQuery("TIPO_INTERVENCION").data ?? []
  const resultados = useOpcionesListaQuery("RESULTADO_INTERVENCION").data ?? []

  const [tipo, setTipo] = useState(() => (intervencion ? String(intervencion.tipo.id) : ""))
  const [programada, setProgramada] = useState<Date | undefined>(() =>
    intervencion?.fecha_programada ? parseDateValue(intervencion.fecha_programada.slice(0, 10)) : undefined,
  )
  const [realizacion, setRealizacion] = useState<Date | undefined>(() =>
    intervencion?.fecha_realizacion ? parseDateValue(intervencion.fecha_realizacion.slice(0, 10)) : undefined,
  )
  const [resultado, setResultado] = useState(() => (intervencion?.resultado ? String(intervencion.resultado.id) : ""))
  const [textos, setTextos] = useState<Record<Seccion, string>>(() => textosDe(intervencion))
  const [conservadas, setConservadas] = useState(() => intervencion?.evidencias ?? [])
  const [evidencias, setEvidencias] = useState<File[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const esVisita = tipos.find((t) => String(t.fk_tlista_valor) === tipo)?.valor === VISITA
  const apertura = parseDateValue(c.fecha_apertura.slice(0, 10))
  const hoy = new Date()
  hoy.setHours(23, 59, 59, 999)

  const errores: Partial<Record<"tipo" | "programada" | "realizacion" | "resultado" | "trabajo", string>> = {}
  if (!tipo) errores.tipo = "El tipo de intervención es obligatorio."
  if (esVisita && !programada) errores.programada = "La fecha programada es obligatoria en una visita domiciliaria."
  if (programada && apertura && programada < apertura)
    errores.programada = `La fecha programada no puede ser anterior a la fecha de apertura del caso (${c.fecha_apertura.slice(8, 10)}/${c.fecha_apertura.slice(5, 7)}/${c.fecha_apertura.slice(0, 4)}).`
  if (realizacion && realizacion > hoy) errores.realizacion = "La fecha de realización no puede ser posterior a hoy."
  if (realizacion && !resultado) errores.resultado = "El resultado es obligatorio si hay fecha de realización."
  if (!realizacion && resultado) errores.resultado = "El resultado se registra junto con la fecha de realización."
  if (realizacion) {
    const n = textos.TRABAJO_REALIZADO.trim().length
    if (n < 10 || n > 3000) errores.trabajo = "El trabajo realizado debe tener entre 10 y 3000 caracteres."
  }
  const err = (k: keyof typeof errores) => (s.intento ? errores[k] : undefined)

  const alExito = {
    onSuccess: () => {
      notify(
        edita ? "Intervención actualizada." : realizacion ? "Intervención registrada." : "Intervención programada.",
        { variant: "success" },
      )
      onClose()
    },
    onError: (e: Error) => s.setError(e),
  }
  const registrarMut = useRegistrarIntervencion({ mutationConfig: alExito })
  const modificarMut = useModificarIntervencion({ mutationConfig: alExito })
  const mut = edita ? modificarMut : registrarMut
  const evidenciasCambian = edita && (evidencias.length > 0 || conservadas.length !== intervencion.evidencias.length)

  async function registrar() {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    try {
      setSubiendo(true)
      const ids: number[] = []
      for (const f of evidencias) ids.push(await subirSoporteReintegracion(f))
      const body: IntervencionInput = {
        id: c.id,
        FK_TIPO: Number(tipo),
        FECHA_PROGRAMADA: programada ? ISO(programada) : null,
        FECHA_REALIZACION: realizacion ? ISO(realizacion) : null,
        FK_RESULTADO: resultado ? Number(resultado) : null,
        ...Object.fromEntries(SECCIONES.map((x) => [x.campo, textos[x.campo].trim() || null])),
      }
      if (intervencion) {
        // Sin tocar las evidencias no se envía `EVIDENCIAS`: el backend las conserva.
        modificarMut.mutate({
          ...body,
          intervencion: intervencion.id,
          ...(evidenciasCambian ? { EVIDENCIAS: [...conservadas.map((e) => e.id), ...ids] } : {}),
        })
      } else registrarMut.mutate({ ...body, ...(ids.length > 0 ? { EVIDENCIAS: ids } : {}) })
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <DialogoOperacionShell
      titulo={`${edita ? "Modificar" : "Registrar"} intervención — ${c.estudiante_nombre}`}
      resumen={<ResumenCasoDialogo caso={c} />}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending || subiendo}
      confirmar={{
        label: edita ? "Guardar" : "Registrar",
        icon: edita ? <FloppyDiskIcon data-icon="inline-start" /> : <ControlPointIcon data-icon="inline-start" />,
        onClick: registrar,
      }}
    >
      <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
        <ComboOpciones
          id="intervencion-tipo"
          label="Tipo de intervención"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={tipo}
          options={tipos.map((t) => ({ value: String(t.fk_tlista_valor), label: t.nombre }))}
          error={err("tipo")}
          onChange={setTipo}
        />
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(err("programada")) || undefined}
        >
          <FieldLabel htmlFor="intervencion-programada">Fecha programada{esVisita && "*"}</FieldLabel>
          <DatePicker
            id="intervencion-programada"
            value={programada}
            minDate={apertura}
            aria-invalid={Boolean(err("programada")) || undefined}
            onChange={setProgramada}
          />
          {err("programada") && <FieldError>{err("programada")}</FieldError>}
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="gap-2"
          data-invalid={Boolean(err("realizacion")) || undefined}
        >
          <FieldLabel htmlFor="intervencion-realizacion">Fecha de realización</FieldLabel>
          <DatePicker
            id="intervencion-realizacion"
            value={realizacion}
            maxDate={new Date()}
            aria-invalid={Boolean(err("realizacion")) || undefined}
            onChange={setRealizacion}
          />
          {err("realizacion") && <FieldError>{err("realizacion")}</FieldError>}
        </Field>
        <ComboOpciones
          id="intervencion-resultado"
          label="Resultado"
          required={Boolean(realizacion)}
          size="default"
          todos="Sin resultado"
          placeholder="Sin resultado"
          value={resultado}
          options={resultados.map((r) => ({ value: String(r.fk_tlista_valor), label: r.nombre }))}
          error={err("resultado")}
          onChange={setResultado}
        />
        {SECCIONES.map((x) => (
          <div key={x.campo} className={x.campo === "TRABAJO_REALIZADO" ? "sm:col-span-2" : undefined}>
            <TextoLargo
              id={`intervencion-${x.campo.toLowerCase()}`}
              label={x.label}
              required={x.campo === "TRABAJO_REALIZADO" && Boolean(realizacion)}
              rows={x.campo === "TRABAJO_REALIZADO" ? 4 : 3}
              max={x.max}
              value={textos[x.campo]}
              error={x.campo === "TRABAJO_REALIZADO" ? err("trabajo") : undefined}
              onChange={(v) => setTextos({ ...textos, [x.campo]: v })}
            />
          </div>
        ))}
        <div className="sm:col-span-2">
          {conservadas.length > 0 && (
            <ul className="mb-3 flex flex-col gap-1 text-sm">
              {conservadas.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span className="truncate">{e.nombre}</span>
                  <BotonQuitar
                    label={`Quitar ${e.nombre}`}
                    className="ml-auto"
                    onClick={() => setConservadas((prev) => prev.filter((x) => x.id !== e.id))}
                  />
                </li>
              ))}
            </ul>
          )}
          {conservadas.length < MAX_EVIDENCIAS && (
            <SoportesUpload
              label="Evidencias"
              archivos={evidencias}
              onChange={setEvidencias}
              max={MAX_EVIDENCIAS - conservadas.length}
            />
          )}
        </div>
      </div>
    </DialogoOperacionShell>
  )
}
