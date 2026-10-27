import { type ReactNode, useEffect, useMemo } from "react"
import { deArticuloRotulo } from "@/features/planeador/lib/rotulo-gramatica"
import { useSelector } from "@tanstack/react-form"
import { useQueries } from "@tanstack/react-query"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { referenteCurricularQueryOptions } from "@/features/planeador/api/query/use-referente-curricular-query"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnFrase,
  useRotuloActividadQuery,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import type { ActividadTab } from "@/features/planeador/api/query/use-actividades-tabs-query"
import { useDocenteGruposQuery } from "@/features/planeador/api/query/use-docente-grupos-query"
import { useGradoGruposQuery } from "@/features/planeador/api/query/use-grado-grupos-query"
import { useDocenteGradoAsignaturaQuery } from "@/features/planeador/api/query/use-docente-grado-asignatura-query"
import { useActividadMatriculasGrupoQuery } from "@/features/planeador/api/query/use-actividad-matriculas-grupo-query"
import { EstudiantesMultiSelect } from "@/features/planeador/components/forms/estudiantes-multi-select"
import {
  useStudyPlanSubjectLabel,
} from "@/features/establishment/academic-period/api/query/use-study-plan-subject-label"
import { faltanEstudiantes } from "@/features/planeador/lib/campos-obligatorios-faltantes"
import type { FormActividad } from "@/features/planeador/components/forms/form-editar-actividad/types"
import {
  useErrorObligatorio,
  ERROR_OBLIGATORIO,
} from "@/features/planeador/components/forms/form-editar-actividad/hooks"

/**
 * "Grado / Grupo" es un solo `<Select>` con los combos reales del docente; Asignatura
 * sale del mismo catálogo filtrada por `gradoId`.
 */
/** `grupo_codigo` viene `null` en los datos reales: se prioriza `grupo_nombre`. */
function grupoLabel(grupo: { grupoCodigo: string; grupoNombre: string }): string {
  return grupo.grupoCodigo || grupo.grupoNombre
}

