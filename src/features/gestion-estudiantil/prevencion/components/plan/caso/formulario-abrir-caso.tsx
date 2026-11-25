import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon, XIcon } from "@/components/ui/icons"
import { TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet } from "@/components/notice/notice-context"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import { ConstructoresInvolucrados } from "@/features/gestion-estudiantil/convivencia/components/constructores-involucrados"
import { GestorPrevisto } from "@/features/gestion-estudiantil/convivencia/components/form/gestor-previsto"
import { SeccionDatosCaso } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-datos-caso"
import { SeccionFechas } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-fechas"
import { SeccionSiuce } from "@/features/gestion-estudiantil/convivencia/components/form/seccion-siuce"
import type { PlanDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { useAbrirCasoForm } from "@/features/gestion-estudiantil/prevencion/hooks/use-abrir-caso-form"

/** Abrir caso de convivencia desde el plan (Regla 24): los datos del caso de Convivencia y el rol del estudiante. */
export function FormularioAbrirCaso({ plan }: { plan: PlanDetalle }) {
  const form = useAbrirCasoForm(plan)
  const { v, set, errores, guardando } = form

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={form.volver} disabled={guardando}>
                <XIcon data-icon="inline-start" />
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
          <span className="whitespace-normal">Convivencia › Nuevo caso</span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-5 pb-6">
          <ErrorNoticeBanner error={form.error} />
          <p className="text-sm text-muted-foreground">
            Registro vinculado:{" "}
            <span className="text-foreground">
              Plan de acompañamiento · {plan.estudiante_nombre} · {formatFecha(plan.fecha_inicio)}
            </span>
          </p>
          <SeccionDatosCaso form={form} />
          <ConstructoresInvolucrados
            estudiantes={v.estudiantes}
            onEstudiantes={form.setEstudiantes}
            involucrados={v.involucrados}
            onInvolucrados={(involucrados) => set({ involucrados })}
            errorEstudiantes={form.errorEstudiantes}
            errorInvolucrados={errores.involucrados}
            mostrarErrores={form.intento}
            fijoMatricula={plan.fk_tmatricula}
          />
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
          <SeccionSiuce form={form} conNumero={false} />
          <GestorPrevisto previsto={form.gestorPrevisto} />
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>El caso queda Reportado y vinculado a este plan.</AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}
