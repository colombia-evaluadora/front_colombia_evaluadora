import { useState } from "react"

import { TableScreenBody } from "@/components/layout/table-screen"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useVolverReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-volver-reintegracion"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import type { AccionCaso } from "@/features/gestion-estudiantil/reintegracion/components/acciones-caso"
import { useDialogosCaso } from "@/features/gestion-estudiantil/reintegracion/components/use-dialogos-caso"
import { EncabezadoCaso } from "@/features/gestion-estudiantil/reintegracion/components/detalle/encabezado-caso"
import { ResumenCaso } from "@/features/gestion-estudiantil/reintegracion/components/detalle/resumen-caso"
import { TabFicha } from "@/features/gestion-estudiantil/reintegracion/components/detalle/tab-ficha"
import { TabHistorial } from "@/features/gestion-estudiantil/reintegracion/components/detalle/tab-historial"
import { TabIntervenciones } from "@/features/gestion-estudiantil/reintegracion/components/detalle/tab-intervenciones"
import { TabRemisiones } from "@/features/gestion-estudiantil/reintegracion/components/detalle/tab-remisiones"
import { useNavegacionReintegracion } from "@/features/gestion-estudiantil/reintegracion/hooks/use-navegacion-reintegracion"

type Pestana = "ficha" | "historial" | "intervenciones" | "remisiones"

const PESTANAS: { value: Pestana; label: string }[] = [
  { value: "ficha", label: "Ficha" },
  { value: "historial", label: "Historial de prevención" },
  { value: "intervenciones", label: "Intervenciones" },
  { value: "remisiones", label: "Remisiones" },
]

/** Detalle del caso (G.9.CAS.1-2): cabecera con acciones, resumen y las cuatro pestañas. */
export function CasoDetalleContenido({ caso }: { caso: CasoDetalle }) {
  const [pestana, setPestana] = useState<Pestana>("ficha")
  const volver = useVolverReintegracion()
  const { irCaso, irCasoConvivencia } = useNavegacionReintegracion()
  const dialogos = useDialogosCaso()

  const onAccion = (accion: AccionCaso) => dialogos.abrir(accion, caso.id)

  return (
    <>
      <EncabezadoCaso caso={caso} onVolver={volver} onAccion={onAccion} />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ResumenCaso caso={caso} onCasoAnterior={irCaso} onCasoConvivencia={irCasoConvivencia} />
          <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)}>
            <TabsList aria-label="Secciones del caso">
              {PESTANAS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {pestana === "ficha" && <TabFicha key={caso.id} caso={caso} />}
          {pestana === "historial" && <TabHistorial caso={caso} />}
          {pestana === "intervenciones" && <TabIntervenciones caso={caso} onRegistrar={() => dialogos.abrir("intervencion", caso.id)} />}
          {pestana === "remisiones" && <TabRemisiones casoId={caso.id} />}
        </div>
      </TableScreenBody>
      {dialogos.dialogos}
    </>
  )
}