export function AsignaturaGradoSection({
  form,
  bloqueadoPorRecuperacion,
  unidadBloqueada = false,
  unidadSlot,
  tab,
}: {
  form: FormActividad
  /** Ver `useRecuperacionBloqueaCampos`. */
  bloqueadoPorRecuperacion: boolean
  /**
   * `true` en el alta desde una Unidad: Grado/Grupo y Asignatura quedan deshabilitados
   * (se toma el primer grupo del grado; otro grupo se cambia editando la actividad).
   */
  unidadBloqueada?: boolean
  unidadSlot?: ReactNode
  /**
   * Pestaña activa (`?rotulo=`): acota Grado/Grupo y Asignatura a `tab.pares`.
   * `unidadBloqueada` sigue ganando; el filtro es por par (grado, asignatura).
   */
  tab?: ActividadTab
}) {
  const { data: docenteGrupos = [], isPending: isPendingDocenteGrupos } = useDocenteGruposQuery()
  const { data: docenteGradoAsignatura = [] } = useDocenteGradoAsignaturaQuery()

  // Con `destino = NOTA_FINAL` Grado/Asignatura se eligen a mano y deben ser de un referente
  // EVALUATIVO: se sondea cada par en paralelo (no hay endpoint que lo diga de una).
  const esRecuperacion = useSelector(form.store, (state) => state.values.esRecuperacion)
  const recuperacionDestino = useSelector(form.store, (state) => state.values.recuperacionDestino)
  const filtrarSoloEvaluativas = esRecuperacion && recuperacionDestino === "NOTA_FINAL"

  const referentes = useQueries({
    queries: docenteGradoAsignatura.map((par) => ({
      ...referenteCurricularQueryOptions(par.gradoId, par.asignaturaId),
      enabled: filtrarSoloEvaluativas,
    })),
  })

  // Mientras la sonda no resuelve, el par se trata como no evaluativo.
  const paresEvaluativos = useMemo(() => {
    const ids = new Set<number>()
    docenteGradoAsignatura.forEach((par, i) => {
      if (referentes[i]?.data?.esFormativo === false) ids.add(par.gradoId * 1_000_000 + par.asignaturaId)
    })
    return ids
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `referentes` cambia de referencia en cada resolución; `docenteGradoAsignatura` ya la representa indirectamente.
  }, [docenteGradoAsignatura, referentes])

  const gradosEvaluativosIds = useMemo(() => {
    const ids = new Set<number>()
    docenteGradoAsignatura.forEach((par) => {
      if (paresEvaluativos.has(par.gradoId * 1_000_000 + par.asignaturaId)) ids.add(par.gradoId)
    })
    return ids
  }, [docenteGradoAsignatura, paresEvaluativos])

  const gradoId = useSelector(form.store, (state) => state.values.gradoId)
  const grupoId = useSelector(form.store, (state) => state.values.grupoId)
  // El id guardado puede no estar en el catálogo del docente: los labels del detalle
  // sirven de respaldo para el `<SelectValue>`.
  const grado = useSelector(form.store, (state) => state.values.grado)
  const grupo = useSelector(form.store, (state) => state.values.grupo)
  const asignatura = useSelector(form.store, (state) => state.values.asignatura)
  const hasGradoGrupo = gradoId != null && grupoId != null

  // La unidad puede ser de un grado fuera de `docentes/grupos`; se espera a que cargue
  // antes de decidir que no hay match y caer al fallback.
  const necesitaFallbackGrupo =
    gradoId != null && grupoId == null && !isPendingDocenteGrupos && !docenteGrupos.some((g) => g.gradoId === gradoId)
  const { data: gradoGrupos = [] } = useGradoGruposQuery(necesitaFallbackGrupo ? gradoId : undefined)

  const asignaturaId = useSelector(form.store, (state) => state.values.asignaturaId)
  const hasGradoAsignatura = hasGradoGrupo && asignaturaId != null
  // Rótulo real (Regla 13): nunca "actividad" fijo.
  const { data: rotuloActividad } = useRotuloActividadQuery(gradoId, asignaturaId)
  const rotuloLower = rotuloEnFrase(rotuloActividad?.rotulo ?? tab?.rotulo ?? ROTULO_ACTIVIDAD_FALLBACK)
  const asignarTodoElGrupo = useSelector(form.store, (state) => state.values.asignarTodoElGrupo)
  const { data: matriculas = [], isPending: isPendingMatriculas } = useActividadMatriculasGrupoQuery(
    hasGradoAsignatura ? grupoId : undefined,
  )
  // Misma regla que `faltanEstudiantes`: "Ningún estudiante" con un grupo que sí tiene estudiantes.
  const estudiantesInvalido = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => faltanEstudiantes(state.values, matriculas.length > 0)),
  )

  // El detalle real no trae `fk_tgrado`: se resuelve cruzando `grupoId` con `docentes/grupos`,
  // o si no, por asignatura con `docentes/grado-asignatura`. Comparación tolerante (trim + mayúsculas).
  function mismoNombre(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }

  useEffect(() => {
    // `gradoId` ya resuelto: solo falta `grupoId`, se toma el primer grupo de ese grado.
    if (gradoId != null) {
      if (grupoId == null) {
        const combo = docenteGrupos.find((g) => g.gradoId === gradoId)
        if (combo) {
          form.setFieldValue("grupoId", combo.grupoId)
          form.setFieldValue("grupo", grupoLabel(combo))
        } else if (gradoGrupos.length > 0) {
          // Sin grupos del docente en este grado: se toma el primero del establecimiento.
          const [fallback] = gradoGrupos
          form.setFieldValue("grupoId", fallback.grupoId)
          form.setFieldValue("grupo", fallback.grupoCodigo)
        }
      }
      return
    }
    if (grupoId != null) {
      const combo = docenteGrupos.find((g) => g.grupoId === grupoId)
      if (combo) {
        form.setFieldValue("gradoId", combo.gradoId)
        form.setFieldValue("grado", combo.gradoNombre)
        return
      }
    }
    if (asignaturaId != null) {
      const par = docenteGradoAsignatura.find((p) => p.asignaturaId === asignaturaId)
      if (par) {
        form.setFieldValue("gradoId", par.gradoId)
        form.setFieldValue("grado", par.gradoNombre)
        return
      }
    }
    // Alta desde una Unidad sin ids reales: se cruzan los nombres de grado y asignatura y se
    // elige el primer grupo del grado, para habilitar Asignatura.
    if (grado && asignatura) {
      const par = docenteGradoAsignatura.find(
        (p) => mismoNombre(p.gradoNombre, grado) && mismoNombre(p.asignaturaNombre, asignatura),
      )
      if (par) {
        form.setFieldValue("gradoId", par.gradoId)
        form.setFieldValue("asignaturaId", par.asignaturaId)
        const combo = docenteGrupos.find((g) => g.gradoId === par.gradoId)
        if (combo) {
          form.setFieldValue("grupoId", combo.grupoId)
          form.setFieldValue("grupo", grupoLabel(combo))
        }
      }
    }
  }, [gradoId, grupoId, asignaturaId, grado, asignatura, docenteGrupos, gradoGrupos, docenteGradoAsignatura, form])

  const asignaturas = docenteGradoAsignatura.filter((par) => par.gradoId === gradoId)
  const subjectLabel = useStudyPlanSubjectLabel(gradoId, false)
  const grupoInvalido = useErrorObligatorio(form, useSelector(form.store, (state) => state.values.grupoId == null))
  const asignaturaInvalida = useErrorObligatorio(
    form,
    useSelector(form.store, (state) => state.values.asignaturaId == null),
  )

  // Se filtra por `tab.pares`: un grado puede repartir asignaturas en dos pestañas.
  const tienePar = (gradoId: number | undefined, asignaturaId: number | undefined) =>
    !tab || tab.pares.some((p) => p.gradoId === gradoId && (p.asignaturaId == null || p.asignaturaId === asignaturaId))

  // `unidadBloqueada` acota a los grupos del grado de la unidad; `tab` compone con él.
  const gruposVisibles = (
    filtrarSoloEvaluativas ? docenteGrupos.filter((g) => gradosEvaluativosIds.has(g.gradoId)) : docenteGrupos
  )
    .filter((g) => !unidadBloqueada || gradoId == null || g.gradoId === gradoId)
    .filter((g) => !tab || tab.gradoIds.includes(g.gradoId))
  const asignaturasVisibles = (
    filtrarSoloEvaluativas
      ? asignaturas.filter((a) => paresEvaluativos.has(a.gradoId * 1_000_000 + a.asignaturaId))
      : asignaturas
  ).filter((a) => tienePar(a.gradoId, a.asignaturaId))

  return (
    <>
        {/* Grado/Grupo primero: Asignatura y Unidad dependen de él. */}
        <Field variant="outlined" data-invalid={grupoInvalido}>
          <FieldLabel htmlFor="grado-grupo">Grado / Grupo *</FieldLabel>
          <Select
            // `__none__` permite volver a "sin grado/grupo".
            value={grupoId != null ? String(grupoId) : "__none__"}
            onValueChange={(v) => {
              if (!v) return
              if (v === "__none__") {
                form.setFieldValue("gradoId", undefined)
                form.setFieldValue("grado", "")
                form.setFieldValue("grupoId", undefined)
                form.setFieldValue("grupo", "")
                form.setFieldValue("asignaturaId", undefined)
                form.setFieldValue("asignatura", "")
                form.setFieldValue("unidad", { id: 0, nombre: "" })
                // Sin grupo no hay padrón: los estudiantes se limpian.
                form.setFieldValue("matriculasIds", [])
                form.setFieldValue("asignarTodoElGrupo", true)
                return
              }
              const combo = docenteGrupos.find((g) => String(g.grupoId) === v)
              if (!combo) return
              form.setFieldValue("gradoId", combo.gradoId)
              form.setFieldValue("grado", combo.gradoNombre)
              form.setFieldValue("grupoId", combo.grupoId)
              form.setFieldValue("grupo", grupoLabel(combo))
              // Cambiar Grado/Grupo invalida asignatura, unidad y estudiantes (las matrículas son del grupo anterior).
              form.setFieldValue("asignaturaId", undefined)
              form.setFieldValue("asignatura", "")
              form.setFieldValue("unidad", { id: 0, nombre: "" })
              form.setFieldValue("matriculasIds", [])
              form.setFieldValue("asignarTodoElGrupo", true)
            }}
            disabled={bloqueadoPorRecuperacion || unidadBloqueada}
          >
            <SelectTrigger id="grado-grupo">
              <SelectValue placeholder="Seleccione">
                {(value) => {
                  if (value === "__none__") return "Seleccione"
                  const combo = docenteGrupos.find((g) => String(g.grupoId) === value)
                  if (combo) return `${combo.gradoNombre}/${grupoLabel(combo)}`
                  return [grado, grupo].filter(Boolean).join("/") || "Seleccione"
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seleccione</SelectItem>
              {gruposVisibles.map((g) => (
                <SelectItem key={g.grupoId} value={String(g.grupoId)}>
                  {g.gradoNombre}/{grupoLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {grupoInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
        </Field>

        <form.Field name="asignaturaId">
          {(field) => (
            <Field variant="outlined" data-invalid={asignaturaInvalida}>
              <FieldLabel htmlFor={field.name}>{subjectLabel} *</FieldLabel>
              <Select
                // `__none__` permite volver a "sin asignatura" (y desbloquear "¿Es evaluación sumativa?").
                value={field.state.value != null ? String(field.state.value) : "__none__"}
                onValueChange={(v) => {
                  if (!v) return
                  if (v === "__none__") {
                    field.handleChange(undefined)
                    form.setFieldValue("asignatura", "")
                    // Sin asignatura no hay padrón: se limpian los estudiantes.
                    form.setFieldValue("matriculasIds", [])
                    form.setFieldValue("asignarTodoElGrupo", true)
                    return
                  }
                  const par = asignaturas.find((a) => String(a.asignaturaId) === v)
                  if (!par) return
                  field.handleChange(par.asignaturaId)
                  form.setFieldValue("asignatura", par.asignaturaNombre)
                  // El padrón depende de grupo + asignatura: las matrículas elegidas se limpian.
                  form.setFieldValue("matriculasIds", [])
                  form.setFieldValue("asignarTodoElGrupo", true)
                }}
                disabled={!hasGradoGrupo || bloqueadoPorRecuperacion || unidadBloqueada}
              >
                <SelectTrigger id={field.name}>
                  <SelectValue
                    placeholder={hasGradoGrupo ? "Seleccione" : "Elegí grado/grupo primero"}
                  >
                    {(value) =>
                      value === "__none__"
                        ? "Seleccione"
                        : // `||`, no `??`: `asignatura` llega `""` (no
                          // `undefined`) cuando el detalle real no trae
                          // ninguna todavía, y `?? "Seleccione"` no cae ahí —
                          // se veía en blanco en vez del placeholder.
                          (asignaturas.find((a) => String(a.asignaturaId) === value)?.asignaturaNombre ||
                            asignatura ||
                            "Seleccione")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccione</SelectItem>
                  {asignaturasVisibles.map((a) => (
                    <SelectItem key={a.asignaturaId} value={String(a.asignaturaId)}>
                      {a.asignaturaNombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {asignaturaInvalida && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>

        {unidadSlot}

        {/* "Estudiantes" depende de Grado/Grupo y Asignatura. Sin elegir a nadie queda en "todo el grupo". */}
        <form.Field name="matriculasIds">
          {(field) => (
            <Field variant="outlined" data-invalid={estudiantesInvalido}>
              <FieldLabel htmlFor={field.name}>Estudiantes {deArticuloRotulo(rotuloLower)} {rotuloLower} *</FieldLabel>
              <EstudiantesMultiSelect
                id={field.name}
                invalid={estudiantesInvalido}
                estudiantes={matriculas}
                value={field.state.value}
                allSelected={asignarTodoElGrupo}
                onChange={({ matriculaIds, allSelected }) => {
                  field.handleChange(matriculaIds)
                  form.setFieldValue("asignarTodoElGrupo", allSelected)
                }}
                disabled={!hasGradoAsignatura || bloqueadoPorRecuperacion}
                // `isPending` de una query deshabilitada queda `true` para siempre: solo cuenta si está habilitada.
                isPending={hasGradoAsignatura && isPendingMatriculas}
                placeholder={hasGradoAsignatura ? "Seleccionar" : "Elegí grado y asignatura primero"}
              />
              {estudiantesInvalido && <FieldError errors={ERROR_OBLIGATORIO} />}
            </Field>
          )}
        </form.Field>
    </>
  )
}
