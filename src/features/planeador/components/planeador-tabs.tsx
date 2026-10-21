import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { plegarTexto } from "@/features/assistant/lib/campos-ui"
import { usePestanasAsistente } from "@/features/assistant/lib/registro-ui"
import { paths } from "@/config/paths"

import { useUnidadesTabsQuery } from "@/features/planeador/api/query/use-unidades-tabs-query"
import { useActividadesTabsQuery } from "@/features/planeador/api/query/use-actividades-tabs-query"
import {
  alcanceSearchDe,
  usePlaneadorDocenteScope,
} from "@/features/planeador/hooks/use-planeador-docente-scope"

/** Fallback solo mientras carga `/actividades/tabs`. */
export const ACTIVIDAD_TAB_FALLBACK = "Actividades"

/** Fallback solo mientras carga `/unidades/tabs` (evita parpadeo); con respuesta vacía (V407) no se usa. */
export const UNIDAD_TAB_FALLBACK = "Unidad temática"

/**
 * Pestañas: Actividades por rótulo (`?rotulo=`) y Unidades por referente (`?instrumento=`).
 * Rótulos en singular: son texto libre y pluralizarlos rompe (ver "Actividads").
 */
export function PlaneadorTabs() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // `strict: false`: este componente se monta en la ruta de Actividades y en
  // la de Unidades, y cada una declara un search param distinto.
  const search = useSearch({ strict: false }) as { instrumento?: string; rotulo?: string }
  // Sede/año/jornada/docente elegidos (filtro avanzado) viajan entre
  // pestañas: pasar de Actividades a Unidades sigue mirando el mismo alcance.
  const scope = usePlaneadorDocenteScope()
  const docenteSearch = alcanceSearchDe(scope)
  const searchDe = (view: { instrumento?: string; rotulo?: string }) => ({
    ...docenteSearch,
    ...(view.instrumento
      ? { instrumento: view.instrumento }
      : view.rotulo
        ? { rotulo: view.rotulo }
        : {}),
  })

  const { data: unidadTabs, isPending: isPendingUnidades } = useUnidadesTabsQuery()
  const { data: actividadTabs, isPending: isPendingActividades } = useActividadesTabsQuery()

  // `undefined` (cargando) → fallback; `[]` → ninguna: sin acceso no hay pestaña.
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

  // UI asistida: `ABRIR_PESTANA` con el nombre visible de la pestaña.
  usePestanasAsistente({
    abrir: (pestana) => {
      const nombre = plegarTexto(pestana)
      const view = views.find((v) => plegarTexto(v.label) === nombre)
      if (!view) return false
      navigate({ to: view.to, search: searchDe(view) })
      return true
    },
  })

  return (
    <TableScreenTabs>
      {/* La pestaña es el enlace; `onValueChange` cubre la activación con flechas del teclado. */}
      <Tabs
        value={active}
        onValueChange={(value) => {
          const view = views.find((v) => v.key === value)
          if (!view) return
          navigate({ to: view.to, search: searchDe(view) })
        }}
        aria-label="Vistas del planeador"
      >
        {/* `mb-px` propio y `bg-card`: debajo no hay panel hermano sino el borde de la franja. */}
        <TabsList variant="folder" className="-mb-px">
          {views.map((view) => (
            <TabsTrigger
              key={view.key}
              value={view.key}
              nativeButton={false}
              render={
                <Link to={view.to} search={searchDe(view)} />
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
