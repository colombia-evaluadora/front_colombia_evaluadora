import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { FormularioAbrirCaso } from "@/features/gestion-estudiantil/reintegracion/components/formulario-abrir-caso"
import { useAbrirCasoForm } from "@/features/gestion-estudiantil/reintegracion/hooks/use-abrir-caso-form"

function AbrirCasoContent() {
  const f = useAbrirCasoForm()
  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" variant="outline" color="neutral" disabled={f.pending} onClick={f.volver}>
                Cancelar
              </Button>
              <Button size="sm" type="button" disabled={f.pending} onClick={f.guardar}>
                <IconoCarga cargando={f.pending}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          Reintegración › Abrir caso
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <FormularioAbrirCaso f={f} />
      </TableScreenBody>
    </>
  )
}

/** Abrir caso de reintegración (§10.1): apertura manual sobre una matrícula Cursando sin caso abierto. */
export function AbrirCasoPage() {
  return (
    <NoticeProvider>
      <TableScreen>
        <AbrirCasoContent />
      </TableScreen>
    </NoticeProvider>
  )
}
