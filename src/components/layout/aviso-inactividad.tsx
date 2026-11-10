import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ClockIcon } from "@/components/ui/icons"
import { useLogout } from "@/lib/auth"

/** Regla 27: la sesión se cierra tras 30 minutos sin actividad, con aviso 2 minutos antes. */
const INACTIVIDAD_MS = 30 * 60 * 1000
const AVISO_MS = 2 * 60 * 1000
const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart"] as const

/**
 * Franja de advertencia de inactividad (Guía de Diseño UX, §8.5). La actividad
 * de cualquier pestaña de la app cuenta: se comparte por localStorage.
 */
export function AvisoInactividad() {
  const logout = useLogout()
  const [avisar, setAvisar] = useState(false)
  const ultimo = useRef(Date.now())

  useEffect(() => {
    const KEY = "ce:ultima-actividad"
    const marcar = () => {
      const ahora = Date.now()
      // Sin escribir en cada evento: basta una vez cada 15 s.
      if (ahora - ultimo.current < 15_000) return
      ultimo.current = ahora
      try {
        localStorage.setItem(KEY, String(ahora))
      } catch {
        // Sin almacenamiento: cuenta solo esta pestaña.
      }
    }
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }))
    const timer = window.setInterval(() => {
      let otra = 0
      try {
        otra = Number(localStorage.getItem(KEY) ?? 0)
      } catch {
        otra = 0
      }
      const inactivo = Date.now() - Math.max(ultimo.current, otra)
      if (inactivo >= INACTIVIDAD_MS) {
        window.clearInterval(timer)
        logout.mutate(undefined)
      } else {
        setAvisar(inactivo >= INACTIVIDAD_MS - AVISO_MS)
      }
    }, 5_000)
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, marcar))
      window.clearInterval(timer)
    }
    // logout.mutate es estable; el efecto corre una vez por montaje.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!avisar) return null
  return (
    <div role="alert" className="bg-yellow-22 text-foreground flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm">
      <ClockIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        Su sesión se cerrará en 2 minutos por inactividad. Lo que no haya guardado se perderá.
      </span>
      <Button
        size="sm"
        color="primary"
        onClick={() => {
          ultimo.current = 0
          // Registra la actividad de inmediato (el umbral de 15 s se salta).
          window.dispatchEvent(new KeyboardEvent("keydown"))
          setAvisar(false)
        }}
      >
        Seguir conectado
      </Button>
    </div>
  )
}
