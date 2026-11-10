import { useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { parseDateValue } from "@/lib/date-value"

import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useCrearReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/mutations/crear-reconocimiento"
import { useModificarReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/mutations/modificar-reconocimiento"
import { useOtorgarSugerencia } from "@/features/gestion-estudiantil/reconocimientos/api/mutations/otorgar-sugerencia"
import { subirSoporteReconocimiento } from "@/features/gestion-estudiantil/reconocimientos/api/mutations/soporte-reconocimiento"
import type {
  OpcionOtorganteReconocimiento,
  ReconocimientoDetalle,
  SugerenciaPuesto,
} from "@/features/gestion-estudiantil/reconocimientos/api/types"
import {
  fechaParaBackend,
  hayErroresReconocimiento,
  validarReconocimiento,
  type ValoresReconocimiento,
} from "@/features/gestion-estudiantil/reconocimientos/utils/formularios"

export type ModoReconocimiento =
  | { modo: "nuevo" }
  | { modo: "modificar"; id: number; detalle: ReconocimientoDetalle }
  | { modo: "otorgar"; sugerencia: SugerenciaPuesto }

function valoresIniciales(m: ModoReconocimiento): ValoresReconocimiento {
  const vacio: ValoresReconocimiento = {
    estudiantes: [],
    tipo: "",
    motivo: "",
    fecha: undefined,
    otorgante: null,
    actividad: "",
    soporte: null,
  }
  if (m.modo === "modificar") {
    const d = m.detalle
    return {
      ...vacio,
      estudiantes: [d.fk_tmatricula],
      tipo: String(d.fk_tlv_tipo),
      motivo: d.motivo,
      fecha: parseDateValue(d.fecha),
      actividad: d.fk_tactividad != null ? String(d.fk_tactividad) : "",
    }
  }
  if (m.modo === "otorgar") {
    const s = m.sugerencia
    return {
      ...vacio,
      estudiantes: [s.fk_tmatricula],
      tipo: String(s.fk_tlv_tipo_sugerido),
      motivo: s.motivo_sugerido,
      fecha: parseDateValue(s.fecha_cierre),
    }
  }
  return vacio
}

interface Opciones {
  modo: ModoReconocimiento
  otorgantes: OpcionOtorganteReconocimiento[]
  onClose: () => void
}

/** Estado, validación y envío del formulario de reconocimiento en sus tres modos (nuevo, modificar, otorgar). */
export function useReconocimientoForm({ modo, otorgantes, onClose }: Opciones) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const [valores, setValores] = useState(() => valoresIniciales(modo))
  const [subiendo, setSubiendo] = useState(false)

  const onError = (e: Error) => s.setError(e)
  const crear = useCrearReconocimiento({
    mutationConfig: {
      onSuccess: (filas) => {
        const n = Array.isArray(filas) ? filas.length : 1
        notify(n > 1 ? `${n} reconocimientos creados.` : "Reconocimiento creado.", { variant: "success" })
        onClose()
      },
      onError,
    },
  })
  const modificar = useModificarReconocimiento({
    mutationConfig: {
      onSuccess: () => {
        notify("Reconocimiento modificado.", { variant: "success" })
        onClose()
      },
      onError,
    },
  })
  const otorgar = useOtorgarSugerencia({
    mutationConfig: {
      onSuccess: () => {
        notify("Reconocimiento otorgado.", { variant: "success" })
        onClose()
      },
      onError,
    },
  })

  // Valor por defecto de «Otorgado por»: el que ya tenía (modificar) o el usuario actual.
  const porDefecto =
    modo.modo === "modificar"
      ? String(modo.detalle.fk_tfuncionario_otorga)
      : String(otorgantes.find((o) => o.es_usuario_actual)?.fk_tfuncionario ?? "")
  const otorganteEfectivo = valores.otorgante ?? porDefecto

  const errores = validarReconocimiento(valores, { eligeEstudiantes: modo.modo === "nuevo", otorganteEfectivo })

  function set<K extends keyof ValoresReconocimiento>(campo: K, valor: ValoresReconocimiento[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
  }

  async function enviar() {
    s.setIntento(true)
    s.setError(null)
    if (hayErroresReconocimiento(errores) || !valores.fecha) {
      enfocarPrimerError()
      return
    }
    setSubiendo(true)
    try {
      // Dos pasos como el soporte de compromisos: el archivo se sube primero y su pk viaja en FK_SOPORTE.
      const soporteActual = modo.modo === "modificar" ? modo.detalle.fk_tarchivo_soporte : null
      const soporte = valores.soporte ? await subirSoporteReconocimiento(valores.soporte) : soporteActual
      const comun = {
        FK_TIPO: Number(valores.tipo),
        MOTIVO: valores.motivo.trim(),
        FECHA: fechaParaBackend(valores.fecha),
        FK_OTORGADO_POR: Number(otorganteEfectivo),
        FK_ACTIVIDAD: valores.actividad ? Number(valores.actividad) : null,
        FK_SOPORTE: soporte,
      }
      if (modo.modo === "nuevo") crear.mutate({ ...comun, MATRICULAS: valores.estudiantes })
      else if (modo.modo === "modificar") modificar.mutate({ ...comun, id: modo.id })
      else {
        const { FK_TIPO: _tipo, ...sinTipo } = comun // el tipo lo fuerza el backend
        otorgar.mutate({ ...sinTipo, FK_MATRICULA: modo.sugerencia.fk_tmatricula })
      }
    } catch (e) {
      s.setError(e)
    } finally {
      setSubiendo(false)
    }
  }

  return {
    valores,
    set,
    errores,
    intento: s.intento,
    error: s.error,
    otorganteEfectivo,
    pending: subiendo || crear.isPending || modificar.isPending || otorgar.isPending,
    enviar,
  }
}
