import { Link, useNavigate, useRouterState } from "@tanstack/react-router"

import { TableScreenTabs } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"

/**
 * Las dos vistas del Planeador. Son rutas hermanas y no estado local, igual
 * que las de "Registro de actividad": así cada pestaña es enlazable, el botón
 * de atrás funciona y el ítem del menú se marca activo en cualquiera de las
 * dos (el prefijo `planeador` a secas no es una ruta).
 */
const VIEWS = [
  { label: "Actividades", to: paths.app.planeadorActividades.getHref() },
  { label: "Unidad temática", to: paths.app.planeadorUnidades.getHref() },
]

export function PlaneadorTabs() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // La pestaña activa la manda la URL, no un estado propio: así el enlace
  // directo y el botón de atrás la dejan bien sin sincronizar nada.
  const active = VIEWS.find((view) => pathname.startsWith(view.to))?.to ?? VIEWS[0].to

  return (
    <TableScreenTabs>
      {/* Cada pestaña ES el enlace (`render`), así que el click navega solo.
          `onValueChange` cubre el otro camino de activación: las flechas del
          teclado, que mueven la pestaña activa sin disparar el click. */}
      <Tabs
        value={active}
        onValueChange={(value) => navigate({ to: value as string })}
        aria-label="Vistas del planeador"
      >
        {/* `mb-px` negativo en vez del que trae la variante: ese está calculado
            para apoyarse sobre un panel hermano dentro del mismo `Tabs`, y acá
            debajo no hay panel sino el borde de cierre de la franja.
            El fondo de la activa es `bg-card` —la superficie del encabezado que
            sigue hacia abajo—, no el `bg-background` que la variante usa
            cuando vive sobre un panel. */}
        <TabsList variant="folder" className="-mb-px">
          {VIEWS.map(({ label, to }) => (
            <TabsTrigger
              key={to}
              value={to}
              render={<Link to={to} />}
              className="data-active:bg-card dark:data-active:bg-card"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </TableScreenTabs>
  )
}
