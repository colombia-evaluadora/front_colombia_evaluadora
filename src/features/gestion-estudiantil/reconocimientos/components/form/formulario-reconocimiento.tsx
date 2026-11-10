import { useEffect, useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { SoportesUpload } from "@/features/gestion-estudiantil/commons/components/soportes-upload"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import {
  useActividadesOpcionesQuery,
  useOpcionesOtorgantesQuery,
} from "@/features/gestion-estudiantil/reconocimientos/api/query/use-opciones-reconocimiento-query"
import type { ReconocimientoDetalle } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import {
  CampoEstudiantes,
  EstudianteFijo,
} from "@/features/gestion-estudiantil/reconocimientos/components/form/campo-estudiantes"
import type { useReconocimientoForm } from "@/features/gestion-estudiantil/reconocimientos/hooks/use-reconocimiento-form"
import { MOTIVO_MAX } from "@/features/gestion-estudiantil/reconocimientos/utils/formularios"

const ESPERA_MS = 300

interface Props {
  form: ReturnType<typeof useReconocimientoForm>
  establecimiento: number | null
  /** Con qué se llena el formulario: decide el estudiante (varios o fijo) y el tipo (libre o fijo). */
  modo: "nuevo" | "modificar" | "otorgar"
  /** Nombre del estudiante fijo (modificar y otorgar). */
  estudianteNombre?: string
  /** El reconocimiento que se modifica: trae la actividad y el soporte actuales. */
  detalle?: ReconocimientoDetalle
}

/** Campos del reconocimiento (G.6.OTO.1), compartidos por Nuevo, Modificar y Otorgar sugerencia. */
export function FormularioReconocimiento({ form, establecimiento, modo, estudianteNombre, detalle }: Props) {
  const { valores: v, set, errores, intento } = form
  const err = (c: keyof typeof errores) => (intento ? errores[c] : undefined)

  const tipos = useCatalogo("TIPO_RECONOCIMIENTO")
  const tipoOpciones = useMemo(() => tipos.map((t) => ({ value: t.value, label: t.label })), [tipos])

  const [textoOtorgante, setTextoOtorgante] = useState("")
  const [busquedaOtorgante, setBusquedaOtorgante] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusquedaOtorgante(textoOtorgante), ESPERA_MS)
    return () => clearTimeout(t)
  }, [textoOtorgante])
  const otorgantes = useOpcionesOtorgantesQuery({ establecimiento, search: busquedaOtorgante })
  const otorganteOpciones = useMemo(() => {
    const lista = (otorgantes.data ?? []).map((o) => ({ value: String(o.fk_tfuncionario), label: o.nombre }))
    if (detalle && !lista.some((o) => o.value === String(detalle.fk_tfuncionario_otorga)))
      lista.unshift({ value: String(detalle.fk_tfuncionario_otorga), label: detalle.otorgado_por })
    return lista
  }, [otorgantes.data, detalle])

  const [textoActividad, setTextoActividad] = useState("")
  const [busquedaActividad, setBusquedaActividad] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusquedaActividad(textoActividad), ESPERA_MS)
    return () => clearTimeout(t)
  }, [textoActividad])
  const actividades = useActividadesOpcionesQuery({ search: busquedaActividad })
  const actividadOpciones = useMemo(() => {
    const lista = (actividades.data ?? []).map((a) => ({ value: String(a.id), label: a.nombre }))
    if (v.actividad && !lista.some((o) => o.value === v.actividad))
      lista.unshift({ value: v.actividad, label: detalle?.actividad_nombre ?? `Actividad ${v.actividad}` })
    return lista
  }, [actividades.data, v.actividad, detalle?.actividad_nombre])

  // G.6.OTO.1: Estudiantes | Tipo; Motivo a todo el ancho; Fecha | Otorgado por | Actividad; Soporte.
  // Una columna en pantallas angostas.
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        {modo === "nuevo" ? (
          <CampoEstudiantes
            id="reconocimiento-estudiantes"
            establecimiento={establecimiento}
            value={v.estudiantes}
            error={err("estudiantes")}
            onChange={(m) => set("estudiantes", m)}
          />
        ) : (
          <EstudianteFijo id="reconocimiento-estudiante" nombre={estudianteNombre ?? ""} />
        )}
      </div>
      <div className="sm:col-span-3">
        <ComboOpciones
          id="reconocimiento-tipo"
          label="Tipo de reconocimiento"
          required
          size="default"
          todos={false}
          placeholder="Seleccione"
          value={v.tipo}
          options={tipoOpciones}
          disabled={modo === "otorgar"}
          error={err("tipo")}
          onChange={(tipo) => set("tipo", tipo)}
        />
      </div>

      <div className="sm:col-span-6">
        <TextoLargo
          id="reconocimiento-motivo"
          label="Motivo"
          required
          max={MOTIVO_MAX}
          placeholder="Por qué se otorga el reconocimiento"
          value={v.motivo}
          error={err("motivo")}
          onChange={(motivo) => set("motivo", motivo)}
        />
      </div>

      <div className="sm:col-span-2">
        <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(err("fecha")) || undefined}>
          <FieldLabel htmlFor="reconocimiento-fecha">Fecha*</FieldLabel>
          <DatePicker
            id="reconocimiento-fecha"
            value={v.fecha}
            maxDate={new Date()}
            aria-invalid={Boolean(err("fecha")) || undefined}
            onChange={(d) => set("fecha", d)}
          />
          {err("fecha") ? <FieldError>{err("fecha")}</FieldError> : <FieldDescription>En un período Calificable.</FieldDescription>}
        </Field>
      </div>
      <div className="sm:col-span-2">
        <ComboOpciones
          id="reconocimiento-otorgante"
          label="Otorgado por"
          required
          size="default"
          todos={false}
          placeholder="Buscar funcionario"
          value={form.otorganteEfectivo}
          options={otorganteOpciones}
          error={err("otorgante")}
          onInputChange={setTextoOtorgante}
          onChange={(otorgante) => set("otorgante", otorgante)}
        />
      </div>
      <div className="sm:col-span-2">
        <ComboOpciones
          id="reconocimiento-actividad"
          label="Actividad relacionada"
          size="default"
          todos="Ninguna"
          placeholder="Ninguna"
          value={v.actividad}
          options={actividadOpciones}
          onInputChange={setTextoActividad}
          onChange={(actividad) => set("actividad", actividad)}
        />
      </div>

      <div className="flex flex-col gap-1 sm:col-span-6" data-invalid={Boolean(err("soporte")) || undefined}>
        <SoportesUpload
          label="Soporte"
          max={1}
          archivos={v.soporte ? [v.soporte] : []}
          onChange={(archivos) => set("soporte", archivos[0] ?? null)}
        />
        {detalle?.soporte_nombre && !v.soporte && (
          <p className="text-xs text-muted-foreground">Soporte actual: {detalle.soporte_nombre}. Adjunte otro para reemplazarlo.</p>
        )}
        {err("soporte") && <FieldError>{err("soporte")}</FieldError>}
      </div>
    </div>
  )
}
