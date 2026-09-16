import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"

import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"

const ACTIVIDADES_KEY = "actividades"

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
 * Las vistas del Planeador. "Actividades" es fija; la de "Unidad temática"
 * en realidad puede ser VARIAS — una por cada referente curricular
 * (`instrumento`) de los niveles educativos que dicta el docente
 * autenticado (`GET /planeador/unidades/tabs`, colección Postman
 * `planeador-flujo-unidad-actividad`): un docente de Preescolar ve
 * "Proyecto pedagógico", uno de Primaria "Unidad temática", uno con
 * grados de los dos niveles ve las dos pestañas. Elegir una filtra el
 * listado de unidades a los grados/asignaturas de ese referente (ver
 * `planeador-unidades-page.tsx`) — encodeado en la URL como
 * `?instrumento=`, no como parte del path, porque todas viven en la misma
 * ruta (`planeadorUnidadesRoute`).
 */
export function PlaneadorTabs() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // `strict: false`: este componente se monta tanto en la ruta de
  // Actividades como en la de Unidades, y solo la segunda declara
  // `?instrumento=` en su search schema.
  const search = useSearch({ strict: false }) as { instrumento?: string }

  const { data: unidadTabs, isPending } = useUnidadesTabsQuery()
  // `undefined` (todavía cargando) -> fallback para no parpadear. `[]` (ya
  // cargó y no hay ninguna pestaña real) -> ninguna, no el fallback: un
  // usuario sin acceso a ningún nivel/referente debe quedar solo con
  // "Actividades", no con un "Unidad temática" que no le corresponde.
  const instrumentos = unidadTabs?.length
    ? unidadTabs.map((t) => t.instrumento)
    : isPending
      ? [UNIDAD_TAB_FALLBACK]
      : []

  const views = [
    { key: ACTIVIDADES_KEY, label: "Actividades", to: paths.app.planeadorActividades.getHref(), instrumento: undefined as string | undefined },
    ...instrumentos.map((instrumento) => ({
      key: `unidad:${instrumento}`,
      label: instrumento,
      to: paths.app.planeadorUnidades.getHref(),
      instrumento,
    })),
  ]

  const enUnidades = pathname.startsWith(paths.app.planeadorUnidades.getHref())
  const activeUnidadTab = enUnidades
    ? (views.find((v) => v.key !== ACTIVIDADES_KEY && v.instrumento === search.instrumento) ??
      views.find((v) => v.key !== ACTIVIDADES_KEY))
    : undefined
  const active = activeUnidadTab?.key ?? ACTIVIDADES_KEY

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
          navigate({ to: view.to, search: view.instrumento ? { instrumento: view.instrumento } : undefined })
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
              render={<Link to={view.to} search={view.instrumento ? { instrumento: view.instrumento } : undefined} />}
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
