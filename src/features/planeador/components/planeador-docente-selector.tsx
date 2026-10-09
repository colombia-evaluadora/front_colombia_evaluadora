import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import {
  usePlaneadorDocentesQuery,
  type PlaneadorDocente,
} from "@/features/planeador/api/query/use-planeador-docentes-query"
import { usePlaneadorDocenteScope } from "@/features/planeador/hooks/use-planeador-docente-scope"
import { useNotificarErrores } from "@/features/planeador/hooks/use-notificar-errores"

/** Valor del ítem "Todos los docentes…" (Rector/Coordinador): sin
 *  `?docente=`, el backend devuelve el alcance completo del rol (todo el
 *  establecimiento para el rector, sus sedes para el coordinador). */
const TODOS = ""

export interface PlaneadorDocenteSeleccion {
  establecimiento?: number
  docente?: number
}

function docenteLabel(docente: PlaneadorDocente): string {
  return docente.identificacion ? `${docente.nombre} — ${docente.identificacion}` : docente.nombre
}

/** Docentes del alcance actual. Comparte la key con el selector, así el
 *  banner no dispara otro pedido para resolver el nombre. */
function usePlaneadorDocentesDelScope() {
  const scope = usePlaneadorDocenteScope()
  return usePlaneadorDocentesQuery({
    establecimientoId: scope.establecimientoId,
    enabled:
      scope.enVistaConSelector &&
      (scope.eligeSoloDocente || (scope.esSuperAdmin && scope.establecimientoId != null)),
  })
}

/**
 * Selector de establecimiento y docente del Planeador (Actividades y
 * Unidades). Solo se muestra a quien puede mirar el planeador de otros:
 * - Super Admin: Establecimiento → Docente (el docente queda deshabilitado
 *   hasta elegir el EE). Sin docente no hay planeador que mostrar.
 * - Rector: solo Docente, con "Todos los docentes del establecimiento"
 *   como primera opción (el backend acota la lista a su EE).
 * - Coordinador: solo Docente, con "Todos los docentes de mi sede" como
 *   primera opción (el backend acota la lista a sus sedes).
 *
 * El estado vive en la URL (`?establecimiento=&docente=`); la página decide
 * qué más resetear al cambiarlo (`onChange`), porque cada una tiene sus
 * propias selecciones que dependen del docente (pestaña, actividad/unidad
 * abierta…).
 */
export function PlaneadorDocenteSelector({
  onChange,
}: {
  onChange: (next: PlaneadorDocenteSeleccion) => void
}) {
  const scope = usePlaneadorDocenteScope()

  const establecimientos = useEstablishmentsOptionsQuery(
    scope.esSuperAdmin && scope.enVistaConSelector,
  )
  const docentes = usePlaneadorDocentesDelScope()

  // La pantalla monta un `NoticeProvider`, que suprime el toast global de
  // axios: los errores de estas listas (incluido el 42501 de un alcance no
  // permitido) se muestran en el aviso de la página.
  useNotificarErrores([establecimientos.error, docentes.error])

  if (!scope.puedeElegirDocente) return null

  const establecimientoItems = Object.fromEntries(
    (establecimientos.data ?? []).map((ee) => [String(ee.id), ee.name]),
  )
  // El rector ve todo su establecimiento; el coordinador, su(s) sede(s). Si
  // alguien tiene los dos roles manda el alcance más amplio (rector).
  const todosLabel = scope.esRector
    ? "Todos los docentes del establecimiento"
    : "Todos los docentes de mi sede"
  const docenteItems: Record<string, string> = {
    ...(scope.eligeSoloDocente ? { [TODOS]: todosLabel } : {}),
    ...Object.fromEntries((docentes.data ?? []).map((d) => [String(d.id), docenteLabel(d)])),
  }
  const docenteDeshabilitado = scope.esSuperAdmin && scope.establecimientoId == null

  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      {scope.esSuperAdmin && (
        <Field orientation="vertical" variant="outlined" className="w-full gap-2 sm:w-72">
          <FieldLabel htmlFor="planeador-establecimiento">Establecimiento educativo</FieldLabel>
          <ComboboxField
            items={establecimientoItems}
            value={scope.establecimientoId != null ? String(scope.establecimientoId) : null}
            // Cambiar de EE invalida el docente elegido (cuelga de él).
            onValueChange={(value) =>
              onChange({ establecimiento: value ? Number(value) : undefined, docente: undefined })
            }
          >
            <ComboboxFieldTrigger id="planeador-establecimiento" size="sm" className="w-full">
              <ComboboxFieldValue
                placeholder={
                  establecimientos.isPending ? "Cargando…" : "Selecciona un establecimiento"
                }
              />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {(establecimientos.data ?? []).map((ee) => (
                <ComboboxFieldItem key={ee.id} value={String(ee.id)}>
                  {ee.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      )}

      <Field orientation="vertical" variant="outlined" className="w-full gap-2 sm:w-72">
        <FieldLabel htmlFor="planeador-docente">Docente</FieldLabel>
        <ComboboxField
          items={docenteItems}
          disabled={docenteDeshabilitado}
          value={
            scope.funcionario != null
              ? String(scope.funcionario)
              : scope.eligeSoloDocente
                ? TODOS
                : null
          }
          onValueChange={(value) =>
            onChange({
              establecimiento: scope.establecimientoId,
              docente: value ? Number(value) : undefined,
            })
          }
        >
          <ComboboxFieldTrigger id="planeador-docente" size="sm" className="w-full">
            <ComboboxFieldValue
              placeholder={
                docenteDeshabilitado
                  ? "Elige primero el establecimiento"
                  : docentes.isFetching
                    ? "Cargando…"
                    : "Selecciona un docente"
              }
            />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {scope.eligeSoloDocente && (
              <ComboboxFieldItem value={TODOS}>{todosLabel}</ComboboxFieldItem>
            )}
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
  const { data: docentes } = usePlaneadorDocentesDelScope()
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

/** Estado vacío del Super Admin antes de elegir establecimiento y docente:
 *  la página no dispara ninguna consulta del planeador hasta entonces. */
export function PlaneadorSeleccionVacia() {
  return (
    <div className="text-muted-foreground flex min-h-48 items-center justify-center rounded-md border border-dashed p-6 text-center text-sm">
      Selecciona un establecimiento y un docente para ver su planeador.
    </div>
  )
}
