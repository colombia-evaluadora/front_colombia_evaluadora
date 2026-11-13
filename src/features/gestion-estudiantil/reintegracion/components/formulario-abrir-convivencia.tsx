import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet } from "@/components/notice/notice-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { SeccionDatosCaso } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-datos-caso"
import { SeccionFechas } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-fechas"
import { SeccionSiuce } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-siuce"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { useAbrirConvivenciaForm } from "@/features/gestion-estudiantil/reintegracion/hooks/use-abrir-convivencia-form"

/** Abrir caso de convivencia desde el caso de reintegración: los datos del caso de Convivencia y el rol del estudiante. */
export function FormularioAbrirConvivencia({ caso }: { caso: CasoDetalle }) {
  const form = useAbrirConvivenciaForm(caso)
  const { v, set, errores, guardando } = form

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={form.volver} disabled={guardando}>
                Cancelar
              </Button>
              <Button size="sm" onClick={form.guardar} disabled={guardando}>
                <IconoCarga cargando={guardando}>
                  <FloppyDiskIcon data-icon="inline-start" />
                </IconoCarga>
                Guardar
              </Button>
            </div>
          }
        >
          <span className="whitespace-normal">Reintegración › Abrir caso de convivencia · {caso.estudiante_nombre}</span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <ErrorNoticeBanner error={form.error} />
          <SeccionDatosCaso form={form} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ComboOpciones
              id="caso-rol"
              label="Rol del estudiante en la situación"
              required
              size="default"
              todos={false}
              value={form.rol}
              options={form.roles}
              error={form.errorRol}
              onChange={form.setRol}
            />
          </div>
          <SeccionFechas form={{ v, set, errores, fechasCambiaron: false }} />
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
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              El caso queda Reportado y vinculado al caso de reintegración; convivencia le asigna el gestor.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}
