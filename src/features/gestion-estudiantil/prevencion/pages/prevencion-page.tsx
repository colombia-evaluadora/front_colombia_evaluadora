import { useMemo, useState } from "react"

import { TableScreen } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { CaracterizacionesTab } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/caracterizaciones-tab"
import { EstrategiasTab } from "@/features/gestion-estudiantil/prevencion/components/estrategias/estrategias-tab"
import { IndicadoresTab } from "@/features/gestion-estudiantil/prevencion/components/indicadores/indicadores-tab"
import { SaludMentalTab } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/salud-mental-tab"
import { ParametrosTab } from "@/features/gestion-estudiantil/prevencion/components/parametros/parametros-tab"
import { ValoracionesTab } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/valoraciones-tab"
import { TableroTab } from "@/features/gestion-estudiantil/prevencion/components/tablero/tablero-tab"

type Pestana = "tablero" | "valoraciones" | "salud-mental" | "estrategias" | "caracterizacion" | "indicadores" | "parametros"

const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "tablero", label: "Tablero de alertas" },
  { value: "valoraciones", label: "Valoraciones y planes" },
  { value: "salud-mental", label: "Salud mental" },
  { value: "estrategias", label: "Estrategias" },
  { value: "caracterizacion", label: "Caracterización" },
  { value: "indicadores", label: "Indicadores" },
  { value: "parametros", label: "Parámetros de riesgo" },
]

const CLAVE_PESTANA = "prevencion-pestana"

/** La pestaña vuelve a ser la misma al regresar de una pantalla propia (detalle, formulario). */
function pestanaGuardada(): Pestana {
  try {
    const guardada = sessionStorage.getItem(CLAVE_PESTANA)
    return PESTANAS.some((p) => p.value === guardada) ? (guardada as Pestana) : "tablero"
  } catch {
    return "tablero"
  }
}

function PrevencionContent() {
  const [pestana, setPestanaEstado] = useState<Pestana>(pestanaGuardada)
  const setPestana = (siguiente: Pestana) => {
    setPestanaEstado(siguiente)
    try {
      sessionStorage.setItem(CLAVE_PESTANA, siguiente)
    } catch {
      // Sin almacenamiento: la pestaña solo se recuerda mientras la página está montada.
    }
  }
  const { establecimientoId } = useAmbitoPrevencion("")
  // Las pestañas Indicadores, Parámetros, Salud mental, Estrategias y Caracterización salen del acceso que declara el backend.
  const acceso = useAccesoPrevencionQuery(establecimientoId).data

  const visibles = useMemo(
    () =>
      PESTANAS.filter(
        (p) =>
          (p.value !== "indicadores" || acceso?.puede_indicadores) &&
          (p.value !== "parametros" || acceso?.puede_parametros) &&
          (p.value !== "salud-mental" || acceso?.puede_salud_mental) &&
          (p.value !== "estrategias" || acceso?.puede_estrategias) &&
          (p.value !== "caracterizacion" || acceso?.puede_caracterizacion),
      ),
    [acceso],
  )
  const actual: Pestana = visibles.some((p) => p.value === pestana) ? pestana : "tablero"

  const tabs = (
    <Tabs value={actual} onValueChange={(v) => setPestana(v as Pestana)}>
      {/* El borde inferior ya lo pone TableScreenTabs. */}
      <TabsList className="border-b-0" aria-label="Secciones de prevención y retención">
        {visibles.map((p) => (
          <TabsTrigger key={p.value} value={p.value}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  if (actual === "tablero") return <TableroTab tabs={tabs} />
  if (actual === "valoraciones") return <ValoracionesTab tabs={tabs} />
  if (actual === "salud-mental") return <SaludMentalTab tabs={tabs} />
  if (actual === "estrategias") return <EstrategiasTab tabs={tabs} />
  if (actual === "caracterizacion") return <CaracterizacionesTab tabs={tabs} />
  if (actual === "indicadores") return <IndicadoresTab tabs={tabs} />
  return <ParametrosTab tabs={tabs} />
}

/** Prevención y retención (Gestión Estudiantil §9): tablero, valoraciones y planes, indicadores y parámetros. */
export function PrevencionPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <TablePaginationProvider>
          <PrevencionContent />
        </TablePaginationProvider>
      </TableScreen>
    </NoticeProvider>
  )
}
