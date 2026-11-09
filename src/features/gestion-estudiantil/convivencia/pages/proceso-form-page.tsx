import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"
import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/components/icono-carga"
import { ConstructorCargos } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/constructor-cargos"
import { ConstructorPruebas } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/constructor-pruebas"
import { SeccionDatosApertura } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/seccion-datos-apertura"
import { SeccionEstudianteOrigen } from "@/features/gestion-estudiantil/convivencia/components/procesos/form/seccion-estudiante-origen"
import { useProcesoForm, type OrigenProceso } from "@/features/gestion-estudiantil/convivencia/hooks/use-proceso-form"

function ProcesoForm({ origen }: { origen: OrigenProceso }) {
  const form = useProcesoForm(origen)
  const { guardando, guardar, volver } = form
  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar} disabled={guardando}>
                <IconoCarga cargando={guardando}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Abrir proceso
              </Button>
            </div>
          }
        >
          Convivencia › Abrir proceso disciplinario
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <SeccionEstudianteOrigen form={form} />
          <SeccionDatosApertura form={form} />
          <ConstructorCargos form={form} />
          <ConstructorPruebas form={form} />
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              Al guardar, los cargos se comunican al acudiente en el portal y por correo, y se crea la citación a la
              diligencia de descargos. Los cargos y las pruebas no se modifican después; si hay un error, se anula el
              proceso y se abre uno nuevo.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Abrir proceso disciplinario (G.2.PRD.ABR.1). Llega vacío, desde una anotación o desde un caso. */
export function ProcesoFormPage({ origen }: { origen: OrigenProceso }) {
  const clave = `${origen.matricula ?? ""}-${origen.anotacion ?? ""}-${origen.caso ?? ""}`
  return (
    <NoticeProvider>
      <TableScreen>
        <ProcesoForm key={clave} origen={origen} />
      </TableScreen>
    </NoticeProvider>
  )
}
