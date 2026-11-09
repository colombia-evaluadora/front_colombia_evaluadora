import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { ControlPointIcon, FileDownloadOutlinedIcon, UsersThreeIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TableScreenTitle } from "@/components/layout/table-screen"
import { paths } from "@/config/paths"

import type { ConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"

export type PestanaConvivencia = "casos" | "comite" | "procesos"

interface Props {
  pestana: PestanaConvivencia
  onPestana: (p: PestanaConvivencia) => void
  access: ConvivenciaAccess
  /** Período del Comité al que apuntan «Integrantes» y «Nueva sesión» (el elegido o el abierto). */
  periodo?: number
  onExportarSiuce: () => void
}

/** Título, acciones y pestañas de Convivencia: las acciones cambian con la pestaña. */
export function CabeceraConvivencia({ pestana, onPestana, access, periodo, onExportarSiuce }: Props) {
  const nav = useComiteNavegacion()
  return (
    <>
      <TableScreenTitle
        action={
          <div className="flex flex-wrap items-center gap-2">
            {pestana === "comite" ? (
              access.puedeGestionarComite && (
                <>
                  <Button size="sm" variant="outline" color="neutral" onClick={() => nav.aIntegrantes(periodo)}>
                    <UsersThreeIcon data-icon="inline-start" />
                    Integrantes
                  </Button>
                  <Button size="sm" onClick={() => nav.aSesionNueva(periodo)}>
                    <ControlPointIcon data-icon="inline-start" />
                    Nueva sesión
                  </Button>
                </>
              )
            ) : pestana === "procesos" ? (
              access.puedeSupervisar && (
                <Button size="sm" render={<Link to={paths.app.convivenciaProcesoNuevo.getHref()} />} nativeButton={false}>
                  <ControlPointIcon data-icon="inline-start" />
                  Abrir proceso
                </Button>
              )
            ) : (
              <>
                <Button size="sm" variant="outline" color="neutral" disabled={!access.puedeExportarSiuce} onClick={onExportarSiuce}>
                  <FileDownloadOutlinedIcon data-icon="inline-start" />
                  Exportar para el SIUCE
                </Button>
                {access.puedeCrear && (
                  <Button size="sm" render={<Link to={paths.app.convivenciaNuevo.getHref()} />} nativeButton={false}>
                    <ControlPointIcon data-icon="inline-start" />
                    Nuevo caso
                  </Button>
                )}
              </>
            )}
          </div>
        }
      >
        Convivencia
      </TableScreenTitle>
      <Tabs value={pestana} onValueChange={(v) => onPestana(v as PestanaConvivencia)} className="px-(--screen-spacing)">
        <TabsList>
          <TabsTrigger value="casos">
            Casos
          </TabsTrigger>
          <TabsTrigger value="comite" disabled={!access.puedeVerComite}>
            Comité
          </TabsTrigger>
          <TabsTrigger value="procesos">
            Procesos disciplinarios
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  )
}
