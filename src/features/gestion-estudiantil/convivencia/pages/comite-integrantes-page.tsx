import { useState } from "react"

import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, SpinnerIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import type { ComiteDetalle, PeriodoComite } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import { useComiteQuery, usePeriodosComiteQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-comite-query"
import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { FormularioIntegrantes } from "@/features/gestion-estudiantil/convivencia/components/comite/formulario-integrantes"
import { useComiteIntegrantes } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-integrantes"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"
import { periodoPorDefecto, rotuloPeriodo } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface ContenidoProps {
  periodo: PeriodoComite
  periodos: PeriodoComite[]
  comite: ComiteDetalle
  onPeriodo: (periodo: number) => void
}

function Contenido({ periodo, periodos, comite, onPeriodo }: ContenidoProps) {
  const { puedeGestionarComite } = useConvivenciaAccess()
  const form = useComiteIntegrantes({ periodo, comite, periodos })
  const nav = useComiteNavegacion()

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="muted" onClick={form.volver} disabled={form.guardando}>
                {puedeGestionarComite ? "Cancelar" : "Volver"}
              </Button>
              {puedeGestionarComite && (
                <Button size="sm" onClick={form.guardar} disabled={form.guardando}>
                  {form.guardando ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <FloppyDiskIcon data-icon="inline-start" />
                  )}
                  Guardar
                </Button>
              )}
            </div>
          }
        >
          {form.existe ? "Convivencia › Comité › Integrantes" : "Convivencia › Comité › Registrar integrantes"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-5">
          <ComboOpciones
            id="int-periodo"
            label="Período Académico"
            size="default"
            todos={false}
            value={String(periodo.fk_periodo)}
            options={periodos.map((p) => ({ value: String(p.fk_periodo), label: rotuloPeriodo(p) }))}
            onChange={(v) => {
              if (!v) return
              onPeriodo(Number(v))
              nav.cambiarPeriodoIntegrantes(Number(v))
            }}
          />
        </div>
        <FormularioIntegrantes form={form} comite={comite} puedeEscribir={puedeGestionarComite} />
      </TableScreenBody>
    </>
  )
}

/** Registrar o completar los integrantes del Comité de un período (G.2.COM.INT.1). El período llega por props desde router.tsx. */
export function ComiteIntegrantesPage({ periodo }: { periodo?: number }) {
  const periodos = usePeriodosComiteQuery()
  const [elegido, setElegido] = useState<number | undefined>(periodo)
  const lista = periodos.data ?? []
  const actual = lista.find((p) => p.fk_periodo === elegido) ?? periodoPorDefecto(lista)
  const comite = useComiteQuery(actual?.fk_periodo ?? null)

  return (
    <NoticeProvider>
      <TableScreen>
        {periodos.isPending || (actual != null && comite.isPending) ? (
          <Skeleton className="m-6 h-96" />
        ) : periodos.isError || comite.isError || !actual || !comite.data ? (
          <ErrorNoticeBanner
            error={periodos.error ?? comite.error ?? true}
            fallback={actual ? "No se pudo cargar el Comité." : "No hay períodos académicos para registrar el Comité."}
            className="m-6"
          />
        ) : (
          // Al cambiar de período, o al refrescarse los integrantes, el constructor arranca de cero con lo guardado.
          <Contenido
            key={`${actual.fk_periodo}-${comite.data.fk_comite}-${comite.data.integrantes.map((i) => i.id).join(",")}`}
            periodo={actual}
            periodos={lista}
            comite={comite.data}
            onPeriodo={setElegido}
          />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
