import { CheckIcon } from "@/components/ui/icons"

import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useOpcionesOtorgantesQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-opciones-reconocimiento-query"
import { useReconocimientoQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"
import type { ReconocimientoRow, SugerenciaPuesto } from "@/features/gestion-estudiantil/reconocimientos/api/types"
import { FormularioReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/components/form/formulario-reconocimiento"
import {
  useReconocimientoForm,
  type ModoReconocimiento,
} from "@/features/gestion-estudiantil/reconocimientos/hooks/use-reconocimiento-form"

interface Props {
  establecimiento: number | null
  onClose: () => void
}

interface ModalProps extends Props {
  modo: ModoReconocimiento
  titulo: string
  estudianteNombre?: string
}

/** Cuerpo del modal: se monta ya con los datos que precargan, así el estado inicial es el correcto. */
function ModalFormulario({ modo, titulo, establecimiento, estudianteNombre, onClose }: ModalProps) {
  // Mismo query que el selector: con la caché caliente no hay espera y la fila `es_usuario_actual` ya está.
  const otorgantes = useOpcionesOtorgantesQuery({ establecimiento, search: "" })
  const form = useReconocimientoForm({ modo, otorgantes: otorgantes.data ?? [], onClose })
  return (
    <DialogoOperacionShell
      titulo={titulo}
      className="sm:max-w-3xl"
      onClose={onClose}
      error={form.error}
      pending={form.pending}
      confirmar={{ label: "Guardar", icon: <CheckIcon data-icon="inline-start" />, onClick: form.enviar }}
    >
      <FormularioReconocimiento
        form={form}
        establecimiento={establecimiento}
        modo={modo.modo}
        estudianteNombre={estudianteNombre}
        detalle={modo.modo === "modificar" ? modo.detalle : undefined}
      />
    </DialogoOperacionShell>
  )
}

/** Nuevo reconocimiento (G.6.OTO.1): uno por cada estudiante elegido. */
export function DialogNuevoReconocimiento({ establecimiento, onClose }: Props) {
  return <ModalFormulario modo={{ modo: "nuevo" }} titulo="Nuevo reconocimiento" establecimiento={establecimiento} onClose={onClose} />
}

/** Modificar: el mismo formulario con el estudiante fijo y los valores actuales. */
export function DialogModificarReconocimiento({ reconocimiento: r, establecimiento, onClose }: Props & { reconocimiento: ReconocimientoRow }) {
  const detalle = useReconocimientoQuery(r.id)
  if (!detalle.data) return null
  return (
    <ModalFormulario
      modo={{ modo: "modificar", id: r.id, detalle: detalle.data }}
      titulo="Modificar reconocimiento"
      establecimiento={establecimiento}
      estudianteNombre={r.estudiante_nombre}
      onClose={onClose}
    />
  )
}

/** Otorgar una sugerencia por Puesto (Regla 32): estudiante y tipo fijos, motivo y fecha precargados. */
export function DialogOtorgarSugerencia({ sugerencia: s, establecimiento, onClose }: Props & { sugerencia: SugerenciaPuesto }) {
  return (
    <ModalFormulario
      modo={{ modo: "otorgar", sugerencia: s }}
      titulo="Otorgar reconocimiento"
      establecimiento={establecimiento}
      estudianteNombre={s.estudiante_nombre}
      onClose={onClose}
    />
  )
}
