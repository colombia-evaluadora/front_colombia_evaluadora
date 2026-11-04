import { useState } from "react"

import type { Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { fetchArchivoViewUrl } from "@/lib/files"

import type { SoporteAccion } from "@/features/gestion-estudiantil/convivencia/api/comite-types"
import {
  useAgregarSoporteMutation,
  useRetirarSoporteMutation,
  useSustituirSoporteMutation,
} from "@/features/gestion-estudiantil/convivencia/api/mutations/soportes"
import { useSoportesAccionQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-soportes-query"
import { errorMotivoSoporte, partirSoportes, puedeAgregarSoporte } from "@/features/gestion-estudiantil/convivencia/utils/soportes"

export interface PanelSoporte {
  tipo: "retirar" | "sustituir"
  soporte: SoporteAccion
}

const MAX_MB = 10
const TIPOS = ["application/pdf", "image/jpeg", "image/png"]

/** Error de un archivo elegido a mano: PDF, JPG o PNG de hasta 10 MB (el mismo límite que el resto del módulo). */
export const errorArchivo = (f: File) =>
  !TIPOS.includes(f.type) ? `${f.name}: solo PDF, JPG o PNG.` : f.size > MAX_MB * 1024 * 1024 ? `${f.name}: supera ${MAX_MB} MB.` : undefined

interface Opciones {
  accionId: number
  cerrado: boolean
  open: boolean
}

/** Lista, altas, sustitución y retiro de los soportes de una acción (G.2.CAS.ACC.11). */
export function useSoportesAccion({ accionId, cerrado, open }: Opciones) {
  const { notify } = useNotify()
  const consulta = useSoportesAccionQuery(accionId, open)
  const { vigentes, anteriores } = partirSoportes(consulta.data)

  const [panel, setPanel] = useState<PanelSoporte | null>(null)
  const [motivo, setMotivo] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [intento, setIntento] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const onError = (error: Error) => setNotice({ id: Date.now(), message: getErrorMessage(error) })
  const cerrarPanel = () => {
    setPanel(null)
    setMotivo("")
    setArchivo(null)
    setIntento(false)
  }
  const cerrar = () => {
    cerrarPanel()
    setNotice(null)
  }

  const agregar = useAgregarSoporteMutation({
    mutationConfig: { onSuccess: () => notify("Soporte agregado.", { variant: "success" }), onError },
  })
  const sustituir = useSustituirSoporteMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Soporte sustituido.", { variant: "success" })
        cerrarPanel()
      },
      onError,
    },
  })
  const retirar = useRetirarSoporteMutation({
    mutationConfig: {
      onSuccess: () => {
        notify("Soporte retirado.", { variant: "success" })
        cerrarPanel()
      },
      onError,
    },
  })

  const errorMotivo = intento ? errorMotivoSoporte(motivo) : undefined
  const errorSustituto = intento && panel?.tipo === "sustituir" && !archivo ? "Elija el archivo que sustituye." : undefined

  function confirmarPanel() {
    setIntento(true)
    if (!panel || errorMotivoSoporte(motivo) || (panel.tipo === "sustituir" && !archivo)) return
    setNotice(null)
    if (panel.tipo === "retirar") retirar.mutate({ soporteId: panel.soporte.id, motivo })
    else sustituir.mutate({ soporteId: panel.soporte.id, archivo: archivo!, motivo })
  }

  function cargarArchivo(f: File) {
    const e = errorArchivo(f)
    if (e) return setNotice({ id: Date.now(), message: e })
    setNotice(null)
    agregar.mutate({ accionId, archivo: f })
  }

  async function ver(s: SoporteAccion) {
    try {
      window.open((await fetchArchivoViewUrl(s.fk_archivo)).url, "_blank", "noopener")
    } catch (error) {
      onError(error as Error)
    }
  }

  return {
    consulta,
    vigentes,
    anteriores,
    puedeAgregar: puedeAgregarSoporte(vigentes.length, cerrado),
    panel,
    abrirPanel: (p: PanelSoporte) => {
      cerrarPanel()
      setPanel(p)
    },
    cerrarPanel,
    motivo,
    setMotivo,
    archivo,
    elegirSustituto: (f: File) => {
      const e = errorArchivo(f)
      if (e) return setNotice({ id: Date.now(), message: e })
      setNotice(null)
      setArchivo(f)
    },
    errorMotivo,
    errorSustituto,
    confirmarPanel,
    pendingPanel: retirar.isPending || sustituir.isPending,
    vincularCaso: () => {
      setNotice(null)
      agregar.mutate({ accionId, vincularCaso: true })
    },
    cargarArchivo,
    agregando: agregar.isPending,
    ver,
    notice,
    cerrarNotice: () => setNotice(null),
    cerrar,
  }
}
