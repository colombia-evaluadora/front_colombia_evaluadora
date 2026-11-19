import { useMemo, useState } from "react"

import { TableScreen } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"
import { useAccesoPrevencionQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-parametros-indicadores-query"
import { AcompanamientosTab } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acompanamientos-tab"
import { GestionAlertasTab } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/gestion-alertas-tab"
import { useGestionAlertasContadorQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import { CaracterizacionesTab } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/caracterizaciones-tab"
import { EstrategiasTab } from "@/features/gestion-estudiantil/prevencion/components/estrategias/estrategias-tab"
import { IndicadoresTab } from "@/features/gestion-estudiantil/prevencion/components/indicadores/indicadores-tab"
import { SaludMentalTab } from "@/features/gestion-estudiantil/prevencion/components/salud-mental/salud-mental-tab"
import { ValoracionesTab } from "@/features/gestion-estudiantil/prevencion/components/valoraciones/valoraciones-tab"
import { TableroTab } from "@/features/gestion-estudiantil/prevencion/components/tablero/tablero-tab"

type Pestana = "tablero" | "valoraciones" | "gestion-alertas" | "salud-mental" | "embarazo" | "consumo" | "estrategias" | "caracterizacion" | "indicadores"

const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "tablero", label: "Tablero de alertas" },
  { value: "valoraciones", label: "Valoraciones y planes" },
  { value: "gestion-alertas", label: "Gestión de alertas" },
  { value: "salud-mental", label: "Salud mental" },
  { value: "embarazo", label: "Embarazo y maternidad/paternidad" },
  { value: "consumo", label: "Consumo de sustancias" },
  { value: "estrategias", label: "Estrategias" },
  { value: "caracterizacion", label: "Caracterización" },
  { value: "indicadores", label: "Indicadores" },
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
  // Las pestañas Indicadores, Salud mental, Embarazo, Consumo, Estrategias y Caracterización salen del acceso que declara el backend.
  const acceso = useAccesoPrevencionQuery(establecimientoId).data
  const contador = useGestionAlertasContadorQuery(acceso?.ver_gestion_alertas === true).data ?? 0

  const visibles = useMemo(
    () =>
      PESTANAS.filter(
        (p) =>
          (p.value !== "indicadores" || acceso?.puede_indicadores) &&
          (p.value !== "salud-mental" || acceso?.puede_salud_mental) &&
          (p.value !== "gestion-alertas" || acceso?.ver_gestion_alertas) &&
          (p.value !== "embarazo" || acceso?.ver_embarazo) &&
          (p.value !== "consumo" || acceso?.ver_consumo) &&
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
            {/* Contador (§9.11): gestiones del usuario Pendientes o vencidas; sin ninguna, sin número. */}
            {p.value === "gestion-alertas" && contador ? `${p.label} (${contador})` : p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )

  if (actual === "tablero") return <TableroTab tabs={tabs} />
  if (actual === "valoraciones") return <ValoracionesTab tabs={tabs} />
  if (actual === "salud-mental") return <SaludMentalTab tabs={tabs} />
  // Banderas del backend (fn_prevencion_acceso): crear es de orientación; el SIUCE, de Supervisor y Administrador.
  const puedeCrear = acceso?.puede_crear_acomp === true
  const puedeExportar = acceso?.puede_exportar_siuce_acomp === true
  if (actual === "gestion-alertas") return <GestionAlertasTab tabs={tabs} />
  if (actual === "embarazo") return <AcompanamientosTab tabs={tabs} tipo="EMBARAZO" puedeCrear={puedeCrear} puedeExportar={puedeExportar} />
  if (actual === "consumo")
    return <AcompanamientosTab tabs={tabs} tipo="CONSUMO" verReportes={acceso?.ver_reportes_consumo === true} puedeCrear={puedeCrear} puedeExportar={puedeExportar} />
  if (actual === "estrategias") return <EstrategiasTab tabs={tabs} />
  if (actual === "caracterizacion") return <CaracterizacionesTab tabs={tabs} />
  return <IndicadoresTab tabs={tabs} />
}

/** Prevención y retención (Gestión Estudiantil §9): tablero, valoraciones y planes, e indicadores (los parámetros de riesgo viven en Configuración). */
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
