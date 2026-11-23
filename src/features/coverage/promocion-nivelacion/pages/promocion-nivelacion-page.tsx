import { useState } from "react"

import { TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CaretDownIcon, FileDownloadOutlinedIcon, SpinnerIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { downloadReport } from "@/lib/report-client"
import { coberturaPromocionRoute } from "@/router"

import { filtrosPendientes, filtrosReprobados } from "@/features/coverage/promocion-nivelacion/api/promocion"
import type { PestanaPromocion } from "@/features/coverage/promocion-nivelacion/api/schema"
import { AreasPendientesTab } from "@/features/coverage/promocion-nivelacion/components/areas-pendientes-tab"
import { ReprobadosTab } from "@/features/coverage/promocion-nivelacion/components/reprobados-tab"

const PESTANAS: { value: PestanaPromocion; label: string }[] = [
  { value: "reprobados", label: "Reprobados" },
  { value: "pendientes", label: "Áreas pendientes" },
]

/** Vista Promoción y nivelación (C.5.REP y C.5.PEN; Sección 4.7, Reglas 64 y 65). */
export function PromocionNivelacionPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

/** Exportar en Excel o PDF la pestaña abierta, con sus filtros (Regla 47). */
function Exportar() {
  const search = coberturaPromocionRoute.useSearch()
  const { notify } = useNotify()
  const [pendiente, setPendiente] = useState(false)
  const reprobados = (search.tab ?? "reprobados") === "reprobados"

  async function exportar(format: "excel" | "pdf") {
    setPendiente(true)
    const r = await downloadReport(reprobados ? "promocion-reprobados" : "promocion-areas-pendientes", {
      format,
      filters: reprobados ? filtrosReprobados(search) : filtrosPendientes(search),
    })
    setPendiente(false)
    if (r.status === "error") notify(r.message, { variant: "error" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" color="neutral" size="sm" disabled={pendiente} />}>
        {pendiente ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
        Exportar
        <CaretDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void exportar("excel")}>Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportar("pdf")}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Contenido() {
  const { tab = "reprobados" } = coberturaPromocionRoute.useSearch()
  const navigate = coberturaPromocionRoute.useNavigate()

  const encabezado = (
    <>
      <TableScreenTitle action={<Exportar />}>Promoción y nivelación</TableScreenTitle>
      <TableScreenTabs>
        <Tabs
          value={tab}
          // Cada pestaña tiene sus filtros: al cambiar se limpian.
          onValueChange={(value) => navigate({ search: { tab: value === "reprobados" ? undefined : (value as PestanaPromocion) } })}
        >
          <TabsList className="border-b-0">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </TableScreenTabs>
    </>
  )

  return tab === "reprobados" ? <ReprobadosTab encabezado={encabezado} /> : <AreasPendientesTab encabezado={encabezado} />
}
