import { useMemo } from "react"

import { CheckIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useObservacionQuery } from "@/features/gestion-estudiantil/observaciones/api/query/use-observaciones-query"
import { useOpcionesGruposObservacionQuery } from "@/features/gestion-estudiantil/observaciones/api/query/use-opciones-observacion-query"
import type {
  DestinatarioObservacion,
  ObservacionRow,
  OpcionGrupoObservacion,
} from "@/features/gestion-estudiantil/observaciones/api/types"
import { DialogConfirmarObservacion } from "@/features/gestion-estudiantil/observaciones/components/dialogos/dialog-confirmar-observacion"
import { FormularioObservacion } from "@/features/gestion-estudiantil/observaciones/components/form/formulario-observacion"
import {
  useObservacionForm,
  type ModoObservacion,
} from "@/features/gestion-estudiantil/observaciones/hooks/use-observacion-form"

interface Props {
  onClose: () => void
}

const SIN_GRUPOS: OpcionGrupoObservacion[] = []

/** Etiquetas de «Dirigida a» tomadas de la lista de valores; el texto del Anexo A mientras carga. */
function useEtiquetasDestinatario(): Record<DestinatarioObservacion, string> {
  const catalogo = useCatalogo("DESTINATARIOS_OBSERVACION")
  return useMemo(() => {
    const nombre = (codigo: DestinatarioObservacion, porDefecto: string) =>
      catalogo.find((o) => o.codigo === codigo)?.label ?? porDefecto
    return {
      TODO_EL_GRUPO: nombre("TODO_EL_GRUPO", "Todo el grupo"),
      ESTUDIANTES_ESPECIFICOS: nombre("ESTUDIANTES_ESPECIFICOS", "Estudiantes específicos"),
    }
  }, [catalogo])
}

interface ModalProps extends Props {
  modo: ModoObservacion
  titulo: string
  grupos: OpcionGrupoObservacion[]
}

/** Cuerpo del modal: se monta ya con los datos que precargan, así el estado inicial es el correcto. */
function ModalFormulario({ modo, titulo, grupos, onClose }: ModalProps) {
  const form = useObservacionForm({ modo, grupos, onClose })
  const etiquetas = useEtiquetasDestinatario()

  // G.7.ACC.1: la confirmación reemplaza al formulario; Cancelar vuelve a él con lo escrito.
  if (form.confirmando && form.resumen) {
    return (
      <DialogConfirmarObservacion
        resumen={form.resumen}
        pending={form.pending}
        onCancelar={form.cancelarConfirmacion}
        onConfirmar={form.confirmar}
      />
    )
  }
  return (
    <DialogoOperacionShell
      titulo={titulo}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={form.error}
      pending={form.pending}
      confirmar={{
        label: "Guardar",
        icon: <CheckIcon data-icon="inline-start" />,
        onClick: form.enviar,
        disabled: form.cargandoResumen,
      }}
    >
      <FormularioObservacion
        form={form}
        grupos={grupos}
        detalle={modo.modo === "modificar" ? modo.detalle : undefined}
        etiquetas={etiquetas}
      />
    </DialogoOperacionShell>
  )
}

/** Nueva observación (G.7.NUE.1): con un solo grupo de su designación, viene elegido. */
export function DialogNuevaObservacion({ onClose }: Props) {
  const grupos = useOpcionesGruposObservacionQuery("REGISTRAR")
  if (grupos.isPending) {
    return (
      <DialogoOperacionShell
        titulo="Nueva observación"
        className="sm:max-w-3xl"
        onClose={onClose}
        error={null}
        pending={false}
        confirmar={{ label: "Guardar", icon: <CheckIcon data-icon="inline-start" />, onClick: () => {}, disabled: true }}
      >
        <Skeleton className="h-64 w-full" />
      </DialogoOperacionShell>
    )
  }
  return <ModalFormulario modo={{ modo: "nuevo" }} titulo="Nueva observación" grupos={grupos.data ?? SIN_GRUPOS} onClose={onClose} />
}

/** Modificar: el mismo formulario con el grupo y el destinatario fijos; cambian Fecha, Título y Observación. */
export function DialogModificarObservacion({ observacion, onClose }: Props & { observacion: ObservacionRow }) {
  const detalle = useObservacionQuery(observacion.pk)
  if (!detalle.data) return null
  return (
    <ModalFormulario
      modo={{ modo: "modificar", detalle: detalle.data }}
      titulo="Modificar observación"
      grupos={SIN_GRUPOS}
      onClose={onClose}
    />
  )
}
