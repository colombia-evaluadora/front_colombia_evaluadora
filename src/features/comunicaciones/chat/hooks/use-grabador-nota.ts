import { useEffect, useRef, useState } from "react"

import { MAX_ADJUNTO_MB } from "@/features/comunicaciones/chat/lib/archivo-adjunto"
import {
  MAX_NOTA_SEGUNDOS,
  elegirMimeGrabacion,
  extensionDeGrabacion,
  mensajeErrorMicrofono,
  motivoSinGrabacion,
  nombreNotaDeVoz,
} from "@/features/comunicaciones/chat/lib/nota-de-voz"

export type EstadoGrabador = "inactivo" | "pidiendo" | "grabando"

const MAX_BYTES = MAX_ADJUNTO_MB * 1024 * 1024

/**
 * Graba una nota de voz con `MediaRecorder`. `iniciar` pide el micrófono (el navegador
 * muestra su propio diálogo de permiso); `detener` entrega el archivo a `onGrabada`;
 * `cancelar` lo descarta. Se detiene sola a los `MAX_NOTA_SEGUNDOS` o al acercarse al tope de
 * peso de un adjunto. Al desmontar libera el micrófono.
 */
export function useGrabadorNota({
  onGrabada,
  onError,
}: {
  onGrabada: (archivo: File) => void
  onError: (mensaje: string) => void
}) {
  const [estado, setEstado] = useState<EstadoGrabador>("inactivo")
  const [segundos, setSegundos] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const descartarRef = useRef(false)
  const inicioRef = useRef(0)
  const callbacksRef = useRef({ onGrabada, onError })
  useEffect(() => {
    callbacksRef.current = { onGrabada, onError }
  })

  const liberar = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  useEffect(() => {
    if (estado !== "grabando") return
    const intervalo = window.setInterval(() => {
      const s = (Date.now() - inicioRef.current) / 1000
      setSegundos(s)
      if (s >= MAX_NOTA_SEGUNDOS && recorderRef.current?.state === "recording") recorderRef.current.stop()
    }, 250)
    return () => window.clearInterval(intervalo)
  }, [estado])

  // Cambiar de canal o cerrar la vista con el micrófono abierto: se descarta.
  useEffect(
    () => () => {
      descartarRef.current = true
      if (recorderRef.current?.state === "recording") recorderRef.current.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const iniciar = async () => {
    if (estado !== "inactivo") return
    const motivo = motivoSinGrabacion({
      mediaRecorder: typeof MediaRecorder === "undefined" ? undefined : MediaRecorder,
      getUserMedia: navigator.mediaDevices?.getUserMedia,
      contextoSeguro: window.isSecureContext !== false,
    })
    if (motivo) {
      callbacksRef.current.onError(motivo)
      return
    }
    setEstado("pidiendo")
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      setEstado("inactivo")
      callbacksRef.current.onError(mensajeErrorMicrofono(error))
      return
    }
    try {
      const mime = elegirMimeGrabacion(
        typeof MediaRecorder.isTypeSupported === "function" ? (m) => MediaRecorder.isTypeSupported(m) : undefined,
      )
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      const partes: Blob[] = []
      let bytes = 0
      descartarRef.current = false
      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return
        partes.push(e.data)
        bytes += e.data.size
        // Margen de 0,5 MB: el último fragmento aún no llegó.
        if (bytes >= MAX_BYTES - 512 * 1024 && recorder.state === "recording") recorder.stop()
      }
      recorder.onstop = () => {
        const { extension, tipo } = extensionDeGrabacion(recorder.mimeType || mime)
        liberar()
        setEstado("inactivo")
        setSegundos(0)
        if (descartarRef.current) return
        if (partes.length === 0) {
          callbacksRef.current.onError("La grabación quedó vacía. Revisa el micrófono e inténtalo de nuevo.")
          return
        }
        const archivo = new File(partes, nombreNotaDeVoz(new Date(), extension), { type: tipo })
        callbacksRef.current.onGrabada(archivo)
      }
      recorder.onerror = () => {
        descartarRef.current = true
        liberar()
        setEstado("inactivo")
        setSegundos(0)
        callbacksRef.current.onError("Se interrumpió la grabación. Inténtalo de nuevo.")
      }
      streamRef.current = stream
      recorderRef.current = recorder
      inicioRef.current = Date.now()
      setSegundos(0)
      // Fragmentos de 1 s: se puede vigilar el peso mientras se graba.
      recorder.start(1000)
      setEstado("grabando")
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop())
      setEstado("inactivo")
      callbacksRef.current.onError(mensajeErrorMicrofono(error))
    }
  }

  const detener = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
  }

  const cancelar = () => {
    descartarRef.current = true
    if (recorderRef.current?.state === "recording") recorderRef.current.stop()
    else liberar()
  }

  return { estado, segundos, iniciar, detener, cancelar }
}
