import { useEffect, useMemo, useState } from "react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"
import { useEstudiantesProcesoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-proceso-apertura-query"
import { nombreDe, useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import type { ProcesoFormState } from "@/features/gestion-estudiantil/convivencia/hooks/use-proceso-form"

const ESPERA_MS = 300

/** Campo de solo lectura con el mismo marco que los demás (origen que llega elegido). */
function CampoLectura({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} readOnly value={value} />
    </Field>
  )
}

/** Estudiante: búsqueda por nombre o documento (o los presuntos agresores del caso); en solo lectura si llega elegido. */
function CampoEstudiante({ form }: { form: ProcesoFormState }) {
  const { v, errores, origen, nombreElegido, elegirEstudiante, estudiantesCaso } = form
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])
  const buscados = useEstudiantesProcesoQuery(origen.desdeCaso || origen.desdeAnotacion ? "" : busqueda)

  const opciones = useMemo(() => {
    const filas = origen.desdeCaso
      ? (estudiantesCaso.data ?? []).map((e) => ({
          id: e.fk_tmatricula,
          label: [e.nombre, e.grado_grupo, e.proceso_numero != null && `ya tiene el proceso ${e.proceso_numero}`].filter(Boolean).join(" · "),
          acudiente: e.acudiente_nombre,
        }))
      : (buscados.data ?? []).map((e) => ({
          id: e.fk_tmatricula,
          label: [e.nombre, e.documento, e.grado_grupo].filter(Boolean).join(" · "),
          acudiente: e.acudiente_nombre,
        }))
    const lista = filas.map((f) => ({ value: String(f.id), label: f.label, acudiente: f.acudiente }))
    // El elegido sigue visible aunque la búsqueda actual ya no lo traiga.
    if (v.matricula && !lista.some((o) => o.value === v.matricula))
      lista.unshift({ value: v.matricula, label: nombreElegido || `Matrícula ${v.matricula}`, acudiente: null })
    return lista
  }, [origen.desdeCaso, estudiantesCaso.data, buscados.data, v.matricula, nombreElegido])

  // Desde una anotación o desde el modal del caso (G.2.CAS.DIS.2) el estudiante ya está elegido: solo lectura.
  if (origen.estudianteFijo) {
    const delCaso = opciones.find((o) => o.value === v.matricula)?.label.split(" · ")[0]
    return <CampoLectura id="proceso-estudiante" label="Estudiante" value={nombreElegido || delCaso || `Matrícula ${v.matricula}`} />
  }

  const placeholder = origen.desdeCaso
    ? estudiantesCaso.isPending
      ? "Cargando…"
      : "Elija el estudiante del caso"
    : "Buscar por nombre o documento"

  return (
    <ComboOpciones
      id="proceso-estudiante"
      label="Estudiante"
      required
      size="default"
      todos={false}
      placeholder={placeholder}
      value={v.matricula}
      options={opciones}
      error={errores.matricula}
      onInputChange={origen.desdeCaso ? undefined : (t) => t !== nombreElegido && setTexto(t)}
      onChange={(value) => {
        const o = opciones.find((x) => x.value === value)
        elegirEstudiante(value, o?.label.split(" · ")[0] ?? "", o?.acudiente)
      }}
    />
  )
}

/** Anotaciones de origen: selección múltiple entre las negativas no anuladas del estudiante. */
function CampoAnotaciones({ form }: { form: ProcesoFormState }) {
  const { v, elegirAnotaciones, origen, origenes, errores } = form
  const sinEstudiante = !v.matricula
  const fijas = origen.desdeAnotacion
  const anotaciones = origenes.data?.anotaciones
  const opciones = useMemo(
    () =>
      (anotaciones ?? [])
        .filter((a) => !fijas || v.anotaciones.includes(a.id))
        .map((a) => ({
          id: a.id,
          label: `${formatFecha(a.fecha)} ${a.codigo} · ${a.codigo_descripcion}`,
        })),
    [anotaciones, fijas, v.anotaciones],
  )
  const placeholder = sinEstudiante
    ? "Elija primero el estudiante"
    : origenes.isPending
      ? "Cargando…"
      : "Seleccione las anotaciones"

  return (
    <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(errores.origen) || undefined}>
      <FieldLabel htmlFor="proceso-anotaciones">Anotaciones de origen{!v.caso && "*"}</FieldLabel>
      <SubjectsMultiSelect
        id="proceso-anotaciones"
        options={opciones}
        value={v.anotaciones}
        placeholder={placeholder}
        emptyMessage="El estudiante no tiene anotaciones negativas disponibles."
        disabled={sinEstudiante || origenes.isPending || fijas}
        onChange={elegirAnotaciones}
      />
      {errores.origen && <FieldError>{errores.origen}</FieldError>}
    </Field>
  )
}

/** Caso de origen: combo del estudiante, o solo lectura cuando el proceso se abre desde un caso. */
function CampoCaso({ form }: { form: ProcesoFormState }) {
  const { v, set, origen, origenes } = form
  const casos = origenes.data?.casos ?? []
  const manifestaciones = useCatalogo("MANIFESTACION_SITUACION")
  const manifestacion = nombreDe(manifestaciones, form.casoOrigen.data?.fk_tlv_manifestacion)
  const etiqueta = (c: { id: number; numero: string; fecha_hechos: string; tipo_nombre: string }) =>
    [c.numero, formatFecha(c.fecha_hechos), c.tipo_nombre, form.casoOrigen.data?.id === c.id ? manifestacion : null].filter(Boolean).join(" · ")
  if (origen.desdeCaso) {
    const c = casos.find((x) => String(x.id) === v.caso)
    return <CampoLectura id="proceso-caso" label="Caso de origen" value={c ? etiqueta(c) : `Caso ${v.caso}`} />
  }
  return (
    <ComboOpciones
      id="proceso-caso"
      label="Caso de origen"
      size="default"
      todos="Ninguno"
      disabled={!v.matricula || origenes.isPending}
      value={v.caso}
      options={casos.map((c) => ({ value: String(c.id), label: etiqueta(c) }))}
      onChange={(caso) => set({ caso })}
    />
  )
}

/** Estudiante y origen del proceso en una fila: los orígenes quedan deshabilitados hasta elegir estudiante. */
export function SeccionEstudianteOrigen({ form }: { form: ProcesoFormState }) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
      <CampoEstudiante form={form} />
      <CampoCaso form={form} />
      <CampoAnotaciones form={form} />
    </div>
  )
}
