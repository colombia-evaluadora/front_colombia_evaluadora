import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type { Conversacion, Miembro } from "@/features/comunicaciones/chat/api/types"
import type { CuerpoSeleccion } from "@/features/comunicaciones/chat/lib/seleccion-grupal"

const base = (id: number) => `/comunicaciones/conversaciones/${id}/miembros`

// Cambios de miembros: refrescan la lista y el contador del encabezado.
function useInvalidar(conversacionId: number) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: chatKeys.miembros(conversacionId) }),
      queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
      queryClient.invalidateQueries({ queryKey: chatKeys.mensajes(conversacionId) }),
    ])
}

export function useAgregarMiembros(conversacionId: number) {
  const invalidar = useInvalidar(conversacionId)
  return useMutation({
    mutationFn: (ids: number[]) => evalCol.postRows<Miembro>(base(conversacionId), { MIEMBROS: ids }),
    onSuccess: invalidar,
  })
}

// Alta masiva en un grupo: grados, grupos académicos, cargos y personas sueltas que comms-service
// resuelve en el servidor (alcance de los establecimientos, sin duplicados ni acudientes).
export function useAgregarMiembrosMasivo(conversacionId: number) {
  const invalidar = useInvalidar(conversacionId)
  return useMutation({
    mutationFn: (cuerpo: CuerpoSeleccion) => evalCol.postRows<Miembro>(`${base(conversacionId)}/masivo`, cuerpo),
    onSuccess: invalidar,
  })
}

// Bloquear = no puede escribir en el canal.
export function useBloquearMiembro(conversacionId: number) {
  const invalidar = useInvalidar(conversacionId)
  return useMutation({
    mutationFn: ({ id, bloqueado }: { id: number; bloqueado: boolean }) =>
      evalCol.patchRow<Miembro>(`${base(conversacionId)}/${id}/bloquear`, { BLOQUEADO: bloqueado }),
    onSuccess: invalidar,
  })
}

export function useEliminarMiembro(conversacionId: number) {
  const invalidar = useInvalidar(conversacionId)
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Miembro>(`${base(conversacionId)}/${id}/eliminar`),
    onSuccess: invalidar,
  })
}

// Nombrar o retirar administrador del grupo o foro (comms-service: siempre queda uno).
export function useCambiarRolMiembro(conversacionId: number) {
  const invalidar = useInvalidar(conversacionId)
  return useMutation({
    mutationFn: ({ id, admin }: { id: number; admin: boolean }) =>
      evalCol.patchRow<Miembro>(`${base(conversacionId)}/${id}/rol`, { ROL: admin ? "ADMIN" : "MIEMBRO" }),
    onSuccess: invalidar,
  })
}

// Abre (o crea) el mensaje directo con una persona.
export function useAbrirDirecto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (personaId: number) =>
      evalCol.postRow<Conversacion>("/comunicaciones/directos", { FK_PERSONA: personaId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones }),
  })
}
