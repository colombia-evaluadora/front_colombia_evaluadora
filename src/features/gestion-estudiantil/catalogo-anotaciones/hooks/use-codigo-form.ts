import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { useActualizarCodigo, useCambiarEstadoCodigo, useCrearCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/mutations/codigos"
import type { CodigoRow } from "@/features/gestion-estudiantil/catalogo-anotaciones/api/types"
import { validarCodigo, valoresDe, valoresVacios, type ValoresCodigo } from "@/features/gestion-estudiantil/catalogo-anotaciones/utils/codigo-form"

interface Opciones {
  establecimiento: number | null
  codigo: CodigoRow | null
  esNegativo: (tipo: string) => boolean
  onClose: () => void
}

/** Estado del modal Nuevo código y Modificar (2.1). */
export function useCodigoForm({ establecimiento, codigo, esNegativo, onClose }: Opciones) {
  const { notify } = useNotify()
  const [v, setV] = useState<ValoresCodigo>(() => (codigo ? valoresDe(codigo) : valoresVacios()))
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const crear = useCrearCodigo()
  const actualizar = useActualizarCodigo()
  const cambiarEstado = useCambiarEstadoCodigo()

  const errores = intento ? validarCodigo(v) : {}
  const negativo = esNegativo(v.tipo)

  function cambiarTipo(tipo: string) {
    // La situación solo existe en Negativo: al salir de ahí no puede quedar guardada.
    setV((p) => ({ ...p, tipo, situacion: esNegativo(tipo) ? p.situacion : "" }))
  }

  function guardar() {
    setIntento(true)
    if (Object.keys(validarCodigo(v)).length > 0) return
    const base = {
      codigo: v.codigo.trim(),
      descripcion: v.descripcion.trim(),
      tipo: Number(v.tipo),
      situacion: negativo && v.situacion ? Number(v.situacion) : null,
      habilitado: v.estado === "activo",
    }
    const opciones = {
      onSuccess: () => {
        notify(codigo ? "Código actualizado." : "Código creado.", { variant: "success" as const })
        onClose()
      },
      onError: (error: Error) => setError(error),
    }
    if (codigo) {
      // El estado tiene su propio endpoint: solo se llama si cambió.
      actualizar.mutate(
        { ...base, id: codigo.id },
        base.habilitado === codigo.habilitado
          ? opciones
          : { onSuccess: () => cambiarEstado.mutate({ id: codigo.id, habilitado: base.habilitado }, opciones), onError: opciones.onError },
      )
    }
    if (!codigo && establecimiento != null) crear.mutate({ ...base, establecimiento }, opciones)
  }

  return {
    v,
    set: (patch: Partial<ValoresCodigo>) => setV((p) => ({ ...p, ...patch })),
    cambiarTipo,
    errores,
    negativo,
    error,
    guardar,
    pending: crear.isPending || actualizar.isPending || cambiarEstado.isPending,
  }
}
