import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { queueNotice, useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { formatDateValue } from "@/lib/date-value"
import { paths } from "@/config/paths"

import type { OrigenManual } from "@/features/gestion-estudiantil/citaciones/api/types"
import { useCrearCompromiso } from "@/features/gestion-estudiantil/citaciones/api/mutations/crear-compromiso"
import { subirSoporteCompromiso } from "@/features/gestion-estudiantil/citaciones/api/mutations/soporte-compromiso"
import { useCitacionQuery } from "@/features/gestion-estudiantil/citaciones/api/query/use-citaciones-query"
import {
  crearCompromisoInput,
  hayErroresCompromiso,
  itemVacio,
  validarCompromiso,
  type ValoresCompromiso,
} from "@/features/gestion-estudiantil/citaciones/utils/formularios"
import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"

/**
 * Estado, validación y envío de «Nuevo compromiso» (G.3.CMP.4). Con `?citacion=` el estudiante y el
 * registro de origen llegan de la citación (que debe estar Asistió: lo valida el backend).
 */
export function useCompromisoForm(citacion: number | undefined, origenManual?: OrigenManual, matricula?: number, estudiante?: string) {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [hoy] = useState(() => formatDateValue(new Date()))
  const [valores, setValores] = useState<ValoresCompromiso>(() => ({
    matricula: matricula ? String(matricula) : "",
    tipo: "",
    fecha: hoy,
    revision: "",
    items: [itemVacio()],
    aceptado: false,
    soporte: null,
  }))
  const [nombreElegido, setNombreElegido] = useState(estudiante ?? "")
  const [intento, setIntento] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  const origen = useCitacionQuery(citacion).data
  const tipos = useCatalogo("TIPO_COMPROMISO")

  // Derivados en render (sin efectos): la matrícula de la citación y el primer tipo como valor inicial.
  const v: ValoresCompromiso = {
    ...valores,
    matricula: origen ? String(origen.fk_tmatricula) : valores.matricula,
    tipo: valores.tipo || tipos[0]?.value || "",
  }
  const nombre = origen?.estudiante_nombre ?? nombreElegido

  const set = (patch: Partial<ValoresCompromiso>) => setValores((prev) => ({ ...prev, ...patch }))
  const errores = intento ? validarCompromiso(v, hoy) : { items: {} }

  const volver = () =>
    navigate({ to: paths.app.citacionesCompromisos.getHref(), search: { tab: "compromisos" } } as never)

  const crear = useCrearCompromiso({
    mutationConfig: {
      onSuccess: (r) => {
        queueNotice(
          v.aceptado ? "Compromiso registrado y vigente." : "Compromiso registrado; queda pendiente de aceptación.",
          { variant: "success" },
        )
        navigate({ to: paths.app.compromisoDetalle.getHref(r.id) } as never)
      },
      onError: (error: Error) => {
        notify(getErrorMessage(error), { variant: "error" })
        enfocarPrimerError()
      },
    },
  })

  async function guardar() {
    setIntento(true)
    const e = validarCompromiso(v, hoy)
    if (hayErroresCompromiso(e)) {
      notify("Revise los campos marcados.", { variant: "error" })
      enfocarPrimerError()
      return
    }
    // Dos pasos (contrato 2.7): el soporte se sube primero y su pk viaja en FK_ARCHIVO.
    let archivo: number | null = null
    if (v.aceptado && v.soporte) {
      setSubiendo(true)
      try {
        archivo = await subirSoporteCompromiso(v.soporte)
      } catch (error) {
        notify(getErrorMessage(error), { variant: "error" })
        return
      } finally {
        setSubiendo(false)
      }
    }
    crear.mutate(crearCompromisoInput(v, archivo, citacion ?? null, origenManual))
  }

  return {
    v,
    set,
    errores,
    intento,
    origen,
    citacion,
    origenManual,
    nombre,
    elegirEstudiante: (matricula: string, n: string) => {
      setNombreElegido(n)
      set({ matricula })
    },
    guardando: crear.isPending || subiendo,
    guardar,
    volver,
  }
}

export type CompromisoFormState = ReturnType<typeof useCompromisoForm>
