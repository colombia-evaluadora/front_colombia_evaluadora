import { useEffect, useMemo } from "react"

import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { InfoIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import {
  ListaAgregableCaja,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import type { UnidadInfoGeneral } from "@/features/planeador/api/mutations/update-unidad"
import type {
  EnfoquePedagogico,
  MetodoCalculo,
  UnidadTematica,
} from "@/features/planeador/api/types/unidad-tematica"

// Mismo criterio que `form-editar-actividad.tsx`: `<Textarea>` no trae
// variante `outlined` propia, así que se le aplican a mano las clases de
// `inputVariants({variant: "outlined"})`.
export const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20"

const METODO_CALCULO_INFO: Record<MetodoCalculo, { label: string; description: string }> = {
  Ponderado: {
    label: "Ponderar actividades",
    description: "Cada actividad tiene un porcentaje asignado según su peso.",
  },
  "Promedio simple": {
    label: "Promediar actividades",
    description: "Se calcula el promedio aritmético de todas las actividades",
  },
  "Suma de puntos": {
    label: "Sumatoria de actividades",
    description: "Se suman los puntajes obtenidos en todas las actividades",
  },
}
const METODO_CALCULO_OPTIONS = Object.keys(METODO_CALCULO_INFO) as MetodoCalculo[]

/** Mismos campos que `UnidadInfoGeneral` — `objetivos`/`contenidos` ya
 *  vienen como array ahí, así que el borrador no necesita transformarlos
 *  (antes eran texto separado por coma; se agregan de a uno con
 *  `ListaAgregableField`, igual que en `CrearUnidadPopover`). */
export type UnidadDraft = UnidadInfoGeneral

export const UNIDAD_DRAFT_VACIO: UnidadDraft = {
  nombre: "",
  area: "",
  enfoquePedagogico: "Evaluativo",
  status: "pending",
  fechaInicio: "",
  fechaFin: "",
  descripcion: "",
  objetivos: [],
  contenidos: [],
  metodoCalculo: "Ponderado",
  grado: "",
  asignatura: "",
  enunciadosDba: [],
}

export function draftFromUnidad(unidad: UnidadTematica): UnidadDraft {
  return {
    nombre: unidad.nombre,
    area: unidad.area,
    enfoquePedagogico: unidad.enfoquePedagogico,
    status: unidad.status,
    fechaInicio: unidad.fechaInicio,
    fechaFin: unidad.fechaFin,
    descripcion: unidad.descripcion,
    objetivos: unidad.objetivos,
    contenidos: unidad.contenidos,
    metodoCalculo: unidad.metodoCalculo,
    grado: unidad.grado,
    asignatura: unidad.asignatura,
    gradoId: unidad.gradoId,
    asignaturaId: unidad.asignaturaId,
    enunciadosDba: unidad.enunciadosDba,
  }
}

export function draftToPayload(draft: UnidadDraft): UnidadInfoGeneral {
  return draft
}

/**
 * `enfoquePedagogico` deja de ser un campo elegido a mano en este form: se
 * deriva del referente curricular REAL de la unidad
 * (`GET /planeador/unidades/:id/referente`, `useUnidadReferenteQuery`) —
 * reemplaza a `POST /referentes-curriculares/query`
 * (`useCurricularReferencesQuery`), que responde 403 para `CEVAL-DOCENTE`
 * (confirmado en vivo). Sigue viviendo en `UnidadTematica`/`UnidadDraft` (lo
 * siguen leyendo la pestaña Rúbricas y el bloqueo de "sumativa" en
 * actividades), solo que ya no hay un `<Select>` para tocarlo directamente
 * acá.
 *
 * El referente se deriva del GRADO de la unidad → nivel de enseñanza, así
 * que la ruta pide el `:id` de una unidad YA EXISTENTE — al CREAR (sin id
 * todavía) no hay forma de consultarlo, y queda en el default histórico
 * ("Evaluativo") hasta que la unidad se guarda y se puede editar.
 */
function useEnfoquePedagogicoDerivado(unidadId: number | undefined): EnfoquePedagogico {
  const { data: referente } = useUnidadReferenteQuery(unidadId)
  return referente?.esFormativo ? "Formativo" : "Evaluativo"
}

/**
 * Campos de "Información general" de una unidad temática — sin criterios ni
 * actividades vinculadas, que se editan aparte (pestañas Rúbricas/
 * Actividades). Se usa tal cual tanto en la página de alta como en la de
 * edición, para que ambas queden sincronizadas si el set de campos cambia.
 *
 * Solo 3 campos básicos (Nombre/Asignatura/Grado): `área`, `estado` y las
 * fechas siguen existiendo en `UnidadTematica` (los sigue mostrando la
 * card del listado y el panel de detalle) pero no se editan desde acá.
 */
export function UnidadInfoGeneralFields({
  draft,
  onChange,
  unidadId,
}: {
  draft: UnidadDraft
  onChange: (patch: Partial<UnidadDraft>) => void
  /** Solo presente al EDITAR — al crear todavía no hay id para consultar
   *  `GET /unidades/:id/referente`, ver `useEnfoquePedagogicoDerivado`. */
  unidadId?: number
}) {
  const enfoqueDerivado = useEnfoquePedagogicoDerivado(unidadId)
  useEffect(() => {
    if (draft.enfoquePedagogico !== enfoqueDerivado) {
      onChange({ enfoquePedagogico: enfoqueDerivado })
    }
  }, [draft.enfoquePedagogico, enfoqueDerivado, onChange])

  const { enunciados: enunciadosDisponibles, isPending: isPendingEnunciados } =
    useEnunciadosDbaQuery(draft.grado)

  // Grado/Asignatura salen de `GET /planeador/docentes/grado-asignatura`
  // (mismo endpoint real que ya usa el filtro de la Planilla): son los
  // pares que ESTE docente realmente dicta, con sus `PK_TGRADO`/
  // `PK_TASIGNATURA` reales — el catálogo genérico `/select/GRADOS`
  // devolvía grados que no necesariamente le correspondían al docente.
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()
  const grados = useMemo(() => {
    const porId = new Map<number, { id: number; nombre: string }>()
    for (const par of docenteGradoAsignatura) {
      if (!porId.has(par.gradoId)) {
        porId.set(par.gradoId, { id: par.gradoId, nombre: par.gradoNombre })
      }
    }
    return [...porId.values()]
  }, [docenteGradoAsignatura])

  const asignaturas = useMemo(
    () => docenteGradoAsignatura.filter((par) => par.gradoId === draft.gradoId),
    [docenteGradoAsignatura, draft.gradoId],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field variant="outlined">
          <FieldLabel>Nombre de la unidad</FieldLabel>
          <Input
            placeholder="Ej: Diseño de prototipo"
            value={draft.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
          />
        </Field>
        <Field variant="outlined">
          <FieldLabel>Grado</FieldLabel>
          <Select
            value={draft.gradoId != null ? String(draft.gradoId) : ""}
            onValueChange={(v) => {
              if (!v) return
              const grado = grados.find((g) => String(g.id) === v)
              if (!grado) return
              // Asignatura depende del grado (mismo criterio que
              // `AsignaturaGradoSection` en `form-editar-actividad.tsx`):
              // cambiar de grado invalida la asignatura ya elegida.
              onChange({
                gradoId: grado.id,
                grado: grado.nombre,
                asignaturaId: undefined,
                asignatura: "",
              })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {grados.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field variant="outlined">
          <FieldLabel>Asignatura</FieldLabel>
          <Select
            value={draft.asignaturaId != null ? String(draft.asignaturaId) : ""}
            onValueChange={(v) => {
              if (!v) return
              const par = asignaturas.find((a) => String(a.asignaturaId) === v)
              if (!par) return
              onChange({ asignaturaId: par.asignaturaId, asignatura: par.asignaturaNombre })
            }}
            disabled={!draft.gradoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {asignaturas.map((a) => (
                <SelectItem key={a.asignaturaId} value={String(a.asignaturaId)}>
                  {a.asignaturaNombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field variant="outlined">
        <FieldLabel>Descripción</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={3}
          placeholder="Propósito pedagógico y dinámica general de la unidad"
          value={draft.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
        />
      </Field>

      <ListaAgregableCaja
        title="Objetivos específicos de la unidad"
        description="Define los objetivos específicos que se esperan alcanzar con esta unidad."
        columnLabel="Objetivo"
        items={draft.objetivos}
        onChange={(objetivos) => onChange({ objetivos })}
        placeholder="Escribe un nuevo objetivo"
      />

      <ListaAgregableCaja
        title="Contenidos de la unidad"
        description="Agrega los componentes o temas que se abordarán en esta unidad."
        columnLabel="Contenido (componente)"
        items={draft.contenidos}
        onChange={(contenidos) => onChange({ contenidos })}
        placeholder="Escribe un nuevo componente"
      />

      {/* Enunciados de DBA ofrecidos según el Grado de la unidad: grado →
          nivel educativo → Referente Curricular de ese nivel → sus
          enunciados (`useEnunciadosDbaQuery`) — sin pasar por la
          Asignatura. Deshabilitado sin grado elegido, mismo criterio que
          el `<Select>` de Asignatura de arriba. */}
      <ListaAgregableCajaSelect
        title="Derechos Básicos de Aprendizaje"
        description="Selecciona los enunciados de DBA asociados a esta unidad."
        columnLabel="Enunciados"
        items={draft.enunciadosDba}
        options={enunciadosDisponibles.map((e) => e.text)}
        onChange={(enunciadosDba) => onChange({ enunciadosDba })}
        disabled={!draft.grado}
        isPending={isPendingEnunciados}
      />

      <FieldSet className="gap-2">
        {/* `<legend>` a mano, no `FieldLegend`: esa lleva `text-xs uppercase`
            fijos en su clase base (ver el mismo arreglo en
            `ListaAgregableCaja`, `field-lista-agregable.tsx`) — se ve como
            el label chico de un field, no como título de sección. */}
        <legend className="mb-0 text-base font-semibold">
          Forma en que se van a calcular las actividades dentro de la unidad.
        </legend>
        <FieldDescription>
          Selecciona el método que se va a utilizar para definir el resultado de la unidad a
          partir de las actividades calificadas al estudiante.
        </FieldDescription>

        <RadioGroup
          value={draft.metodoCalculo}
          onValueChange={(v) => v && onChange({ metodoCalculo: v as MetodoCalculo })}
          className="grid gap-3 sm:grid-cols-3"
        >
          {METODO_CALCULO_OPTIONS.map((option) => {
            const info = METODO_CALCULO_INFO[option]
            const checked = draft.metodoCalculo === option
            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer flex-col gap-1.5 rounded-md border p-3",
                  checked ? "border-primary bg-primary-22" : "hover:bg-muted-22",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <RadioGroupItem value={option} />
                  {info.label}
                </span>
                <span className="text-muted-foreground text-sm">{info.description}</span>
              </label>
            )
          })}
        </RadioGroup>

        {/* Un aviso por método, mismo estilo — cada uno aclara qué le va a
            pedir (o no) el diálogo de "Agregar actividad" al vincular. */}
        {draft.metodoCalculo === "Ponderado" && (
          <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-xs">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Al vincular una actividad, deberás asignar el porcentaje que tendrá dentro de la
            unidad, ya que esta unidad utiliza cálculo por ponderación
          </div>
        )}

        {draft.metodoCalculo === "Promedio simple" && (
          <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-xs">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Al vincular una actividad no necesitas asignarle un porcentaje: esta unidad calcula el
            resultado como el promedio simple de todas las actividades vinculadas
          </div>
        )}

        {draft.metodoCalculo === "Suma de puntos" && (
          <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-xs">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            Al vincular una actividad, deberás asignar el puntaje que tendrá dentro de la
            unidad, ya que esta unidad utiliza cálculo por suma de puntos
          </div>
        )}
      </FieldSet>
    </div>
  )
}
