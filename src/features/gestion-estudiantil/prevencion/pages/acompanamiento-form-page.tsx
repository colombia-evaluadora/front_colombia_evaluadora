import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import type { TipoAcompanamiento } from "@/features/gestion-estudiantil/prevencion/api/types"
import { TITULO_ACOMP } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BadgeEstadoAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"
import { CamposAcompanamiento } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/form/campos-acompanamiento"
import { DialogoDuplicado } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/form/dialogo-duplicado"
import { useAcompanamientoForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-acompanamiento-form"

function FormContent(props: { tipo?: TipoAcompanamiento; acompId?: number }) {
  const f = useAcompanamientoForm(props)
  const d = f.detalle
  const titulo = f.editar
    ? `Prevención › ${TITULO_ACOMP[f.tipo]}${d ? ` · ${d.contexto.estudiante_nombre ?? ""}` : ""}`
    : `Prevención › Nuevo ${TITULO_ACOMP[f.tipo].charAt(0).toLowerCase()}${TITULO_ACOMP[f.tipo].slice(1)}`

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending || f.cargando} onClick={f.guardar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
            {titulo}
            {d && <BadgeEstadoAcomp estado={d.estado} nombre={d.estado_nombre} />}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        {f.cargando ? (
          <Skeleton className="h-96" />
        ) : f.errorCarga ? (
          <ErrorNoticeBanner error={f.errorCarga} fallback="No se encontró el acompañamiento solicitado." />
        ) : (
          <CamposAcompanamiento f={f} />
        )}
      </TableScreenBody>
      {f.duplicado && (
        <DialogoDuplicado
          mensaje={f.duplicado}
          tipo={f.tipo}
          matricula={f.matricula}
          pending={f.pending}
          onClose={f.cerrarDuplicado}
          onCrear={f.crearDeTodosModos}
        />
      )}
    </>
  )
}

/** Nuevo (por tipo) o Modificar (por id) acompañamiento de §9.9 / §9.10. */
export function AcompanamientoFormPage({ tipo, acompId }: { tipo?: TipoAcompanamiento; acompId?: number }) {
  return (
    <NoticeProvider>
      <TableScreen>
        <FormContent key={acompId ?? tipo} tipo={tipo} acompId={acompId} />
      </TableScreen>
    </NoticeProvider>
  )
}
