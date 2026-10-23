import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  CategoriaCanal,
  Conversacion,
  ModoGrupo,
  SilencioDuracion,
} from "@/features/comunicaciones/chat/api/types"
import type { CuerpoSeleccion } from "@/features/comunicaciones/chat/lib/seleccion-grupal"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"
import { cuerpoModo } from "@/features/comunicaciones/chat/lib/modo-grupo"
import { patchMultipart } from "@/lib/files"

const base = (id: number) => `/comunicaciones/conversaciones/${id}`

function useInvalidarConversaciones() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: chatKeys.conversaciones })
}

/**
 * Silenciar por una duración o, con `NINGUNA`, activar de nuevo las notificaciones. La lista se
 * actualiza al instante con el `silenciadoHasta` que devuelve comms-service (campana tachada y menú
 * "Activar notificaciones"/"Silenciar"), y luego se revalida.
 */
export function useSilenciarConversacion() {
  const queryClient = useQueryClient()
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, duracion }: { id: number; duracion: SilencioDuracion }) =>
      evalCol.patchRow<Conversacion>(`${base(id)}/silenciar`, { DURACION: duracion }),
    onSuccess: (c, { id }) => {
      queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) =>
        prev?.map((x) => (x.id === id ? { ...x, silenciadoHasta: c?.silenciadoHasta ?? null } : x)),
      )
      return invalidar()
    },
  })
}

export function useMarcarNoLeido() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/no-leido`),
    onSuccess: invalidar,
  })
}

export function useMarcarLeido() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/leido`),
    onSuccess: invalidar,
  })
}

export function useArchivarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, archivar }: { id: number; archivar: boolean }) =>
      evalCol.patchRow<Conversacion>(`${base(id)}/${archivar ? "archivar" : "desarchivar"}`),
    onSuccess: invalidar,
  })
}

export function useDuplicarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.postRow<Conversacion>(`${base(id)}/duplicar`),
    onSuccess: invalidar,
  })
}

export function useRenombrarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      evalCol.patchRow<Conversacion>(base(id), { NOMBRE: nombre }),
    onSuccess: invalidar,
  })
}

/** Datos de un grupo que gestiona quien lo crea: descripción, modo de escritura e imagen. */
export interface OpcionesGrupo {
  descripcion: string
  modo: ModoGrupo
  rolesEscritura: PerfilChat[]
  // `undefined`: no se toca; `null`: se quita; `File`: se sube por file-service.
  imagen?: File | null
}

/**
 * Imagen del grupo: multipart por file-service (`IMAGEN` → `pk_tarchivo`) al mismo PATCH de
 * comms-service; para quitarla, JSON `{ IMAGEN: null }` directo.
 */
export async function guardarImagenGrupo(id: number, imagen: File | null) {
  const ruta = `${base(id)}/imagen`
  if (!imagen) return evalCol.patchRow<Conversacion>(ruta, { IMAGEN: null })
  const crudo = await patchMultipart<string | { rows: Conversacion[] } | Conversacion[]>(`/eval-col${ruta}`, {}, {
    IMAGEN: imagen,
  })
  const body = typeof crudo === "string" ? (JSON.parse(crudo) as { rows: Conversacion[] }) : crudo
  const [c] = Array.isArray(body) ? body : (body?.rows ?? [])
  if (!c) throw new Error("La respuesta no trajo el grupo.")
  return c
}

/** Editar un grupo: nombre, descripción (vacía la quita), modo y perfiles; luego la imagen. */
export function useEditarGrupo() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: async ({ id, nombre, opciones }: { id: number; nombre: string; opciones: OpcionesGrupo }) => {
      let c = await evalCol.patchRow<Conversacion>(base(id), {
        NOMBRE: nombre,
        DESCRIPCION: opciones.descripcion.trim(),
        ...cuerpoModo(opciones.modo, opciones.rolesEscritura),
      })
      if (opciones.imagen !== undefined) c = await guardarImagenGrupo(id, opciones.imagen)
      return c
    },
    onSuccess: invalidar,
  })
}

// Sin DELETE en eval-col: la baja es un PATCH.
export function useEliminarConversacion() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/eliminar`),
    onSuccess: invalidar,
  })
}

/** Clave de la mutación de salir: el tiempo real la consulta para no pedir miembros de un canal que se deja. */
export const SALIR_MUTATION_KEY = ["comunicaciones-chat", "salir"] as const

export function useSalirConversacion() {
  const queryClient = useQueryClient()
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationKey: SALIR_MUTATION_KEY,
    mutationFn: (id: number) => evalCol.patchRow<Conversacion>(`${base(id)}/salir`),
    onMutate: (id) => queryClient.cancelQueries({ queryKey: chatKeys.miembros(id) }),
    onSuccess: (_data, id) => {
      // Ya no es miembro: nada de esa conversación se vuelve a pedir (sería 404).
      queryClient.setQueryData<Conversacion[]>(chatKeys.conversaciones, (prev) => prev?.filter((x) => x.id !== id))
      queryClient.removeQueries({ queryKey: chatKeys.miembros(id) })
      queryClient.removeQueries({ queryKey: chatKeys.mensajes(id) })
      return invalidar()
    },
  })
}

export function useCrearCanal() {
  const invalidar = useInvalidarConversaciones()
  return useMutation({
    mutationFn: async ({
      nombre,
      categoria,
      miembros = [],
      tipo,
      grupal,
      opciones,
    }: {
      nombre: string
      categoria: CategoriaCanal
      miembros?: number[]
      // GRUPO: conversación de un grupo de personas; sin tipo, un foro (CANAL).
      tipo?: "CANAL" | "GRUPO"
      // Solo GRUPO: grados, grupos académicos y cargos que comms-service resuelve en el servidor.
      grupal?: Pick<CuerpoSeleccion, "GRADOS" | "GRUPOS" | "ROLES" | "PARA">
      // Solo GRUPO: descripción, modo de escritura e imagen (se sube después de crearlo).
      opciones?: OpcionesGrupo
    }) => {
      const c = await evalCol.postRow<Conversacion>("/comunicaciones/conversaciones", {
        NOMBRE: nombre,
        CATEGORIA: categoria,
        MIEMBROS: miembros,
        ...(tipo ? { TIPO: tipo } : {}),
        ...(grupal ?? {}),
        ...(opciones
          ? { DESCRIPCION: opciones.descripcion.trim() || null, ...cuerpoModo(opciones.modo, opciones.rolesEscritura) }
          : {}),
      })
      // La imagen va aparte (file-service); si falla, el grupo ya existe y se puede poner al editarlo.
      if (opciones?.imagen) return guardarImagenGrupo(c.id, opciones.imagen)
      return c
    },
    onSuccess: invalidar,
  })
}
