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

import { useReferenteCurricularQuery } from "@/features/planeador/api/query/use-referente-curricular-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import type { UnidadTab } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useStudyPlanSubjectLabel } from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import {
  ListaAgregableCaja,
  ListaAgregableCajaSelect,
} from "@/features/planeador/components/forms/field-lista-agregable"
import { useEnunciadosDbaQuery } from "@/features/planeador/api/query/use-enunciados-dba"
import { useInstrumentoEvaluacionCatalogQuery } from "@/features/planeador/api/query/use-instrumento-evaluacion-catalog"
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

// Exportado: `CrearUnidadPopover` (form-editar-actividad.tsx) reusa el
// mismo label corto para su `<Select>` compacto de método de cálculo —
// una sola fuente para el texto en vez de repetirlo.
export const METODO_CALCULO_INFO: Record<MetodoCalculo, { label: string; description: string }> = {
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
export const METODO_CALCULO_OPTIONS = Object.keys(METODO_CALCULO_INFO) as MetodoCalculo[]

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
    instrumento: unidad.instrumento,
    instrumentoId: unidad.instrumentoId,
    enunciadosDba: unidad.enunciadosDba,
  }
}

export function draftToPayload(draft: UnidadDraft): UnidadInfoGeneral {
  return draft
}

/**
 * `enfoquePedagogico` deja de ser un campo elegido a mano en este form: se
 * deriva del referente curricular REAL de GRADO+ASIGNATURA
 * (`GET /planeador/referente-curricular`, `useReferenteCurricularQuery`) —
 * reemplaza a `POST /referentes-curriculares/query`
 * (`useCurricularReferencesQuery`), que responde 403 para `CEVAL-DOCENTE`
 * (confirmado en vivo). Sigue viviendo en `UnidadTematica`/`UnidadDraft` (lo
 * siguen leyendo la pestaña Rúbricas y el bloqueo de "sumativa" en
 * actividades), solo que ya no hay un `<Select>` para tocarlo directamente
 * acá.
 *
 * A diferencia de la versión anterior (que pedía `GET /unidades/:id/
 * referente` y por lo tanto exigía una unidad YA GUARDADA), esto resuelve
 * apenas se elige Grado/Asignatura en el form — funciona igual creando que
 * editando, sin depender de que la unidad tenga `id` todavía.
 */
