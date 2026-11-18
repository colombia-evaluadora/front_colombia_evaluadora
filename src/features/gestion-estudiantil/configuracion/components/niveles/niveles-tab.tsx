import type { ReactNode } from "react"

import { TableScreenBody } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { useNivelesConvivenciaQuery } from "@/features/gestion-estudiantil/configuracion/api/query/use-configuracion-query"
import type { AccesoConfiguracion, NivelesConvivencia } from "@/features/gestion-estudiantil/configuracion/api/types"
import { CampoNumerico, REJILLA_CAMPOS } from "@/features/gestion-estudiantil/configuracion/components/campo-numerico"
import { AccionesFormulario, EncabezadoConfiguracion } from "@/features/gestion-estudiantil/configuracion/components/encabezado-configuracion"
import { useNivelesForm } from "@/features/gestion-estudiantil/configuracion/hooks/use-niveles-form"

interface Props {
  tabs: ReactNode
  establecimiento: number | null
  acceso: AccesoConfiguracion
}

function FormNiveles({ niveles, establecimiento, puedeEditar, tabs }: { niveles: NivelesConvivencia; establecimiento: number; puedeEditar: boolean; tabs: ReactNode }) {
  const f = useNivelesForm({ niveles, establecimiento })

  return (
    <>
      <EncabezadoConfiguracion
        tabs={tabs}
        action={<AccionesFormulario guardando={f.pendiente} deshabilitado={!puedeEditar} onCancelar={f.cancelar} onGuardar={f.guardar} />}
      />
      <TableScreenBody>
        <div className="flex flex-col gap-4 pb-6">
          <ErrorNoticeBanner error={f.error} />
          <Alert>
            <InfoIcon aria-hidden="true" />
            <AlertDescription>
              El nivel de convivencia del establecimiento es el porcentaje de estudiantes involucrados en casos de convivencia. Los
              dos umbrales van juntos o ninguno; sin umbrales no se muestra el nivel.
              {!puedeEditar && " Solo el Administrador del establecimiento los modifica."}
            </AlertDescription>
          </Alert>
          <div className={REJILLA_CAMPOS}>
            <CampoNumerico
              id="niveles-medio"
              label="Umbral del nivel Medio (%)"
              inputMode="decimal"
              required={false}
              disabled={!puedeEditar}
              value={f.valores.medio}
              error={f.errores.medio}
              ayuda="Desde este porcentaje el nivel es Medio. Entre 0.1 y 99.9, un decimal."
              onChange={(v) => f.cambiar("medio", v)}
            />
            <CampoNumerico
              id="niveles-alto"
              label="Umbral del nivel Alto (%)"
              inputMode="decimal"
              required={false}
              disabled={!puedeEditar}
              value={f.valores.alto}
              error={f.errores.alto}
              ayuda="Desde este porcentaje el nivel es Alto. Mayor que el Medio, hasta 100."
              onChange={(v) => f.cambiar("alto", v)}
            />
          </div>
        </div>
      </TableScreenBody>
    </>
  )
}

/** Niveles de convivencia (§3.6): umbrales Medio y Alto del establecimiento. */
export function NivelesTab({ tabs, establecimiento, acceso }: Props) {
  const { data, isPending, error } = useNivelesConvivenciaQuery(establecimiento)

  if (establecimiento == null || isPending || !data) {
    return (
      <>
        <EncabezadoConfiguracion tabs={tabs} />
        <TableScreenBody>
          {error ? <ErrorNoticeBanner error={error} /> : <Skeleton className="h-16 w-full max-w-md" />}
        </TableScreenBody>
      </>
    )
  }
  // `key`: al guardar llegan los valores nuevos y el formulario se vuelve a montar con ellos.
  return (
    <FormNiveles
      key={`${data.umbral_medio}-${data.umbral_alto}`}
      niveles={data}
      establecimiento={establecimiento}
      puedeEditar={acceso.puede_editar_umbrales && data.puede_editar}
      tabs={tabs}
    />
  )
}
