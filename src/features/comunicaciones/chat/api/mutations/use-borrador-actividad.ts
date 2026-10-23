import { useEffect, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { chatKeys } from "@/features/comunicaciones/chat/api/query-keys"
import type {
  BorradorActividad,
  TipoBorradorActividad,
} from "@/features/comunicaciones/chat/api/types"
import {
  AUTOGUARDADO_MS,
  MAX_TITULO_BORRADOR,
} from "@/features/comunicaciones/chat/lib/borrador-actividad"

interface GuardarInput {
  id: number | null
  tipo: TipoBorradorActividad
  titulo: string
  datos: Record<string, unknown>
  conversacionId?: number | null
}

/** Crea el borrador (sin id) o lo reemplaza (autoguardado). */
export function guardarBorradorActividad(v: GuardarInput) {
  const titulo = v.titulo.trim().slice(0, MAX_TITULO_BORRADOR)
  if (v.id) {
    return evalCol.putRow<BorradorActividad>(`/comunicaciones/borradores-actividad/${v.id}`, {
      TITULO: titulo,
      DATOS: v.datos,
    })
  }
  return evalCol.postRow<BorradorActividad>("/comunicaciones/borradores-actividad", {
    TIPO: v.tipo,
    TITULO: titulo,
    DATOS: v.datos,
    ...(v.conversacionId ? { FK_TCANAL: v.conversacionId } : {}),
  })
}

export function useEliminarBorradorActividad() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      evalCol.patchRow<BorradorActividad>(`/comunicaciones/borradores-actividad/${id}/eliminar`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.borradoresActividad }),
  })
}

export type EstadoAutoguardado = "inactivo" | "pendiente" | "guardando" | "guardado" | "error"

/**
 * Autoguardado del diálogo de una actividad: tras {@link AUTOGUARDADO_MS} sin cambios guarda
 * `datos` (si hay contenido y cambió desde el último guardado). El primer guardado crea el
 * borrador; los siguientes lo reemplazan. Un fallo no interrumpe al usuario: queda "error" y se
 * reintenta con el próximo cambio.
 *
 * Con `conversacionId` (editar una actividad ya publicada, comms-service V594 `fk_tcanal`) los
 * valores iniciales son los publicados (o los de un borrador retomado): solo se guarda si cambian,
 * y el borrador queda atado a esa actividad (uno por actividad y persona).
 */
export function useAutoguardadoActividad({
  tipo,
  habilitado,
  titulo,
  datos,
  conContenido,
  borradorInicial = null,
  conversacionId = null,
}: {
  tipo: TipoBorradorActividad
  habilitado: boolean
  titulo: string
  datos: Record<string, unknown>
  conContenido: boolean
  borradorInicial?: number | null
  conversacionId?: number | null
}) {
  const queryClient = useQueryClient()
  const [borradorId, setBorradorId] = useState<number | null>(borradorInicial)
  const [estado, setEstado] = useState<EstadoAutoguardado>(
    borradorInicial ? "guardado" : "inactivo",
  )
  const serializado = JSON.stringify(datos)
  // Último contenido guardado (o el retomado, que ya está guardado) y el guardado en curso.
  const ultimo = useRef<string | null>(borradorInicial || conversacionId ? serializado : null)
  const enCurso = useRef<Promise<void> | null>(null)
  const idRef = useRef<number | null>(borradorInicial)
  const pendiente = useRef<{
    titulo: string
    datos: Record<string, unknown>
    serializado: string
  } | null>(null)

  const guardar = async () => {
    // Uno a la vez: el siguiente espera al anterior (para no crear dos borradores).
    while (enCurso.current) await enCurso.current
    const p = pendiente.current
    if (!p || p.serializado === ultimo.current) return
    pendiente.current = null
    setEstado("guardando")
    const trabajo = guardarBorradorActividad({
      id: idRef.current,
      tipo,
      titulo: p.titulo,
      datos: p.datos,
      conversacionId,
    })
      .then((b) => {
        idRef.current = b.id
        setBorradorId(b.id)
        ultimo.current = p.serializado
        setEstado("guardado")
        void queryClient.invalidateQueries({ queryKey: chatKeys.borradoresActividad })
      })
      .catch(() => setEstado("error"))
      .finally(() => {
        enCurso.current = null
      })
    enCurso.current = trabajo
    await trabajo
  }

  // Última versión de `guardar` para el temporizador (mismo patrón que el borrador del composer).
  const guardarRef = useRef(guardar)
  useEffect(() => {
    guardarRef.current = guardar
  })

  useEffect(() => {
    if (!habilitado || !conContenido || serializado === ultimo.current) return
    pendiente.current = {
      titulo,
      datos: JSON.parse(serializado) as Record<string, unknown>,
      serializado,
    }
    setEstado("pendiente")
    const t = setTimeout(() => void guardarRef.current(), AUTOGUARDADO_MS)
    return () => clearTimeout(t)
  }, [habilitado, conContenido, serializado, titulo])

  return {
    borradorId,
    estado,
    /** Guarda ya lo pendiente (al cerrar o antes de publicar) y devuelve el id del borrador. */
    guardarYa: async () => {
      await guardar()
      return idRef.current
    },
    /** Olvida el borrador (tras publicar, descartar o cerrar). */
    reiniciar: () => {
      pendiente.current = null
      ultimo.current = null
      idRef.current = null
      setBorradorId(null)
      setEstado("inactivo")
    },
  }
}
