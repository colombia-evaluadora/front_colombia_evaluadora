import { useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { SubjectsMultiSelect } from "@/features/establishment/academic-period/components/fields/subjects-multi-select"

import { useServicioSocialConfigQuery } from "@/features/gestion-estudiantil/configuracion/api/query/use-riesgo-servicio-query"
import type { AccesoConfiguracion, ParametrosServicioSocialConfig } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoNumerico, REJILLA_CAMPOS } from "@/features/gestion-estudiantil/configuracion/components/campo-numerico"
import { AccionesFormulario, EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { useServicioSocialForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-servicio-social-form"

/** La X de los chips del selector múltiple sigue activa aunque esté deshabilitado: sin permiso no cambia nada. */
const ignorar = () => {}

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  acceso: AccesoConfiguracion
}

function FormServicioSocial({
  parametros,
  establecimiento,
  puedeEditar,
  tabs,
}: {
  parametros: ParametrosServicioSocialConfig
  establecimiento: number
  puedeEditar: boolean
  tabs: ReactNode
}) {
  const f = useServicioSocialForm({ parametros, establecimiento })
  // Los grados se guardan por pk de la lista GRADOS (TLISTA_VALOR), como los devuelve el GET.
  const gradosQ = useQuery(selectCategoryQueryOptions("GRADOS"))
  const gradoOpciones = useMemo(() => (gradosQ.data ?? []).map((r) => ({ id: r.pk_lista_valor, label: r.nombre })), [gradosQ.data])
  const deshabilitado = !puedeEditar

  return (
    <>
      <EncabezadoConfiguracion
        tabs={tabs}
        action={<AccionesFormulario guardando={f.pendiente} deshabilitado={deshabilitado} onCancelar={f.cancelar} onGuardar={f.guardar} />}
      />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pt-2 pb-6">
          <ErrorNoticeBanner error={f.error} />
          <div className={REJILLA_CAMPOS}>
            <CampoNumerico
              id="servicio-horas"
              label="Horas de servicio social requeridas"
              inputMode="numeric"
              disabled={deshabilitado}
              value={f.valores.horas}
              error={f.errores.horas}
              ayuda="Entre 1 y 500. Predeterminado: 80."
              onChange={f.cambiarHoras}
            />
            <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(f.errores.grados) || undefined}>
              <FieldLabel htmlFor="servicio-grados">Grados del servicio social*</FieldLabel>
              <SubjectsMultiSelect
                id="servicio-grados"
                options={gradoOpciones}
                value={f.valores.grados}
                disabled={deshabilitado}
                placeholder="Seleccione"
                emptyMessage="No hay grados."
                onChange={deshabilitado ? ignorar : f.cambiarGrados}
              />
              {f.errores.grados ? (
                <FieldError>{f.errores.grados}</FieldError>
              ) : (
                <FieldDescription>Predeterminado: Décimo y Undécimo (Resolución 4210). Se puede marcar además el Noveno.</FieldDescription>
              )}
            </Field>
            <CampoNumerico
              id="servicio-anticipacion"
              label="Anticipación del aviso (meses)"
              inputMode="numeric"
              disabled={deshabilitado}
              value={f.valores.anticipacion}
              error={f.errores.anticipacion}
              ayuda="Antes del fin del período académico. Entre 1 y 6. Predeterminado: 2."
              onChange={f.cambiarAnticipacion}
            />
          </div>
          <p className="text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Servicio social (G.10.SOC.1, Regla 30): horas requeridas, grados que suman y anticipación del aviso. */
export function ServicioSocialTab({ tabs, establecimiento, acceso }: Props) {
  const { data, error } = useServicioSocialConfigQuery(establecimiento)
  if (data && establecimiento != null) {
    return (
      <FormServicioSocial
        key={JSON.stringify(data)}
        parametros={data}
        establecimiento={establecimiento}
        puedeEditar={acceso.puede_editar}
        tabs={tabs}
      />
    )
  }
  return (
    <>
      <EncabezadoConfiguracion tabs={tabs} />
      <TableScreenBody>{error ? <ErrorNoticeBanner error={error} /> : <Skeleton className="h-32 w-full" />}</TableScreenBody>
    </>
  )
}
