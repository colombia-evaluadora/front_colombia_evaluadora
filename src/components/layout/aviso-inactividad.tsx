import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClockIcon, SignOutIcon } from "@/components/ui/icons"
import {
  CLAVE_ACTIVIDAD,
  CLAVE_CIERRE,
  calcularFase,
  formatearCuentaRegresiva,
} from "@/components/layout/aviso-inactividad-estado"
import { paths } from "@/config/paths"
import { setAuthToken } from "@/lib/api-client"
import { getUser, useLogout } from "@/lib/auth"
import { NetworkSessionError } from "@/lib/network-error"

const EVENTOS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const
/** Sin escribir en localStorage en cada evento: basta una vez cada 15 s. */
const ESCRITURA_MS = 15_000

const MENSAJE_INACTIVIDAD = "Su sesión se cerró por inactividad. Vuelva a iniciar sesión."
const MENSAJE_SESION_MUERTA = "Su sesión ya no está activa. Vuelva a iniciar sesión."

function leer(clave: string): number {
  try {
    return Number(localStorage.getItem(clave) ?? 0) || 0
  } catch {
    return 0
  }
}

function escribir(clave: string, valor: number) {
  try {
    localStorage.setItem(clave, String(valor))
  } catch {
    // Sin almacenamiento: cuenta solo esta pestaña.
  }
}

/**
 * Aviso de inactividad (Guía de Diseño UX §8.5, regla 27) como modal: la franja
 * amarilla pasaba desapercibida. La actividad de cualquier pestaña cuenta
 * (localStorage).
 *
 * «Seguir conectado» renueva la sesión con `POST /auth/refresh`. Si el servidor
 * ya no la reconoce se cierra la sesión local y se va al login con `redirectTo`,
 * en vez de quedarse con un mensaje y sin salida. Lo que pasaba en testv2: otra
 * pestaña (o este mismo temporizador, atrasado por estar la pestaña oculta)
 * cerraba la sesión por inactividad; `POST /auth/logout` revoca la familia y
 * borra la cookie `sso_refresh` para TODAS las pestañas, y la que quedaba con el
 * aviso abierto hacía un refresh sin cookie (401 `no_refresh_cookie`).
 * auth-center no tiene timeout de inactividad propio: el refresh vive 30 días.
 * Por eso ahora el cierre se difunde a las demás pestañas (`CLAVE_CIERRE`).
 */
export function AvisoInactividad() {
  const logout = useLogout()
  const queryClient = useQueryClient()
  const router = useRouter()
  const ultimo = useRef(Date.now())
  const cerrando = useRef(false)
  const abiertoRef = useRef(false)
  const [restanteMs, setRestanteMs] = useState<number | null>(null)
  const [renovando, setRenovando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Cierre limpio + login con vuelta a la ruta actual. `avisarOtras` deja la
   * marca para que las demás pestañas hagan lo mismo (no la deja quien
   * reacciona a la marca, para no rebotar).
   */
  async function cerrarSesion(mensaje: string, { avisarOtras = true } = {}) {
    if (cerrando.current) return
    cerrando.current = true
    const redirectTo = router.state.location.href
    if (avisarOtras) escribir(CLAVE_CIERRE, Date.now())
    try {
      await logout.mutateAsync(undefined)
    } catch {
      // El servidor rechazó el logout: igual se limpia este equipo, la sesión
      // ya no se puede usar desde acá.
      setAuthToken(null)
      queryClient.clear()
    }
    abiertoRef.current = false
    setRestanteMs(null)
    toast.info(mensaje, { id: "sesion-inactividad" })
    await router.navigate({ to: paths.auth.login.path, search: { redirectTo } })
  }

  function registrarActividad() {
    const ahora = Date.now()
    ultimo.current = ahora
    escribir(CLAVE_ACTIVIDAD, ahora)
  }

  function revisar() {
    if (cerrando.current) return
    const { fase, restanteMs: resta } = calcularFase(Date.now(), Math.max(ultimo.current, leer(CLAVE_ACTIVIDAD)))
    if (fase === "expirado") {
      void cerrarSesion(MENSAJE_INACTIVIDAD)
      return
    }
    abiertoRef.current = fase === "aviso"
    setRestanteMs(fase === "aviso" ? resta : null)
    if (fase !== "aviso") setError(null)
  }

  useEffect(() => {
    registrarActividad()
    const marcar = () => {
      // Con el aviso abierto solo cuenta «Seguir conectado»: mover el mouse
      // sobre el modal no debe renovar a escondidas.
      if (cerrando.current || abiertoRef.current) return
      if (Date.now() - ultimo.current < ESCRITURA_MS) return
      registrarActividad()
    }
    const enStorage = (e: StorageEvent) => {
      if (e.key === CLAVE_CIERRE && e.newValue) void cerrarSesion(MENSAJE_INACTIVIDAD, { avisarOtras: false })
      else if (e.key === CLAVE_ACTIVIDAD) revisar()
    }
    EVENTOS.forEach((e) => window.addEventListener(e, marcar, { passive: true, capture: true }))
    window.addEventListener("storage", enStorage)
    // Al volver a la pestaña (o despertar el equipo) se revisa enseguida: los
    // temporizadores de pestañas ocultas se atrasan.
    document.addEventListener("visibilitychange", revisar)
    const timer = window.setInterval(revisar, 1_000)
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, marcar, { capture: true }))
      window.removeEventListener("storage", enStorage)
      document.removeEventListener("visibilitychange", revisar)
      window.clearInterval(timer)
    }
    // El efecto corre una vez por montaje; las funciones leen refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function seguirConectado() {
    // Primero la actividad: así el temporizador no cierra mientras se renueva.
    registrarActividad()
    setRenovando(true)
    setError(null)
    try {
      const usuario = await queryClient.fetchQuery({ queryKey: ["auth-user"], queryFn: getUser, staleTime: 0 })
      if (usuario) {
        abiertoRef.current = false
        setRestanteMs(null)
      } else await cerrarSesion(MENSAJE_SESION_MUERTA)
    } catch (e) {
      // Solo un error de red deja la sesión en duda: se puede reintentar.
      if (e instanceof NetworkSessionError) setError("No se pudo renovar la sesión. Revise su conexión e intente de nuevo.")
      else await cerrarSesion(MENSAJE_SESION_MUERTA)
    } finally {
      setRenovando(false)
    }
  }

  // Controlado y sin `onOpenChange`: ni Escape ni un clic afuera lo cierran.
  return (
    <AlertDialog open={restanteMs != null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ClockIcon className="size-5 shrink-0 text-yellow" aria-hidden />
            Su sesión está por cerrarse
          </AlertDialogTitle>
          <AlertDialogDescription>
            Por inactividad, la sesión se cerrará en{" "}
            <strong className="text-foreground tabular-nums">{formatearCuentaRegresiva(restanteMs ?? 0)}</strong>. Lo que
            no haya guardado se perderá.
          </AlertDialogDescription>
          {error ? (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" color="neutral" disabled={renovando} onClick={() => void cerrarSesion("Cerró la sesión.")}>
            <SignOutIcon data-icon="inline-start" />
            Cerrar sesión
          </Button>
          <Button color="primary" disabled={renovando} aria-busy={renovando} onClick={() => void seguirConectado()}>
            {renovando ? "Renovando…" : "Seguir conectado"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
