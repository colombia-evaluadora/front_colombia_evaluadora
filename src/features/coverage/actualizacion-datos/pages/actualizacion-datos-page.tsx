import { TableScreenTabs } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { coberturaActualizacionDatosRoute } from "@/router"

import { usePendientesCountQuery } from "@/features/coverage/actualizacion-datos/api/actualizacion"
import type { PestanaActualizacion } from "@/features/coverage/actualizacion-datos/api/schema"
import { ConfiguracionTab } from "@/features/coverage/actualizacion-datos/components/configuracion-tab"
import { SolicitudesTab } from "@/features/coverage/actualizacion-datos/components/solicitudes-tab"

/** Vista Actualización de datos (C.6.CFG y C.6.SOL; Sección 2.19, Regla 69). */
export function ActualizacionDatosPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

function Contenido() {
  const { tab = "configuracion" } = coberturaActualizacionDatosRoute.useSearch()
  const navigate = coberturaActualizacionDatosRoute.useNavigate()
  const { data: pendientes } = usePendientesCountQuery()

  const pestanas = (
    <TableScreenTabs>
      <Tabs
        value={tab}
        // Cada pestaña tiene sus filtros: al cambiar se limpian.
        onValueChange={(value) => navigate({ search: { tab: value === "configuracion" ? undefined : (value as PestanaActualizacion) } })}
      >
        <TabsList className="border-b-0">
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes de corrección{pendientes ? ` (${pendientes})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>
    </TableScreenTabs>
  )

  return tab === "configuracion" ? <ConfiguracionTab pestanas={pestanas} /> : <SolicitudesTab pestanas={pestanas} />
}
