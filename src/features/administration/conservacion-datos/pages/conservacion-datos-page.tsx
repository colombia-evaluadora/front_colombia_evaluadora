import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"
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
  const [nuevaAmpliacion, setNuevaAmpliacion] = useState(false)

  // Cada pestaña arranca sin filtros ni página.
  const irA = (next: ConservacionTab) =>
    navigate({ to: paths.app.conservacionDatos.getHref(), search: next === "politicas" ? {} : { tab: next } })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            tab === "politicas" && editaPoliticas ? (
              <TableScreenActions>
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => navigate({ to: paths.app.conservacionPoliticaNueva.getHref() })}
                >
                  <ControlPointIcon data-icon="inline-start" />
                  Política
                </Button>
              </TableScreenActions>
            ) : tab === "ampliaciones" && permisos.puedeCrear ? (
              <TableScreenActions>
                <Button color="primary" size="sm" onClick={() => setNuevaAmpliacion(true)}>
                  <ControlPointIcon data-icon="inline-start" />
                  Ampliación
                </Button>
              </TableScreenActions>
            ) : null
          }
        >
          Conservación de datos
        </TableScreenTitle>
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
        <NoticeOutlet className="px-(--screen-spacing) pb-3 empty:hidden" />
      </TableScreenHeader>
      <TableScreenBody>
        {tab === "politicas" ? <PoliticasTab puedeEditar={editaPoliticas} /> : null}
        {tab === "ampliaciones" ? (
          <AmpliacionesTab
            esSuperAdmin={esSuperAdmin}
            puedeEditar={permisos.puedeEditar}
            nuevaAbierta={nuevaAmpliacion}
            onCerrarNueva={() => setNuevaAmpliacion(false)}
          />
        ) : null}
        {tab === "vencidos" ? <VencidosTab /> : null}
        {tab === "archivo" ? <ArchivoTab esSuperAdmin={esSuperAdmin} /> : null}
      </TableScreenBody>
    </TableScreen>
  )
}
