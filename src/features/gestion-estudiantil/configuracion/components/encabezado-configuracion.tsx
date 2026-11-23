import type { ReactNode } from "react"

import { TableScreenHeader, TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"

import { IconoCarga } from "@/features/gestion-estudiantil/commons/components/icono-carga"

interface Props {
  tabs: ReactNode
  /** Contenido extra bajo las pestañas (barra de búsqueda del catálogo). */
  children?: ReactNode
  action?: ReactNode
}

/** Encabezado común de Configuración: título, acción a la derecha y las pestañas. */
export function EncabezadoConfiguracion({ tabs, children, action }: Props) {
  return (
    <TableScreenHeader>
      <TableScreenTitle action={action}>Configuración</TableScreenTitle>
      <TableScreenTabs>{tabs}</TableScreenTabs>
      {children}
    </TableScreenHeader>
  )
}

interface AccionesFormProps {
  guardando: boolean
  /** Sin permiso de edición: los botones se ven pero quedan deshabilitados. */
  deshabilitado: boolean
  onCancelar: () => void
  onGuardar: () => void
}

/** Cancelar · Guardar de las pestañas de formulario (G.10.PLA.1, G.10.RIE.1, G.10.SOC.1). */
export function AccionesFormulario({ guardando, deshabilitado, onCancelar, onGuardar }: AccionesFormProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button size="sm" type="button" variant="outline" color="neutral" disabled={guardando || deshabilitado} onClick={onCancelar}>
        <XIcon data-icon="inline-start" />
        Cancelar
      </Button>
      <Button size="sm" type="button" disabled={guardando || deshabilitado} onClick={onGuardar}>
        <IconoCarga cargando={guardando}>
          <FloppyDiskIcon data-icon="inline-start" />
        </IconoCarga>
        Guardar
      </Button>
    </div>
  )
}
