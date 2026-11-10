import type { ReactNode } from "react"

import { TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { coberturaInscritosRoute } from "@/router"

import {
  formatPeriodo,
  usePeriodosInscripcionesQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reservas-cupo-query"
import type { PestanaInscripcion } from "@/features/coverage/inscripcion-reservas/api/schema"
import { ReservasCupoTable } from "@/features/coverage/inscripcion-reservas/components/table/reservas-cupo-table"
import { InscripcionesTable } from "@/features/coverage/inscripcion-reservas/components/table/inscripciones-table"
import { ConfiguracionTab } from "@/features/coverage/inscripcion-reservas/components/table/configuracion-tables"
import { TerritorialTab } from "@/features/coverage/inscripcion-reservas/components/table/territorial-tab"
import { useContextoTerritorialQuery } from "@/features/coverage/inscripcion-reservas/api/query/use-territorial-query"
import {
  formatGrupoAdmision,
  useGrupoAdmisionQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"

const PESTANAS: { value: PestanaInscripcion; label: string }[] = [
  { value: "reservas", label: "Reservas de cupo" },
  { value: "inscripciones", label: "Inscripciones" },
  { value: "configuracion", label: "Configuración" },
  { value: "territorial", label: "Entidad territorial" },
]

/** Vista "Inscripción y reservas" (Cobertura Educativa, Sección 3). Entidad territorial solo para los roles territoriales (3.10). */
export function InscripcionReservasPage() {
  const { tab = "reservas" } = coberturaInscritosRoute.useSearch()
  const navigate = coberturaInscritosRoute.useNavigate()
  const { data: periodos } = usePeriodosInscripcionesQuery()
  const { data: grupo } = useGrupoAdmisionQuery()
  const siguiente = periodos?.[0]
  // Solo el Supervisor territorial y el Administrador territorial reciben contexto (3.10).
  const { data: territorial } = useContextoTerritorialQuery()
  const pestanas = PESTANAS.filter((p) => p.value !== "territorial" || territorial)
  const tabActual = tab === "territorial" && !territorial ? "reservas" : tab

  // Reservas habla del período siguiente; Inscripciones, del grupo de admisión.
  const n = territorial?.establecimientos.length ?? 0
  const contexto =
    tabActual === "territorial"
      ? territorial && `${territorial.rol} · ${n} establecimiento${n === 1 ? "" : "s"}`
      : tabActual === "inscripciones"
        ? grupo && `Grupo: ${formatGrupoAdmision(grupo)}`
        : siguiente && `Período siguiente: ${formatPeriodo(siguiente)}`

  const encabezadoCon = (accion?: ReactNode) => (
    <>
      <TableScreenTitle action={accion}>
        <span className="flex items-center gap-3">
          Inscripción y reservas
          {contexto && (
            <Badge variant="soft" color="info" className="text-xs font-medium tracking-normal">
              <span aria-hidden className="size-1.5 rounded-full bg-current" />
              {contexto}
            </Badge>
          )}
        </span>
      </TableScreenTitle>
      <TableScreenTabs>
        <Tabs
          value={tabActual}
          onValueChange={(value) =>
            navigate({
              search: { tab: value === "reservas" ? undefined : (value as PestanaInscripcion) },
            })
          }
        >
          <TabsList className="border-b-0">
            {pestanas.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </TableScreenTabs>
    </>
  )

  const encabezado = encabezadoCon()
  if (tabActual === "territorial") return <TerritorialTab encabezado={encabezadoCon} />
  if (tabActual === "reservas") return <ReservasCupoTable encabezado={encabezado} />
  if (tabActual === "inscripciones") return <InscripcionesTable encabezado={encabezado} />
  return <ConfiguracionTab encabezado={encabezado} />
}
