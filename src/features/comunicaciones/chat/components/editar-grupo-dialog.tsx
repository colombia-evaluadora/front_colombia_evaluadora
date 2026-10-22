import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import type { Conversacion } from "@/features/comunicaciones/chat/api/types"
import {
  useEditarGrupo,
  type OpcionesGrupo,
} from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import { OpcionesGrupoCampos } from "@/features/comunicaciones/chat/components/opciones-grupo-campos"
import { modoValido } from "@/features/comunicaciones/chat/lib/modo-grupo"

const opcionesDe = (c: Conversacion): OpcionesGrupo => ({
  descripcion: c.descripcion ?? "",
  modo: c.modo ?? "ABIERTO",
  rolesEscritura: c.rolesEscritura ?? [],
  imagen: undefined,
})

/**
 * "Editar grupo" (quien lo gestiona): nombre, descripción, imagen y quién escribe. El cambio de
 * modo llega en vivo a los miembros (su compositor se habilita o no) y deja un aviso en el grupo.
 * El contenido se monta al abrir: arranca siempre con los datos actuales del grupo.
 */
export function EditarGrupoDialog({
  conversacion: c,
  open,
  onClose,
}: {
  conversacion: Conversacion
  open: boolean
  onClose: () => void
}) {
  const editar = useEditarGrupo()
  const cerrar = () => {
    editar.reset()
    onClose()
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !editar.isPending && cerrar()}>
      <DialogContent className="sm:max-w-lg">
        {open && <Formulario conversacion={c} editar={editar} onClose={cerrar} />}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  conversacion: c,
  editar,
  onClose,
}: {
  conversacion: Conversacion
  editar: ReturnType<typeof useEditarGrupo>
  onClose: () => void
}) {
  const { notify } = useNotify()
  const [nombre, setNombre] = useState(c.nombre)
  const [opciones, setOpciones] = useState<OpcionesGrupo>(() => opcionesDe(c))
  const valido = !!nombre.trim() && modoValido(opciones.modo, opciones.rolesEscritura)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!valido || editar.isPending) return
        editar.mutate(
          { id: c.id, nombre: nombre.trim(), opciones },
          {
            onSuccess: () => {
              notify("Grupo actualizado.")
              onClose()
            },
          },
        )
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>Editar grupo</DialogTitle>
        <DialogDescription>Los cambios los verán todos los miembros.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[60dvh] space-y-4 overflow-y-auto pr-1">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Nombre del grupo</span>
          <Input autoFocus value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <OpcionesGrupoCampos
          value={opciones}
          onChange={setOpciones}
          imagenActual={c.imagenArchivoId}
          idPrefijo={`editar-grupo-${c.id}`}
        />
      </div>
      {editar.error && (
        <p role="alert" className="text-sm text-red">
          {getErrorMessage(editar.error)}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="fill" color="neutral" onClick={onClose} disabled={editar.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valido || editar.isPending} aria-busy={editar.isPending}>
          Guardar cambios
        </Button>
      </DialogFooter>
    </form>
  )
}
