import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ControlPointIcon, InfoIcon, WarningIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { TablePaginationProvider } from "@/hooks/use-table-pagination"

import { useConvivenciaAccess } from "@/features/gestion-estudiantil/convivencia/api/use-convivencia-access"
import { ComboOpciones } from "@/features/gestion-estudiantil/convivencia/components/combo-opciones"
import { RecuadroIntegrantes } from "@/features/gestion-estudiantil/convivencia/components/comite/recuadro-integrantes"
import { SeccionSesiones } from "@/features/gestion-estudiantil/convivencia/components/comite/seccion-sesiones"
import { useComiteNavegacion } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-navegacion"
import { useComiteTab } from "@/features/gestion-estudiantil/convivencia/hooks/use-comite-tab"
import { rotuloPeriodo } from "@/features/gestion-estudiantil/convivencia/utils/comite"

interface Props {
  periodo?: number
  onPeriodoChange: (periodo: number) => void
}

function Contenido({ periodo, onPeriodoChange }: Props) {
  const { puedeGestionarComite } = useConvivenciaAccess()
  const nav = useComiteNavegacion()
  const tab = useComiteTab(periodo)
  const { actual, comite } = tab

  if (tab.periodos.isPending) return <Skeleton className="h-96" />
  if (tab.periodos.isError) return <ErrorNoticeBanner error={tab.periodos.error} fallback="No se pudieron cargar los períodos." />
  if (!actual)
    return (
      <Alert>
        <InfoIcon aria-hidden="true" />
        <AlertDescription>No hay períodos académicos para el Comité de Convivencia.</AlertDescription>
      </Alert>
    )

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="w-full">
        <ComboOpciones
          id="comite-periodo"
          label="Período Académico"
          size="default"
          todos={false}
          value={String(actual.fk_periodo)}
          options={tab.lista.map((p) => ({ value: String(p.fk_periodo), label: rotuloPeriodo(p) }))}
          onChange={(v) => v && onPeriodoChange(Number(v))}
        />
      </div>

      {comite.isPending ? (
        <Skeleton className="h-64" />
      ) : comite.isError || !comite.data ? (
        <ErrorNoticeBanner error={comite.error ?? true} fallback="No se pudo cargar el Comité." />
      ) : comite.data.fk_comite == null ? (
        <Alert>
          <InfoIcon aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>Este período aún no tiene Comité de Convivencia.{puedeGestionarComite && " Registre a sus integrantes para empezar a documentar sesiones."}</span>
            {puedeGestionarComite && (
              <Button size="sm" onClick={() => nav.aIntegrantes(actual.fk_periodo)}>
                <ControlPointIcon data-icon="inline-start" />
                Registrar integrantes
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <RecuadroIntegrantes
            comite={comite.data}
            puedeGestionar={puedeGestionarComite}
            onAdministrar={() => nav.aIntegrantes(actual.fk_periodo)}
          />
          {comite.data.sin_ordinaria_dos_meses && (
            <Alert variant="warning">
              <WarningIcon aria-hidden="true" />
              <AlertDescription>
                Hace más de dos meses que el Comité no realiza una sesión ordinaria.
              </AlertDescription>
            </Alert>
          )}
          <SeccionSesiones
            tab={tab}
            puedeGestionar={puedeGestionarComite}
            onVer={nav.aSesion}
            onModificar={nav.aSesionEditar}
          />
        </>
      )}
    </div>
  )
}

/** Pestaña «Comité» de Convivencia (G.2.COM.SES.1): período, integrantes y sesiones. */
export function TabComite(props: Props) {
  return (
    // key: al cambiar de período la tabla vuelve a la primera página.
    <TablePaginationProvider key={props.periodo ?? "abierto"}>
      <Contenido {...props} />
    </TablePaginationProvider>
  )
}
