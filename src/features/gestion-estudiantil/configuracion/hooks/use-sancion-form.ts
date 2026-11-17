import { useCallback, useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"

import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import {
  useActualizarSancion,
  useCambiarEstadoProceso,
  useCrearSancion,
} from "@/features/gestion-estudiantil/configuracion/api/mutations/proceso"
import type { EfectoSancion, SancionRow } from "@/features/gestion-estudiantil/configuracion/api/types"
import {
  errorBackendACampo,
  validarSancion,
  type Errores,
  type ValoresSancion,
} from "@/features/gestion-estudiantil/configuracion/utils/proceso"

interface Opciones {
  establecimiento: number
  sancion: SancionRow | null
  efectos: EfectoSancion[]
  onClose: () => void
}

const CAMPOS_INLINE = new Set(["nombre", "descripcion", "instancia", "efecto", "duracion"])

/** Efecto por defecto de una sanción nueva: «Ninguno» si el backend lo ofrece. */
export function efectoPorDefecto(sancion: SancionRow | null, efectos: EfectoSancion[]): string {
  if (sancion?.fk_tlv_efecto != null) return String(sancion.fk_tlv_efecto)
  const ninguno = efectos.find((e) => e.nombre.trim().toLowerCase() === "ninguno")
  return ninguno ? String(ninguno.fk_tlv) : ""
}

/** Estado, validación y envío del modal Nueva sanción / Modificar (G.10.PRD.SAN.3). */
export function useSancionForm({ establecimiento, sancion, efectos, onClose }: Opciones) {
  const { notify } = useNotify()
  const [valores, setValores] = useState<ValoresSancion>(() => ({
    nombre: sancion?.nombre ?? "",
    descripcion: sancion?.descripcion ?? "",
    estado: sancion && !sancion.habilitado ? "inactivo" : "activo",
    instancia: sancion ? String(sancion.fk_tlv_instancia) : "",
    duracion: sancion?.tiene_duracion ?? false,
    efecto: efectoPorDefecto(sancion, efectos),
  }))
  const [intento, setIntento] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [erroresBackend, setErroresBackend] = useState<Errores<ValoresSancion>>({})
  const crear = useCrearSancion()
  const actualizar = useActualizarSancion()
  const cambiarEstado = useCambiarEstadoProceso()

  const efectoOpciones = useMemo(() => efectos.map((e) => ({ value: String(e.fk_tlv), label: e.nombre })), [efectos])
  const exigeDuracion = efectos.find((e) => String(e.fk_tlv) === valores.efecto)?.exige_duracion ?? false
  const errores = useMemo(
    () => ({ ...(intento ? validarSancion(valores, exigeDuracion) : {}), ...erroresBackend }),
    [intento, valores, exigeDuracion, erroresBackend],
  )
  const set = useCallback((patch: Partial<ValoresSancion>) => {
    setValores((p) => ({ ...p, ...patch }))
    setErroresBackend({})
  }, [])

  const alFallar = useCallback((e: Error) => {
    const campo = errorBackendACampo(e)
    if (campo && CAMPOS_INLINE.has(campo.campo)) {
      setErroresBackend({ [campo.campo]: campo.mensaje })
      enfocarPrimerError()
    } else setError(e)
  }, [])

  const guardar = useCallback(() => {
    setIntento(true)
    setError(null)
    if (Object.keys(validarSancion(valores, exigeDuracion)).length) {
      enfocarPrimerError()
      return
    }
    const base = {
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim() || null,
      habilitado: valores.estado === "activo",
      instancia: Number(valores.instancia),
      tieneDuracion: valores.duracion,
      efecto: Number(valores.efecto),
    }
    const opciones = {
      onSuccess: () => {
        notify(sancion ? "Sanción actualizada." : "Sanción creada.", { variant: "success" })
        onClose()
      },
      onError: alFallar,
    }
    if (!sancion) {
      crear.mutate({ ...base, establecimiento }, opciones)
      return
    }
    actualizar.mutate(
      { ...base, id: sancion.id },
      base.habilitado === sancion.habilitado
        ? opciones
        : {
            onSuccess: () => cambiarEstado.mutate({ catalogo: "sanciones", id: sancion.id, habilitado: base.habilitado }, opciones),
            onError: alFallar,
          },
    )
  }, [valores, exigeDuracion, sancion, establecimiento, crear, actualizar, cambiarEstado, notify, onClose, alFallar])

  return {
    valores,
    errores,
    error,
    efectoOpciones,
    pendiente: crear.isPending || actualizar.isPending || cambiarEstado.isPending,
    set,
    guardar,
  }
}
