import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Marca el modal con `data-desborde` mientras su contenido hace scroll y aún queda algo por debajo:
 * es lo que prende la sombra del pie (`DialogFooter`). Se escribe directo en el DOM para no
 * re-renderizar el modal en cada scroll. Se re-evalúa al hacer scroll y cuando cambia el alto del
 * modal o de alguno de sus hijos (p. ej. al abrir una sección plegable).
 */
function useMarcaDesborde() {
  const limpiar = React.useRef<(() => void) | null>(null)
  return React.useCallback((el: HTMLElement | null) => {
    limpiar.current?.()
    limpiar.current = null
    if (!el) return
    const evaluar = () => {
      const desborda = el.scrollHeight - el.clientHeight > 1
      const alFinal = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
      el.dataset.desborde = String(desborda && !alFinal)
    }
    const ro = new ResizeObserver(evaluar)
    const observarHijos = () => {
      ro.disconnect()
      ro.observe(el)
      for (const hijo of Array.from(el.children)) ro.observe(hijo)
      evaluar()
    }
    const mo = new MutationObserver(observarHijos)
    mo.observe(el, { childList: true })
    el.addEventListener("scroll", evaluar, { passive: true })
    observarHijos()
    limpiar.current = () => {
      ro.disconnect()
      mo.disconnect()
      el.removeEventListener("scroll", evaluar)
    }
  }, [])
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  const marcaDesborde = useMarcaDesborde()
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] scrollbar-slim overflow-y-auto -translate-x-1/2 -translate-y-1/2 gap-6 rounded-lg bg-popover p-6 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
        ref={marcaDesborde}
      >
        {children}
        {showCloseButton && (
          <Tooltip>
            <TooltipTrigger
              render={
                <DialogPrimitive.Close
                  data-slot="dialog-close"
                  render={
                    <Button
                      variant="ghost"
                      color="muted"
                      className="absolute top-5 right-5"
                      size="icon-sm"
                    />
                  }
                />
              }
            >
              <XIcon className="size-4" />
              <span className="sr-only">Cerrar</span>
            </TooltipTrigger>
            <TooltipContent>Cerrar</TooltipContent>
          </Tooltip>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      // Fijo abajo cuando el modal hace scroll: los botones no se pierden. `-bottom-6` porque el
      // sticky respeta el padding del modal: sin él quedaba un hueco de 24px por donde asomaba el
      // contenido. La sombra superior separa los botones del contenido, solo mientras hay scroll y queda contenido por debajo. Se extiende sobre el
      // padding del modal (-mx-6 -mb-6 + px-6 pb-6) con su mismo fondo, para que el contenido pase
      // por debajo sin asomarse.
      className={cn(
        "sticky -bottom-6 z-10 -mx-6 -mt-4 -mb-6 flex flex-col-reverse gap-2 bg-popover px-6 pt-4 pb-6 in-data-[desborde=true]:shadow-[0_-6px_12px_-8px_rgb(0_0_0/0.18)] sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        // `font-bold`, igual que los títulos de pantalla (`TableScreenTitle`):
        // el `semibold` se quedaba corto contra las etiquetas de los campos.
        "font-heading text-lg leading-none font-bold",
        className,
      )}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-0.5 text-sm leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
