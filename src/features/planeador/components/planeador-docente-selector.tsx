import { useEffect, useRef } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

import {
  usePlaneadorDocentesQuery,
  type PlaneadorDocente,
} from "@/features/planeador/api/query/use-planeador-docentes-query"
import {
  aniosDePeriodos,
  defaultsDeSede,
  jornadaKey,
  jornadaPorDefecto,
  periodosDelAnio,
  usePlaneadorFiltroPeriodosQuery,
  usePlaneadorFiltroSedesQuery,
  type PlaneadorFiltroPeriodo,
  type PlaneadorFiltroSede,
} from "@/features/planeador/api/query/use-planeador-filtros-query"
import {
  usePlaneadorDocenteScope,
  type PlaneadorAlcanceSearch,
  type PlaneadorDocenteScope,
} from "@/features/planeador/hooks/use-planeador-docente-scope"
import { useNotificarErrores } from "@/features/planeador/hooks/use-notificar-errores"

/** Valor de las opciones "Todas"/"Todos": el filtro vacío. */
const TODOS = ""

/** Sede, año, jornada y docente del filtro avanzado (`?sede=&ano=&jornada=
 *  &docente=`). `jornada` es `jornadaKey` (`0` = periodo sin jornada). */
export type PlaneadorAlcanceSeleccion = PlaneadorAlcanceSearch

function docenteLabel(docente: PlaneadorDocente): string {
  return docente.identificacion ? `${docente.nombre} — ${docente.identificacion}` : docente.nombre
}

/** El super admin alcanza sedes de muchos establecimientos: el nombre del EE
 *  desambigua dos sedes que se llaman parecido. */
function sedeLabel(sede: PlaneadorFiltroSede, conEstablecimiento: boolean): string {
  return conEstablecimiento ? `${sede.nombre} — ${sede.establecimientoNombre}` : sede.nombre
}

function periodoDe(
  periodos: PlaneadorFiltroPeriodo[] | undefined,
  ano: number | undefined,
  jornada: number | undefined,
): PlaneadorFiltroPeriodo | undefined {
  if (ano == null || jornada == null) return undefined
  return periodos?.find((p) => p.anio === ano && jornadaKey(p.jornadaId) === jornada)
}

function todosLosDocentesLabel(scope: PlaneadorDocenteScope, sede: number | undefined): string {
  if (sede != null) return "Todos los docentes de la sede"
  if (scope.esSuperAdmin) return "Todos los docentes"
  return scope.esRector ? "Todos los docentes del establecimiento" : "Todos los docentes de mi sede"
}

/** Docentes que dictan en la sede / el periodo dados. El super admin no
 *  pide nada sin sede (el backend le devolvería 0 filas). */
function useDocentesDeSeleccion(scope: PlaneadorDocenteScope, sede?: number, periodo?: number) {
  return usePlaneadorDocentesQuery({
    sede,
    periodo,
    enabled:
      scope.enVistaConSelector && scope.puedeElegirDocente && (!scope.esSuperAdmin || sede != null),
  })
}

/**
 * Campos Sede → Año → Jornada → Docente del popover de filtros avanzados del
 * Planeador (Actividades y Unidades), con la misma cascada que Informes:
 * - Sede arranca en "Todas" (todo el alcance del rol) y Año/Jornada en
 *   "Todos"/"Todas": no se impone nada al entrar.
 * - Recién al elegir una sede se pone por defecto el año con el periodo
 *   académico abierto (en curso, o el más reciente que siga abierto) y su
 *   jornada. Elegido un año, la jornada es obligatoria si tiene varias: los
 *   endpoints filtran por un solo periodo académico.
 * - Cambiar un campo padre borra los hijos.
 * - Docente depende de sede + periodo; el Super Admin necesita la sede para
 *   elegir uno (sin ella `/planeador/docentes` no devuelve filas).
 *
 * Es controlado: el borrador vive en el form del popover y se escribe en la
 * URL recién al "Aplicar filtros".
 */
