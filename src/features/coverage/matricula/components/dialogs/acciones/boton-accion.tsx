import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { PersonRemoveIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DotsThreeVerticalIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ONLINE_ONLY_TOOLTIP } from "@/lib/offline/use-online-only"

type Icono = typeof PersonRemoveIcon

interface Registro {
  label: string
  Icon: Icono
  onClick: () => void
  disabled?: boolean
  destructivo?: boolean
  /** Texto emergente de la acción inactiva (p. ej. «No hay un registro duplicado…»). */
  motivoInactiva?: string
}

interface Entrada {
  datos: { current: Registro }
  ancla: { current: HTMLSpanElement | null }
}

const AccionesFilaContext = createContext<{
  registrar: (id: string, entrada: Entrada) => () => void
  visibles: ReadonlySet<string>
} | null>(null)

/**
 * Acciones de una fila: muestra como ícono las primeras `limite` (en el orden
 * en que aparecen) y lleva el resto al menú ⁞. Cada acción sigue montada con su
 * diálogo; desde el menú solo se dispara su onClick. `limite` 0 lleva todas al
 * menú; `ocultar` saca acciones por etiqueta (siguen montadas, no se ofrecen).
 */
export function AccionesFila({
  limite = 4,
  ocultar,
  children,
}: {
  limite?: number
  ocultar?: readonly string[]
  children: ReactNode
}) {
  const entradas = useRef(new Map<string, Entrada>())
  const [version, setVersion] = useState(0)
  const [orden, setOrden] = useState<string[]>([])

  // Estable entre renders: si cambiara, cada acción se volvería a registrar en bucle.
  const [registrar] = useState(() => (id: string, entrada: Entrada) => {
    entradas.current.set(id, entrada)
    setVersion((v) => v + 1)
    return () => {
      entradas.current.delete(id)
      setVersion((v) => v + 1)
    }
  })

  // Orden del DOM: las que se montan después (permisos, datos) no saltan al final.
  useLayoutEffect(() => {
    const ids = [...entradas.current.keys()].sort((a, b) => {
      const ea = entradas.current.get(a)?.ancla.current
      const eb = entradas.current.get(b)?.ancla.current
      if (!ea || !eb) return 0
      return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    })
    setOrden((prev) => (prev.length === ids.length && prev.every((x, i) => x === ids[i]) ? prev : ids))
  }, [version])

  const ofrecidas = ocultar?.length
    ? orden.filter((id) => !ocultar.includes(entradas.current.get(id)?.datos.current.label ?? ""))
    : orden
  const sobran = ofrecidas.length > limite
  const visibles = new Set(sobran ? ofrecidas.slice(0, limite) : ofrecidas)
  const enMenu = sobran ? ofrecidas.slice(limite) : []

  return (
    <AccionesFilaContext.Provider value={{ registrar, visibles }}>
      <div className="flex items-center justify-end gap-1">
        {children}
        {enMenu.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label="Más acciones" />}
            >
              <DotsThreeVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {enMenu.map((id) => {
                const e = entradas.current.get(id)
                const datos = e?.datos.current
                if (!datos) return null
                // Envuelta en OnlineOnlyAction sin red: inactiva en el menú con el aviso estándar.
                const sinRed = Boolean(e.ancla.current?.closest("[data-online-only]"))
                const r = sinRed ? { ...datos, disabled: true, motivoInactiva: ONLINE_ONLY_TOOLTIP } : datos
                if (r.disabled && r.motivoInactiva)
                  return (
                    <Tooltip key={id}>
                      {/* El ítem inactivo no recibe el puntero: el tooltip va en un envoltorio. */}
                      <TooltipTrigger render={<span className="block" />}>
                        <DropdownMenuItem disabled>
                          <r.Icon /> {r.label}
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left">{r.motivoInactiva}</TooltipContent>
                    </Tooltip>
                  )
                return (
                  <DropdownMenuItem
                    key={id}
                    disabled={r.disabled}
                    variant={r.destructivo ? "destructive" : undefined}
                    onClick={r.onClick}
                  >
                    <r.Icon /> {r.label}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </AccionesFilaContext.Provider>
  )
}

/** Disparador de una acción: ícono con tooltip (fila) o botón con texto (detalle, barra de lote). */
export function BotonAccion({
  modo,
  label,
  ariaLabel,
  Icon,
  onClick,
  disabled,
  destructivo,
  motivoInactiva,
}: {
  modo: "icon" | "button"
  label: string
  ariaLabel?: string
  Icon: Icono
  onClick: () => void
  disabled?: boolean
  destructivo?: boolean
  motivoInactiva?: string
}) {
  const fila = useContext(AccionesFilaContext)
  const id = useId()
  const ancla = useRef<HTMLSpanElement | null>(null)
  const datos = useRef<Registro>({ label, Icon, onClick, disabled, destructivo, motivoInactiva })
  // Se actualiza en cada render: el menú lee siempre el onClick vigente.
  useLayoutEffect(() => {
    datos.current = { label, Icon, onClick, disabled, destructivo, motivoInactiva }
  })
  const enFila = fila != null && modo === "icon"
  const registrar = fila?.registrar
  useLayoutEffect(() => {
    if (!enFila || !registrar) return
    return registrar(id, { datos, ancla })
  }, [enFila, registrar, id])

  if (modo === "button") {
    return (
      // Botón del encabezado del detalle: secundario (outline neutro), como el resto de acciones en modo ver (§13).
      <Button type="button" variant="outline" color="neutral" size="sm" aria-label={ariaLabel} onClick={onClick} disabled={disabled}>
        <Icon data-icon="inline-start" />
        {label}
      </Button>
    )
  }
  const icono = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color={destructivo ? "destructive" : "neutral"}
            size="icon-sm"
            aria-label={ariaLabel ?? label}
            onClick={onClick}
            disabled={disabled}
            // Inactiva con motivo: sigue enfocable para mostrar el texto emergente.
            {...(disabled && motivoInactiva ? { disabled: false, "aria-disabled": true, onClick: undefined, className: "opacity-50" } : {})}
          />
        }
      >
        <Icon />
      </TooltipTrigger>
      <TooltipContent>{disabled && motivoInactiva ? motivoInactiva : (ariaLabel ?? label)}</TooltipContent>
    </Tooltip>
  )
  if (!enFila) return icono
  // El ancla marca su lugar en la fila aunque la acción vaya al menú.
  return (
    <span ref={ancla} className="contents">
      {fila.visibles.has(id) ? icono : null}
    </span>
  )
}
