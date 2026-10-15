import type { ReactNode } from "react"

/**
 * Hueco para la UX de suscripción Web Push ("Activar notificaciones en este
 * dispositivo", PLAN-comunicaciones §11.4), que vive en el change
 * `add-notificaciones-push-webpush` y en `features/notificaciones/push`.
 *
 * Este change NO importa nada de `push/` para no acoplarse a un trabajo que
 * avanza en paralelo: la página de preferencias renderiza `<PushToggleSlot>`
 * y quien implemente push lo monta así, sin tocar el formulario:
 *
 * ```tsx
 * <PushToggleSlot>
 *   <PushToggle />
 * </PushToggleSlot>
 * ```
 *
 * (en `pages/preferencias-page.tsx`, o pasando `pushToggle` a la página). Sin
 * hijos muestra un texto de "próximamente".
 */
export function PushToggleSlot({ children }: { children?: ReactNode }) {
  return (
    <section
      data-slot="push-toggle"
      aria-labelledby="push-toggle-titulo"
      className="flex flex-col gap-2 rounded-md border p-4"
    >
      <h2 id="push-toggle-titulo" className="text-sm font-semibold">
        Notificaciones en este dispositivo
      </h2>
      {children ?? (
        <p className="text-sm text-muted-foreground">
          Pronto podrás recibir notificaciones push en este navegador. Mientras tanto, revisa la campana de la
          aplicación.
        </p>
      )}
    </section>
  )
}
