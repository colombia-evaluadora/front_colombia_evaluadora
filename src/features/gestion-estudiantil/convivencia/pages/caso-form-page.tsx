import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon, SpinnerIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { useCasoQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-casos-query"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { ConstructoresInvolucrados } from "@/features/gestion-estudiantil/convivencia/components/constructores-involucrados"
import { GestorPrevisto } from "@/features/gestion-estudiantil/convivencia/components/form/gestor-previsto"
import { SeccionDatosCaso } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-datos-caso"
import { SeccionFechas } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-fechas"
import { SeccionSiuce } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-siuce"
import { TextoLargo } from "@/features/gestion-estudiantil/convivencia/components/texto-largo"
import { useCasoForm } from "@/features/gestion-estudiantil/convivencia/hooks/use-caso-form"

function CasoForm({ caso }: { caso?: CasoDetalle }) {
  const form = useCasoForm(caso)
  const { v, set, errores, editar, grave, guardando, guardar, volver } = form

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="muted" onClick={volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>
                {guardando ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {caso ? `Convivencia › Caso ${caso.numero} › Modificar` : "Convivencia › Nuevo caso"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <SeccionDatosCaso form={form} />
          <SeccionFechas form={form} />

          <TextoLargo
            id="caso-descripcion"
            label="Descripción de los hechos"
            required
            rows={5}
            max={3000}
            value={v.descripcion}
            onChange={(descripcion) => set({ descripcion })}
            error={errores.descripcion}
          />

          <SeccionSiuce form={form} />
          <GestorPrevisto previsto={form.gestorPrevisto} />

          <ConstructoresInvolucrados
            estudiantes={v.estudiantes}
            onEstudiantes={(estudiantes) => set({ estudiantes })}
            involucrados={v.involucrados}
            onInvolucrados={(involucrados) => set({ involucrados })}
            errorEstudiantes={errores.estudiantes}
            errorInvolucrados={errores.involucrados}
            mostrarErrores={form.intento}
            casoId={caso?.id}
          />

          {grave && !editar && (
            <Alert>
              <InfoIcon aria-hidden="true" />
              <AlertDescription>
                Los datos de un caso {form.tipoLabel} son sensibles: solo los ven quien lo gestiona, el Supervisor de
                sede y orientación. Quien reporta solo verá el estado del caso.
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

export function NuevoCasoPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <CasoForm />
      </TableScreen>
    </NoticeProvider>
  )
}

/** Modificar el caso y corregir fechas (G.2.CAS.GES.3). El id llega por props desde router.tsx. */
export function EditarCasoPage({ casoId }: { casoId: number }) {
  const { data, isPending, isError, error } = useCasoQuery(casoId)
  return (
    <NoticeProvider>
      <TableScreen>
        {isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : isError || !data ? (
          <ErrorNoticeBanner error={error ?? true} fallback="No se encontró el caso." className="m-6" />
        ) : !data.acceso_completo ? (
          <ErrorNoticeBanner error={true} fallback="No tiene acceso a los datos de este caso." className="m-6" />
        ) : (
          <CasoForm key={data.id} caso={data} />
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
