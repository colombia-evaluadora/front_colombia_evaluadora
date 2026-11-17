import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { ClockIcon } from "@/components/ui/icons"
import { useQueryClient } from "@tanstack/react-query"

import { getUser, useLogout } from "@/lib/auth"

/** Regla 27: la sesión se cierra tras 30 minutos sin actividad, con aviso 2 minutos antes. */
const INACTIVIDAD_MS = 30 * 60 * 1000
/** La actividad de cualquier pestaña cuenta: se comparte por localStorage. */
const CLAVE_ACTIVIDAD = "ce:ultima-actividad"

function registrarActividad(ultimo: { current: number }) {
  const ahora = Date.now()
  ultimo.current = ahora
  try {
    localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora))
  } catch {
    // Sin almacenamiento: cuenta solo esta pestaña.
  }
}
const AVISO_MS = 2 * 60 * 1000
const EVENTOS = ["pointerdown", "keydown", "wheel", "touchstart"] as const

/**
 * Franja de advertencia de inactividad (Guía de Diseño UX, §8.5). La actividad
 * de cualquier pestaña de la app cuenta: se comparte por localStorage.
 */
export function AvisoInactividad() {
  const logout = useLogout()
  const queryClient = useQueryClient()
  const [avisar, setAvisar] = useState(false)
  const ultimo = useRef(Date.now())

  const [renovando, setRenovando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const marcar = () => {
      const ahora = Date.now()
      // Sin escribir en cada evento: basta una vez cada 15 s.
      if (ahora - ultimo.current < 15_000) return
      registrarActividad(ultimo)
    }
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true }))
    const timer = window.setInterval(() => {
      let otra = 0
      try {
        otra = Number(localStorage.getItem(CLAVE_ACTIVIDAD) ?? 0)
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
    <div role="alert" className="mr-4 mb-3 max-md:ml-4 rounded-md border border-yellow-stroke bg-yellow-22 text-foreground flex flex-wrap items-center gap-3 px-4 py-2 text-sm [&>svg]:text-yellow">
      <ClockIcon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        {error ?? "Su sesión se cerrará en 2 minutos por inactividad. Lo que no haya guardado se perderá."}
      </span>
      <Button
        size="sm"
        color="primary"
        disabled={renovando}
        aria-busy={renovando}
        onClick={async () => {
          // Primero la actividad (sin depender de eventos sintéticos): así el temporizador no cierra
          // la sesión mientras se renueva. Después se renueva la sesión con el servidor (refresh) y,
          // si ya no existe, se dice en lugar de mandar al login sin explicación.
          registrarActividad(ultimo)
          setRenovando(true)
          setError(null)
          try {
            const usuario = await queryClient.fetchQuery({ queryKey: ["auth-user"], queryFn: getUser, staleTime: 0 })
            if (usuario) setAvisar(false)
            else setError("Su sesión ya no está activa. Vuelva a iniciar sesión.")
          } catch {
            setError("No se pudo renovar la sesión. Revise su conexión e intente de nuevo.")
          } finally {
            setRenovando(false)
          }
        }}
      >
        Seguir conectado
      </Button>
    </div>
  )
}
