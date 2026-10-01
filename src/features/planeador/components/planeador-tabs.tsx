import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"

import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useActividadesTabsQuery } from "@/features/planeador/api/query/use-actividades-tabs-query"

/**
 * Fallback SOLO mientras `/actividades/tabs` está cargando — una pestaña
 * "Actividades" sin filtrar por `?rotulo=`, mismo criterio que
 * `UNIDAD_TAB_FALLBACK`.
 */
export const ACTIVIDAD_TAB_FALLBACK = "Actividades"

/**
 * Fallback SOLO mientras `/unidades/tabs` está cargando (`data` todavía
 * `undefined`): una pestaña "Unidad temática" sin filtrar por
 * `?instrumento=`, mismo comportamiento que antes de que este endpoint
 * existiera — evita que la pestaña "parpadee" al entrar.
 *
 * Una vez que la respuesta llega, si viene VACÍA (el usuario no dicta ni
 * administra ningún nivel — ver V407) NO se usa este fallback: mostrarlo
 * ahí haría aparecer "Unidad temática" para alguien sin ningún acceso real,
 * cuando debería quedar solo la pestaña "Actividades".
 */
export const UNIDAD_TAB_FALLBACK = "Unidad temática"

/**
 * Las vistas del Planeador. Tanto "Actividades" como "Unidad temática"
 * pueden ser VARIAS pestañas:
 * - Unidades, una por cada referente curricular (`instrumento`) de los
 *   niveles educativos que dicta el docente (`GET /planeador/unidades/tabs`):
 *   un docente de Preescolar ve "Proyecto pedagógico", uno de Primaria
 *   "Unidad temática", uno con grados de los dos niveles ve las dos.
 *   Elegir una filtra el listado de unidades a los grados/asignaturas de
 *   ese referente (ver `planeador-unidades-page.tsx`) — encodeado en la URL
 *   como `?instrumento=`.
 * - Actividades, una por cada Rótulo de Ejecución resuelto por par
 *   grado+asignatura (`GET /planeador/actividades/tabs`): "Actividad",
 *   "Experiencia de aprendizaje", … — encodeado como `?rotulo=`. Se pinta
 *   en SINGULAR, igual que "Unidad temática"/"Proyecto pedagógico" (un
 *   nombre de categoría, no una lista pluralizada): el rótulo no es un
 *   dato controlado y pluralizarlo a mano (o confiar en una forma plural
 *   configurada aparte) puede romper con cualquier palabra no prevista
 *   (ver el bug de "Actividads").
 *
 * Las pestañas de Actividades se pintan primero, las de Unidades después —
 * mismo orden visual que antes de que Actividades tuviera más de una.
 */
export function PlaneadorTabs() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // `strict: false`: este componente se monta en la ruta de Actividades y en
  // la de Unidades, y cada una declara un search param distinto.
  const search = useSearch({ strict: false }) as { instrumento?: string; rotulo?: string }

  const { data: unidadTabs, isPending: isPendingUnidades } = useUnidadesTabsQuery()
  const { data: actividadTabs, isPending: isPendingActividades } = useActividadesTabsQuery()

  // `undefined` (todavía cargando) -> fallback para no parpadear. `[]` (ya
  // cargó y no hay ninguna pestaña real) -> ninguna, no el fallback: un
  // usuario sin acceso a ningún nivel/referente debe quedar sin esa pestaña.
  const instrumentos = unidadTabs?.length
    ? unidadTabs.map((t) => t.instrumento)
    : isPendingUnidades
      ? [UNIDAD_TAB_FALLBACK]
      : []
  const rotulos = actividadTabs?.length
    ? actividadTabs.map((t) => t.rotulo)
    : isPendingActividades
      ? [ACTIVIDAD_TAB_FALLBACK]
      : []

  const views = [
    ...rotulos.map((rotulo) => ({
      key: `actividad:${rotulo}`,
      label: rotulo,
      to: paths.app.planeadorActividades.getHref(),
      rotulo: rotulo as string | undefined,
      instrumento: undefined as string | undefined,
    })),
    ...instrumentos.map((instrumento) => ({
      key: `unidad:${instrumento}`,
      label: instrumento,
      to: paths.app.planeadorUnidades.getHref(),
      rotulo: undefined as string | undefined,
      instrumento,
    })),
  ]

  const enUnidades = pathname.startsWith(paths.app.planeadorUnidades.getHref())
  const activeView = enUnidades
    ? (views.find((v) => v.key.startsWith("unidad:") && v.instrumento === search.instrumento) ??
      views.find((v) => v.key.startsWith("unidad:")))
    : (views.find((v) => v.key.startsWith("actividad:") && v.rotulo === search.rotulo) ??
      views.find((v) => v.key.startsWith("actividad:")))
  const active = activeView?.key

  return (
    <TableScreenTabs>
      {/* Cada pestaña ES el enlace (`render`), así que el click navega solo.
          `onValueChange` cubre el otro camino de activación: las flechas del
          teclado, que mueven la pestaña activa sin disparar el click. */}
      <Tabs
        value={active}
        onValueChange={(value) => {
          const view = views.find((v) => v.key === value)
          if (!view) return
          navigate({
            to: view.to,
            search: view.instrumento
              ? { instrumento: view.instrumento }
              : view.rotulo
                ? { rotulo: view.rotulo }
                : undefined,
          })
        }}
        aria-label="Vistas del planeador"
      >
        {/* `mb-px` negativo en vez del que trae la variante: ese está calculado
            para apoyarse sobre un panel hermano dentro del mismo `Tabs`, y acá
            debajo no hay panel sino el borde de cierre de la franja.
            El fondo de la activa es `bg-card` —la superficie del encabezado que
            sigue hacia abajo—, no el `bg-background` que la variante usa
            cuando vive sobre un panel. */}
        <TabsList variant="folder" className="-mb-px">
          {views.map((view) => (
            <TabsTrigger
              key={view.key}
              value={view.key}
              render={
                <Link
                  to={view.to}
                  search={view.instrumento ? { instrumento: view.instrumento } : view.rotulo ? { rotulo: view.rotulo } : undefined}
                />
              }
              className="data-active:bg-card dark:data-active:bg-card"
            >
              {view.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </TableScreenTabs>
  )
}