export function PlaneadorAlcanceFields({
  value,
  onChange,
}: {
  value: PlaneadorAlcanceSeleccion
  onChange: (next: PlaneadorAlcanceSeleccion) => void
}) {
  const scope = usePlaneadorDocenteScope()
  const sedes = usePlaneadorFiltroSedesQuery(scope.enVistaConSelector && scope.puedeElegirDocente)
  const periodos = usePlaneadorFiltroPeriodosQuery(value.sede)
  const periodo = periodoDe(periodos.data, value.ano, value.jornada)
  const docentes = useDocentesDeSeleccion(scope, value.sede, periodo?.id)

  useNotificarErrores([sedes.error, periodos.error, docentes.error])

  // Al elegir una sede, año y jornada por defecto en cuanto llegan sus
  // periodos (pueden venir de caché o llegar más tarde).
  const pendienteDefault = useRef(false)
  const latest = useRef({ value, onChange })
  latest.current = { value, onChange }
  useEffect(() => {
    if (!pendienteDefault.current || !periodos.data) return
    pendienteDefault.current = false
    const { value, onChange } = latest.current
    onChange({ ...value, ...defaultsDeSede(periodos.data) })
  }, [periodos.data])

  if (!scope.puedeElegirDocente) return null

  const conEstablecimiento = scope.esSuperAdmin
  const sedeItems: Record<string, string> = {
    [TODOS]: "Todas",
    ...Object.fromEntries(
      (sedes.data ?? []).map((s) => [String(s.id), sedeLabel(s, conEstablecimiento)]),
    ),
  }
  const anios = aniosDePeriodos(periodos.data ?? [])
  const anioItems: Record<string, string> = {
    [TODOS]: "Todos",
    ...Object.fromEntries(anios.map((a) => [String(a), String(a)])),
  }
  const delAnio = periodosDelAnio(periodos.data ?? [], value.ano)
  // "Todas" solo sin año o con un año de una sola jornada (ver arriba).
  const ofreceTodasJornadas = delAnio.length <= 1
  const jornadaItems: Record<string, string> = {
    ...(ofreceTodasJornadas ? { [TODOS]: "Todas" } : {}),
    ...Object.fromEntries(delAnio.map((p) => [String(jornadaKey(p.jornadaId)), p.jornadaNombre])),
  }
  const todosLabel = todosLosDocentesLabel(scope, value.sede)
  const docenteItems: Record<string, string> = {
    [TODOS]: todosLabel,
    ...Object.fromEntries((docentes.data ?? []).map((d) => [String(d.id), docenteLabel(d)])),
  }
  const docenteDeshabilitado = scope.esSuperAdmin && value.sede == null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="planeador-sede">Sede</FieldLabel>
        <ComboboxField
          items={sedeItems}
          value={value.sede != null ? String(value.sede) : TODOS}
          onValueChange={(next) => {
            const sede = next ? Number(next) : undefined
            pendienteDefault.current = sede != null
            // Cambiar de sede borra año, jornada y docente (cuelgan de ella).
            onChange({ sede })
          }}
        >
          <ComboboxFieldTrigger id="planeador-sede" size="sm" className="w-full">
            <ComboboxFieldValue
              placeholder={sedes.isPending ? "Cargando…" : "Todas"}
            />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            <ComboboxFieldItem value={TODOS}>Todas</ComboboxFieldItem>
            {(sedes.data ?? []).map((sede) => (
              <ComboboxFieldItem key={sede.id} value={String(sede.id)}>
                {sedeLabel(sede, conEstablecimiento)}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="planeador-ano">Año</FieldLabel>
        <ComboboxField
          items={anioItems}
          disabled={value.sede == null}
          value={value.ano != null ? String(value.ano) : TODOS}
          onValueChange={(next) => {
            const ano = next ? Number(next) : undefined
            const jornadaId =
              ano != null ? jornadaPorDefecto(periodosDelAnio(periodos.data ?? [], ano)) : undefined
            // Cambiar de año borra jornada y docente.
            onChange({
              sede: value.sede,
              ano,
              jornada: jornadaId === undefined ? undefined : jornadaKey(jornadaId),
            })
          }}
        >
          <ComboboxFieldTrigger id="planeador-ano" size="sm" className="w-full">
            <ComboboxFieldValue
              placeholder={value.sede != null && periodos.isPending ? "Cargando…" : "Todos"}
            />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            <ComboboxFieldItem value={TODOS}>Todos</ComboboxFieldItem>
            {anios.map((anio) => (
              <ComboboxFieldItem key={anio} value={String(anio)}>
                {anio}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined" className="gap-2">
        <FieldLabel htmlFor="planeador-jornada">Jornada</FieldLabel>
        <ComboboxField
          items={jornadaItems}
          disabled={value.ano == null}
          value={value.jornada != null ? String(value.jornada) : ofreceTodasJornadas ? TODOS : null}
          // Cambiar de jornada borra el docente.
          onValueChange={(next) =>
            onChange({ sede: value.sede, ano: value.ano, jornada: next ? Number(next) : undefined })
          }
        >
          <ComboboxFieldTrigger id="planeador-jornada" size="sm" className="w-full">
            <ComboboxFieldValue placeholder={ofreceTodasJornadas ? "Todas" : "Selecciona una jornada"} />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {ofreceTodasJornadas && <ComboboxFieldItem value={TODOS}>Todas</ComboboxFieldItem>}
            {delAnio.map((p) => (
              <ComboboxFieldItem key={p.id} value={String(jornadaKey(p.jornadaId))}>
                {p.jornadaNombre}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <Field orientation="vertical" variant="outlined" className="gap-2 sm:col-span-3">
        <FieldLabel htmlFor="planeador-docente">Docente</FieldLabel>
        <ComboboxField
          items={docenteItems}
          disabled={docenteDeshabilitado}
          value={value.docente != null ? String(value.docente) : TODOS}
          onValueChange={(next) => onChange({ ...value, docente: next ? Number(next) : undefined })}
        >
          <ComboboxFieldTrigger id="planeador-docente" size="sm" className="w-full">
            <ComboboxFieldValue
              placeholder={
                docenteDeshabilitado
                  ? "Elige primero la sede"
                  : docentes.isFetching
                    ? "Cargando…"
                    : "Selecciona un docente"
              }
            />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            <ComboboxFieldItem value={TODOS}>{todosLabel}</ComboboxFieldItem>
            {(docentes.data ?? []).map((docente) => (
              <ComboboxFieldItem key={docente.id} value={String(docente.id)}>
                {docenteLabel(docente)}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>
    </div>
  )
}

/** Aviso fijo de solo lectura mientras se mira el planeador de otro docente. */
export function PlaneadorLecturaBanner({ className }: { className?: string }) {
  const scope = usePlaneadorDocenteScope()
  const { data: docentes } = useDocentesDeSeleccion(scope, scope.sedeId, scope.periodoId)
  if (scope.funcionario == null) return null
  const nombre =
    docentes?.find((d) => d.id === scope.funcionario)?.nombre ?? "el docente seleccionado"
  return (
    <p
      role="status"
      className={cn(
        "border-blue-stroke bg-blue-22 text-blue rounded-md border px-3 py-2 text-sm",
        className,
      )}
    >
      Estás viendo el planeador de {nombre} en modo lectura.
    </p>
  )
}

