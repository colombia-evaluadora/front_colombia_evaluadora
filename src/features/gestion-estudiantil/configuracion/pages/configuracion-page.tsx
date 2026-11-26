import { useCallback, useState } from "react"

import { TableScreen, TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { useConfiguracionAcceso } from "@/features/gestion-estudiantil/configuracion/hooks/use-configuracion-acceso"
import { CatalogoTab } from "@/features/gestion-estudiantil/configuracion/components/catalogo/catalogo-tab"
import { EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { NivelesTab } from "@/features/gestion-estudiantil/configuracion/components/niveles/niveles-tab"
import { ProcesoTab } from "@/features/gestion-estudiantil/configuracion/components/proceso-disciplinario/proceso-tab"
import { RiesgoTab } from "@/features/gestion-estudiantil/configuracion/components/riesgo/riesgo-tab"
import { ServicioSocialTab } from "@/features/gestion-estudiantil/configuracion/components/servicio-social/servicio-social-tab"
import { RemisionesTab } from "@/features/gestion-estudiantil/configuracion/components/remisiones/remisiones-tab"
import {
  PESTANAS_CONFIGURACION,
  guardarPestanaConfiguracion,
  pestanaConfiguracionGuardada,
  type PestanaConfiguracion,
} from "@/features/gestion-estudiantil/configuracion/utils/pestana"

function ConfiguracionContent() {
  const { goToPage } = useTablePagination()
  const { establecimiento: ee, acceso, cargando, sinEstablecimiento, error } = useConfiguracionAcceso()

  const [pestana, setPestanaEstado] = useState<PestanaConfiguracion>(pestanaConfiguracionGuardada)
  const setPestana = useCallback((siguiente: PestanaConfiguracion) => {
    setPestanaEstado(siguiente)
    guardarPestanaConfiguracion(siguiente)
  }, [])

  const tabs = (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <Tabs value={pestana} onValueChange={(v) => setPestana(v as PestanaConfiguracion)}>
        {/* El borde inferior ya lo pone TableScreenTabs. */}
        <TabsList className="border-b-0" aria-label="Secciones de configuración">
          {PESTANAS_CONFIGURACION.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {/* Todo es del establecimiento (sin Sede ni Jornada): con varios, se elige. */}
      {ee.opciones.length > 1 && (
        <div className="w-full pb-2 sm:w-80">
          <ComboOpciones
            id="configuracion-establecimiento"
            label="Establecimiento"
            todos={false}
            value={ee.valor}
            options={ee.opciones}
            onChange={(v) => {
              ee.elegir(v)
              goToPage(0)
            }}
          />
        </div>
      )}
    </div>
  )

  if (error) {
    return (
      <>
        <EncabezadoConfiguracion tabs={tabs} />
        <TableScreenBody>
          <ErrorNoticeBanner error={error} />
        </TableScreenBody>
      </>
    )
  }

  if (sinEstablecimiento) {
    return (
      <>
        <EncabezadoConfiguracion tabs={tabs} />
        <TableScreenBody>
          <Alert className="m-4 w-auto">
            <AlertDescription>
              No tiene establecimientos asignados para configurar. Solicite al administrador que le asigne una sede.
            </AlertDescription>
          </Alert>
        </TableScreenBody>
      </>
    )
  }

  const props = { tabs, establecimiento: ee.id, acceso }
  if (pestana === "catalogo") return <CatalogoTab {...props} cargandoEstablecimiento={cargando} />
  if (pestana === "proceso") return <ProcesoTab {...props} />
  if (pestana === "remisiones") return <RemisionesTab {...props} />
  if (pestana === "riesgo") return <RiesgoTab {...props} />
  if (pestana === "servicio-social") return <ServicioSocialTab {...props} />
  return <NivelesTab {...props} />
}

/** Configuración de Gestión Estudiantil (§13, G.10): parámetros y catálogos del establecimiento, en pestañas. */
export function ConfiguracionPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <ConfiguracionContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
