import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { conservacionDatosRoute } from "@/router"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useVencidosQuery } from "@/features/administration/conservacion-datos/api/query/use-conservacion-queries"
import type { ConservacionTab } from "@/features/administration/conservacion-datos/api/schema"
import { AmpliacionesTab } from "@/features/administration/conservacion-datos/components/ampliaciones-tab"
import { ArchivoTab } from "@/features/administration/conservacion-datos/components/archivo-tab"
import { PoliticasTab } from "@/features/administration/conservacion-datos/components/politicas-tab"
import { VencidosTab } from "@/features/administration/conservacion-datos/components/vencidos-tab"

const TAB_LABELS: Record<ConservacionTab, string> = {
  politicas: "Políticas",
  ampliaciones: "Ampliaciones",
  vencidos: "Vencidos",
  archivo: "Archivo histórico",
}

export function ConservacionDatosPage() {
  return (
    <NoticeProvider>
      <ConservacionDatosContent />
    </NoticeProvider>
  )
}

/**
 * Sección 6.4 (Regla 29 y 36). Superadministrador: todo. Administrador y Gestor
 * del establecimiento: consultan políticas, alargan plazos y consultan el
 * archivo de su establecimiento; Vencidos no lo ven.
 */
function ConservacionDatosContent() {
  const navigate = useNavigate()
  const search = conservacionDatosRoute.useSearch()
  const permisos = useMenuPermission("CONSERVACION_DATOS")
  const { data: user } = useUser()
  const esSuperAdmin = user?.isSuperAdmin === true
  const vencidos = useVencidosQuery(esSuperAdmin)

  const tabs: ConservacionTab[] = esSuperAdmin
    ? ["politicas", "ampliaciones", "vencidos", "archivo"]
    : ["politicas", "ampliaciones", "archivo"]
  const tab = search.tab && tabs.includes(search.tab) ? search.tab : "politicas"
  const editaPoliticas = esSuperAdmin && permisos.puedeEditar
  const lotes = vencidos.data?.length ?? 0
  // Cada pestaña dibuja su barra (buscador y botones) aquí, en el encabezado, con un portal: así queda
  // como en las demás vistas, con la línea que la separa de la tabla.
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)

  // Cada pestaña arranca sin filtros ni página.
  const irA = (next: ConservacionTab) =>
    navigate({ to: paths.app.conservacionDatos.getHref(), search: next === "politicas" ? {} : { tab: next } })

  return (
    <TableScreen>
      <TableScreenHeader>
        {/* Reglas de UI: el botón de crear de cada pestaña va en su línea de herramientas, no en el título. */}
        <TableScreenTitle>Conservación de datos</TableScreenTitle>
        <TableScreenTabs>
          <Tabs
            value={tab}
            onValueChange={(v) => irA(v as ConservacionTab)}
            aria-label="Pestañas de conservación de datos"
          >
            {/* El borde inferior ya lo pone TableScreenTabs. */}
            <TabsList className="border-b-0">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t}>
                  {TAB_LABELS[t]}
                  {t === "vencidos" && lotes > 0 ? (
                    <Badge variant="fill" color="warning" aria-label={`${lotes} lotes vencidos`} className="tabular-nums">
                      {lotes}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </TableScreenTabs>
        <div ref={setToolbarSlot} />
        {/* El banner recibe la clase en sí mismo: el margen va en un contenedor para que no quede pegado a las pestañas ni a los bordes. */}
        <div className="px-(--screen-spacing) pt-3 empty:hidden">
          <NoticeOutlet />
        </div>
      </TableScreenHeader>
      <TableScreenBody>
        {tab === "politicas" ? (
          <PoliticasTab puedeEditar={editaPoliticas} toolbarSlot={toolbarSlot} />
        ) : null}
        {tab === "ampliaciones" ? (
          <AmpliacionesTab
            esSuperAdmin={esSuperAdmin}
            puedeCrear={permisos.puedeCrear}
            puedeEditar={permisos.puedeEditar}
            toolbarSlot={toolbarSlot}
          />
        ) : null}
        {tab === "vencidos" ? <VencidosTab /> : null}
        {tab === "archivo" ? <ArchivoTab esSuperAdmin={esSuperAdmin} toolbarSlot={toolbarSlot} /> : null}
      </TableScreenBody>
    </TableScreen>
  )
}
