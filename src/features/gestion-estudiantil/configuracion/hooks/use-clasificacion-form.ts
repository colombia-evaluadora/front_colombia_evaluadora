import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  useActualizarClasificacion,
  useCambiarEstadoProceso,
  useCrearClasificacion,
} from "@/features/gestion-estudiantil/configuracion/api/mutations/proceso"
import type { ClasificacionRow } from "@/features/gestion-estudiantil/configuracion/api/types"
import {
  errorBackendACampo,
  validarClasificacion,
  type Errores,
  type ValoresClasificacion,
} from "@/features/gestion-estudiantil/configuracion/utils/proceso"

interface Opciones {
  establecimiento: number
  clasificacion: ClasificacionRow | null
  onClose: () => void
}

/** Estado, validación y envío del modal Nueva clasificación / Modificar (G.10.PRD.CLA.2–3). */
export function useClasificacionForm({ establecimiento, clasificacion, onClose }: Opciones) {
  const { notify } = useNotify()
  const [valores, setValores] = useState<ValoresClasificacion>(() => ({
    nombre: clasificacion?.nombre ?? "",
    descripcion: clasificacion?.descripcion ?? "",
    estado: clasificacion && !clasificacion.habilitado ? "inactivo" : "activo",
  }))
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [erroresBackend, setErroresBackend] = useState<Errores<ValoresClasificacion>>({})
  const crear = useCrearClasificacion()
  const actualizar = useActualizarClasificacion()
  const cambiarEstado = useCambiarEstadoProceso()

  const errores = useMemo(
    () => ({ ...(intento ? validarClasificacion(valores) : {}), ...erroresBackend }),
    [intento, valores, erroresBackend],
  )
  const set = useCallback((patch: Partial<ValoresClasificacion>) => {
    setValores((p) => ({ ...p, ...patch }))
    setErroresBackend({})
  }, [])

  const alFallar = useCallback((e: Error) => {
    const campo = errorBackendACampo(e)
    if (campo && (campo.campo === "nombre" || campo.campo === "descripcion")) {
      setErroresBackend({ [campo.campo]: campo.mensaje })
      enfocarPrimerError()
    } else setError(e)
  }, [])

  const guardar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (Object.keys(validarClasificacion(valores)).length) {
      enfocarPrimerError()
      return
    }
    const base = { nombre: valores.nombre.trim(), descripcion: valores.descripcion.trim() || null, habilitado: valores.estado === "activo" }
    const opciones = {
      onSuccess: () => {
        notify(clasificacion ? "Clasificación actualizada." : "Clasificación creada.", { variant: "success" })
        onClose()
      },
      onError: alFallar,
    }
    if (!clasificacion) {
      crear.mutate({ ...base, establecimiento }, opciones)
      return
    }
    // El estado tiene su propio endpoint: solo se llama si cambió.
    actualizar.mutate(
      { ...base, id: clasificacion.id },
      base.habilitado === clasificacion.habilitado
        ? opciones
        : {
            onSuccess: () => cambiarEstado.mutate({ catalogo: "clasificaciones", id: clasificacion.id, habilitado: base.habilitado }, opciones),
            onError: alFallar,
          },
    )
  }, [valores, clasificacion, establecimiento, crear, actualizar, cambiarEstado, notify, onClose, alFallar])

  return {
    valores,
    errores,
    error,
    pendiente: crear.isPending || actualizar.isPending || cambiarEstado.isPending,
    set,
    guardar,
  }
}