function useEnfoquePedagogicoDerivado(
  gradoId: number | undefined,
  asignaturaId: number | undefined,
): EnfoquePedagogico {
  const { data: referente } = useReferenteCurricularQuery(gradoId, asignaturaId)
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
 *
 * `tab` llega SOLO desde el alta (`planeador-crear-unidad-page.tsx`, cuando
 * se entra por el botón "Agregar {instrumento}" de una pestaña) — acota
 * Grado a los `PK_TGRADO` de esa pestaña (`GET /planeador/unidades/tabs`,
 * ya con nombre real, confirmado contra el servidor de test) en vez de
 * TODO el catálogo del docente (`docentes/grado-asignatura`), que además
 * viene vacío para un rector/coordinador (no "dicta" nada — ver el
 * comentario de `grados` más abajo). Sin `tab` (edición, o alta sin pasar
 * por ese botón) el comportamiento es el de siempre.
 */
export function UnidadInfoGeneralFields({
  draft,
  onChange,
  tab,
}: {
  draft: UnidadDraft
  onChange: (patch: Partial<UnidadDraft>) => void
  tab?: UnidadTab
}) {
  // Con `tab` (alta desde "Agregar {instrumento}") el enfoque NO puede
  // depender de que el docente elija un grado puntual: TODOS los grados de
  // esa pestaña comparten el MISMO referente (`tab.referenteId`, ver el
  // comentario de `UnidadTab`), así que "Proyecto pedagógico de ciclo"
  // (Preescolar, Formativo) mostraba igual "Forma en que se van a calcular
  // las actividades" — una sección que ni aplica a Formativo, ver el
  // guard `enfoqueDerivado !== "Formativo"` más abajo — hasta que se
  // elegía un grado y recién ahí `useReferenteCurricularQuery` resolvía
  // `esFormativo`. Se usa CUALQUIERA de `tab.grados` como base de la
  // consulta mientras no haya uno elegido — mismo criterio que ya aplica
  // `subjectLabel` un poco más abajo.
  const enfoqueDerivado = useEnfoquePedagogicoDerivado(draft.gradoId ?? tab?.grados[0]?.id, draft.asignaturaId)
  useEffect(() => {
    if (draft.enfoquePedagogico !== enfoqueDerivado) {
      onChange({ enfoquePedagogico: enfoqueDerivado })
    }
  }, [draft.enfoquePedagogico, enfoqueDerivado, onChange])

  // Mismo criterio que `enfoqueDerivado`/`subjectLabel`: con `tab`, el
  // rótulo de nivel 1 ("Derechos Básicos de Aprendizaje" vs "Propósitos"…)
  // y los enunciados disponibles no pueden esperar a que se elija un grado
  // puntual — cualquiera de `tab.grados` ya resuelve el mismo referente.
  const {
    enunciados: enunciadosDisponibles,
    nombre: referenteNombre,
    descripcion: referenteDescripcion,
    nivel1Etiqueta,
    isPending: isPendingEnunciados,
  } = useEnunciadosDbaQuery(draft.gradoId ?? tab?.grados[0]?.id, draft.asignaturaId)

  // Grado/Asignatura salen de `GET /planeador/docentes/grado-asignatura`
  // (mismo endpoint real que ya usa el filtro de la Planilla): son los
  // pares que ESTE docente realmente dicta, con sus `PK_TGRADO`/
  // `PK_TASIGNATURA` reales — el catálogo genérico `/select/GRADOS`
  // devolvía grados que no necesariamente le correspondían al docente.
  //
  // Con `tab` (alta desde "Agregar {instrumento}"): NO alcanza para un
  // rector/coordinador — no tiene filas en `docentes/grado-asignatura`
  // (no "dicta" nada, ver `fn_docente_unidad_tabs_listar` V407) — así que
  // Grado se acota a `tab.grados`, que sí trae los grados reales de esa
  // pestaña tanto para un docente como para un administrativo. `tab.
  // asignaturas` es el mismo catálogo por INSTRUMENTO completo (no por
  // grado puntual, el backend no lo distingue a este nivel): se usa
  // igual, y en el caso rector/coordinador puede llegar vacío (esa rama
  // no resuelve asignatura, confirmado contra el servidor de test) — ahí
  // Asignatura queda con la lista vacía existente ("No tienes asignaturas
  // en este grado"), que sigue siendo el fallback correcto: no hay de
  // dónde sacar una.
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()
  const grados = useMemo(() => {
    if (tab && tab.grados.length > 0) return tab.grados
    const porId = new Map<number, { id: number; nombre: string }>()
    for (const par of docenteGradoAsignatura) {
      if (!porId.has(par.gradoId)) {
        porId.set(par.gradoId, { id: par.gradoId, nombre: par.gradoNombre })
      }
    }
    return [...porId.values()]
  }, [tab, docenteGradoAsignatura])

  const asignaturas = useMemo(() => {
    if (tab && tab.grados.length > 0) {
      return tab.asignaturas.map((a) => ({ asignaturaId: a.id, asignaturaNombre: a.nombre }))
    }
    return docenteGradoAsignatura.filter((par) => par.gradoId === draft.gradoId)
  }, [tab, docenteGradoAsignatura, draft.gradoId])

  // Mismo rótulo dinámico que ya usa Plan de Estudio ("Dimensión", "Área", …
  // según lo que el referente curricular del grado tenga personalizado).
  // Con `tab` (alta desde "Agregar {instrumento}") TODOS los grados de la
  // pestaña comparten el MISMO referente (`tab.referenteId`, ver el
  // comentario de `UnidadTab`) — así que no hace falta esperar a que el
  // docente elija un grado puntual para resolverlo: alcanza con CUALQUIERA
  // de `tab.grados` como base de la consulta. Antes se pedía siempre por
  // `draft.gradoId` (sin elegir, `undefined`) y el campo se quedaba en el
  // rótulo genérico ("Asignatura") hasta que se elegía un grado, aunque la
  // pestaña ya dejara clarísimo qué referente aplicaba.
  const subjectLabel = useStudyPlanSubjectLabel(draft.gradoId ?? tab?.grados[0]?.id, false)

  // Grado + Asignatura son el punto de partida de la unidad: el resto de
  // los campos (nombre, descripción, objetivos, contenidos, DBA, método de
  // cálculo) no tiene sentido completarlo antes de saber a qué grado/
  // asignatura pertenece — mismo criterio que `EditarActividadForm` en
  // `form-editar-actividad.tsx`.
  const hasGradoAsignatura = draft.gradoId != null && draft.asignaturaId != null

  // Catálogo global (mismo que ya usa el instrumento de cada actividad) —
  // ver el `<Select>` de "Instrumento de evaluación" más abajo.
  const { data: instrumentosDisponibles } = useInstrumentoEvaluacionCatalogQuery()
  const disabled = !hasGradoAsignatura

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field variant="outlined">
          <FieldLabel>Grado</FieldLabel>
          <Select
            value={draft.gradoId != null ? String(draft.gradoId) : "__none__"}
            onValueChange={(v) => {
              if (!v) return
              if (v === "__none__") {
                onChange({ gradoId: undefined, grado: "", asignaturaId: undefined, asignatura: "" })
                return
              }
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
              {/* El catálogo `grados` solo trae lo que este docente dicta:
                  una unidad de otro docente (o de un grado que este ya no
                  tiene asignado) no matchea ningún `SelectItem` — sin este
                  respaldo el `<SelectValue>` mostraba el id crudo (`3744`)
                  en vez del nombre real que sí trae `draft.grado`. */}
              <SelectValue placeholder="Seleccione">
                {(value) =>
                  value === "__none__"
                    ? "Seleccione"
                    : // `||`, no `??`: `draft.grado` llega `""` (no
                      // `undefined`) en una unidad sin grado todavía, y
                      // `?? "Seleccione"` no cae ahí — se veía en blanco.
                      (grados.find((g) => String(g.id) === value)?.nombre || draft.grado || "Seleccione")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {/* Sin esto, un docente sin grados asignados (`grados` vacío)
                  abría un popover completamente en blanco, sin ninguna
                  opción ni explicación — parecía roto en vez de "no tienes
                  grados asignados". El `__none__` va siempre primero, igual
                  que en el `<Select>` de Asignatura de `AsignaturaGradoSection`
                  (`form-editar-actividad.tsx`). */}
              <SelectItem value="__none__">Seleccione</SelectItem>
              {grados.length === 0 && (
                <SelectItem value="__sin_grados__" disabled>
                  No tienes grados asignados
                </SelectItem>
              )}
              {grados.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field variant="outlined">
          <FieldLabel>{subjectLabel}</FieldLabel>
          <Select
            value={draft.asignaturaId != null ? String(draft.asignaturaId) : "__none__"}
            onValueChange={(v) => {
              if (!v) return
              if (v === "__none__") {
                onChange({ asignaturaId: undefined, asignatura: "" })
                return
              }
              const par = asignaturas.find((a) => String(a.asignaturaId) === v)
              if (!par) return
              onChange({ asignaturaId: par.asignaturaId, asignatura: par.asignaturaNombre })
            }}
            disabled={!draft.gradoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione">
                {(value) =>
                  value === "__none__"
                    ? "Seleccione"
                    : (asignaturas.find((a) => String(a.asignaturaId) === value)?.asignaturaNombre ||
                      draft.asignatura ||
                      "Seleccione")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccione</SelectItem>
              {draft.gradoId != null && asignaturas.length === 0 && (
                <SelectItem value="__sin_asignaturas__" disabled>
                  No tienes asignaturas en este grado
                </SelectItem>
              )}
              {asignaturas.map((a) => (
                <SelectItem key={a.asignaturaId} value={String(a.asignaturaId)}>
                  {a.asignaturaNombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field variant="outlined">
          <FieldLabel>Nombre</FieldLabel>
          <Input
            placeholder="Ej: Diseño de prototipo"
            maxLength={50}
            value={draft.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            disabled={disabled}
          />
        </Field>
      </div>

      <Field variant="outlined">
        <FieldLabel>Descripción</FieldLabel>
        <Textarea
          className={TEXTAREA_OUTLINED}
          rows={3}
          placeholder="Propósito pedagógico y dinámica general"
          maxLength={500}
          disabled={disabled}
          value={draft.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
        />
      </Field>

      <ListaAgregableCaja
        title="Objetivos específicos"
        description="Define los objetivos específicos que se esperan alcanzar."
        columnLabel="Objetivo"
        items={draft.objetivos}
        onChange={(objetivos) => onChange({ objetivos })}
        placeholder="Escribe un nuevo objetivo"
        disabled={disabled}
      />

      <ListaAgregableCaja
        title="Contenidos"
        description="Agrega los componentes o temas que se abordarán."
        columnLabel="Contenido (componente)"
        items={draft.contenidos}
        onChange={(contenidos) => onChange({ contenidos })}
        placeholder="Escribe un nuevo componente"
        disabled={disabled}
      />

      {/* Enunciados de DBA ofrecidos según el Grado de la unidad: grado →
          nivel educativo → Referente Curricular de ese nivel → sus
          enunciados (`useEnunciadosDbaQuery`) — sin pasar por la
          Asignatura. Deshabilitado sin grado elegido, mismo criterio que
          el `<Select>` de Asignatura de arriba. */}
      <ListaAgregableCajaSelect
        title={referenteNombre ?? "Derechos Básicos de Aprendizaje"}
        description={referenteDescripcion ?? "Selecciona los enunciados asociados."}
        // Nunca el literal fijo "Enunciados": este mismo picker se usa para
        // Preescolar, donde el nivel 1 real es "Propósito", no "Enunciado"
        // (ver el comentario de `nivel1Etiqueta` en `use-enunciados-dba.ts`).
        columnLabel={`${nivel1Etiqueta}s`}
        items={draft.enunciadosDba}
        options={enunciadosDisponibles}
        onChange={(enunciadosDba) => onChange({ enunciadosDba })}
        disabled={disabled || !draft.grado}
        isPending={isPendingEnunciados}
      />

      {/* Una unidad de enfoque Formativo no admite actividades sumativas
          (ver el bloqueo de "Es evaluativa" en `UnidadAsociadaSection`,
          `form-editar-actividad.tsx`) — sin actividades sumativas no hay
          nada que "calcular" a partir de ellas, así que el método de
          cálculo no aplica y no tiene sentido pedirlo acá. */}
      {enfoqueDerivado !== "Formativo" && (
        <FieldSet className="gap-2">
          {/* `<legend>` a mano, no `FieldLegend`: esa lleva `text-xs uppercase`
              fijos en su clase base (ver el mismo arreglo en
              `ListaAgregableCaja`, `field-lista-agregable.tsx`) — se ve como
              el label chico de un field, no como título de sección. */}
          <legend className="mb-0 text-base font-semibold">
            Forma en que se van a calcular las actividades.
          </legend>
          <FieldDescription>
            Selecciona el método que se va a utilizar para definir el resultado a partir de las
            actividades calificadas al estudiante.
          </FieldDescription>

          <RadioGroup
            value={draft.metodoCalculo}
            onValueChange={(v) => v && onChange({ metodoCalculo: v as MetodoCalculo })}
            className="grid gap-3 sm:grid-cols-3"
            disabled={disabled}
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
              Al vincular una actividad, deberás asignar el porcentaje que tendrá, ya que se usa
              cálculo por ponderación.
            </div>
          )}

          {draft.metodoCalculo === "Promedio simple" && (
            <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-xs">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              Al vincular una actividad no necesitas asignarle un porcentaje: el resultado se
              calcula como el promedio simple de todas las actividades vinculadas.
            </div>
          )}

          {draft.metodoCalculo === "Suma de puntos" && (
            <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-2 rounded-md border p-3 text-xs">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              Al vincular una actividad, deberás asignar el puntaje que tendrá, ya que se usa
              cálculo por suma de puntos.
            </div>
          )}
        </FieldSet>
      )}

      {/* Instrumento de evaluación de la UNIDAD (sso V488) — mismo gate que
          "Forma en que se van a calcular": una unidad Formativa no califica,
          así que tampoco tiene instrumento. Opcional (a diferencia del
          método de cálculo): el docente puede dejarlo sin fijar. Solo el
          rótulo del panel ("Actividades en {instrumento}") — no condiciona
          el instrumento de las actividades que se vinculen. */}
      {enfoqueDerivado !== "Formativo" && (
        <Field variant="outlined">
          <FieldLabel htmlFor="instrumento-unidad">Instrumento de evaluación</FieldLabel>
          <FieldDescription>
            Opcional — rotula la pestaña de esta unidad ("Actividades en…"). No exige que las
            actividades vinculadas usen el mismo instrumento.
          </FieldDescription>
          <Select
            value={draft.instrumento || "__none__"}
            onValueChange={(v) => v && onChange({ instrumento: v === "__none__" ? undefined : v })}
            disabled={disabled}
          >
            <SelectTrigger id="instrumento-unidad">
              <SelectValue placeholder="Seleccione">
                {(value) => (value === "__none__" ? "Sin fijar" : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin fijar</SelectItem>
              {(instrumentosDisponibles ?? []).map((nombre) => (
                <SelectItem key={nombre} value={nombre}>
                  {nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  )
}
