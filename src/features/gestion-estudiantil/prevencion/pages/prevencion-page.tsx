import { useMemo, useState } from "react"

import { TableScreen } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { IndicadoresTab } from "@/features/gestion-estudiantil/prevencion/components/indicadores/indicadores-tab"
import { SaludMentalTab } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/salud-mental-tab"
import { ParametrosTab } from "@/features/gestion-estudiantil/prevencion/components/parametros/parametros-tab"
import { ValoracionesTab } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/valoraciones-tab"
import { TableroTab } from "@/features/gestion-estudiantil/prevencion/components/tablero/tablero-tab"

type Pestana = "tablero" | "valoraciones" | "salud-mental" | "indicadores" | "parametros"

const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "tablero", label: "Tablero de alertas" },
  { value: "valoraciones", label: "Valoraciones y planes" },
  { value: "salud-mental", label: "Salud mental" },
  { value: "indicadores", label: "Indicadores" },
  { value: "parametros", label: "Parámetros de riesgo" },
]

function PrevencionContent() {
  const [pestana, setPestana] = useState<Pestana>("tablero")
  const { establecimientoId } = useAmbitoPrevencion("")
  // Las pestañas Indicadores, Parámetros y Salud mental salen del acceso que declara el backend.
  const acceso = useAccesoPrevencionQuery(establecimientoId).data

  const visibles = useMemo(
    () =>
      PESTANAS.filter(
        (p) =>
          (p.value !== "indicadores" || acceso?.puede_indicadores) &&
          (p.value !== "parametros" || acceso?.puede_parametros) &&
          (p.value !== "salud-mental" || acceso?.puede_salud_mental),
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
