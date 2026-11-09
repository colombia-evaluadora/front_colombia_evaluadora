import type { ComponentType, ReactNode } from "react"
import { Link } from "@tanstack/react-router"

import { ArrowLeftIcon, CheckCircleIcon, HouseIcon, WarningIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>

/** Ruta "Inicio / …" de las páginas públicas. */
export function PublicBreadcrumb({ items, className }: { items: string[]; className?: string }) {
  return (
    <nav aria-label="Ruta" className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)}>
      <Link to={paths.home.getHref()} className="inline-flex items-center gap-1 opacity-80 hover:underline">
        <HouseIcon className="size-4" aria-hidden="true" />
        Inicio
      </Link>
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="opacity-60">/</span>
          <span aria-current={i === items.length - 1 ? "page" : undefined}>{item}</span>
        </span>
      ))}
    </nav>
  )
}

export function BackToHomeLink() {
  return (
    <Link to={paths.home.getHref()} className="text-primary inline-flex items-center gap-1 text-sm hover:underline">
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      Volver al inicio
    </Link>
  )
}

/** Banda de alta demanda (U.7.ALT.1, Regla 31.8): sin botón; la persona reintenta. */
export function HighDemandBanner() {
  return (
    <div role="alert" className="bg-yellow-22 text-yellow-foreground border-yellow-stroke flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <WarningIcon className="text-yellow size-4 shrink-0" aria-hidden="true" />
      Hay mucha demanda. Intente de nuevo en unos minutos.
    </div>
  )
}

interface PublicSplitProps {
  icon: IconComponent
  title: string
  description?: string
  /** Tres puntos de confianza del panel izquierdo. */
  points: [string, string, string]
  breadcrumb: string[]
  children: ReactNode
}

/**
 * Formularios cortos (Guía UX §22): panel de color a la izquierda y el
 * formulario sin tarjeta a la derecha. En celular el panel se reduce a una franja.
 */
export function PublicSplit({ icon: Icon, title, description, points, breadcrumb, children }: PublicSplitProps) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,45%)_1fr]">
      <section className="from-navy to-primary text-navy-foreground relative overflow-hidden bg-linear-to-br px-6 py-8 lg:flex lg:flex-col lg:justify-center lg:px-14">
        <Decoration />
        <div className="relative max-w-md">
          <span className="mb-4 hidden size-14 items-center justify-center rounded-xl bg-white/15 lg:flex">
            <Icon className="size-7" aria-hidden />
          </span>
          <h1 className="text-2xl font-extrabold lg:text-4xl">{title}</h1>
          {description && <p className="mt-2 opacity-90 lg:text-lg">{description}</p>}
          <ul className="mt-6 hidden flex-col gap-2 text-sm lg:flex">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <CheckCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex justify-center px-4 py-8 sm:px-8 lg:items-center">
        <div className="flex w-full max-w-md flex-col gap-5">
          <PublicBreadcrumb items={breadcrumb} className="text-muted-foreground" />
          {children}
        </div>
      </section>
    </div>
  )
}

interface PublicBandProps {
  icon: IconComponent
  title: string
  subtitle?: string
  breadcrumb: string[]
  /** Acciones de la vista: van arriba de la tarjeta, nunca al pie (Guía UX §3). */
  actions?: ReactNode
  width?: "md" | "lg" | "xl"
  children: ReactNode
}

/** Páginas anchas (Guía UX §22): franja de color con ruta y título, y tarjeta flotante. */
export function PublicBand({ icon: Icon, title, subtitle, breadcrumb, actions, width = "lg", children }: PublicBandProps) {
  const max = { md: "max-w-3xl", lg: "max-w-4xl", xl: "max-w-5xl" }[width]
  return (
    <div className="flex-1 pb-10">
      <section className="from-navy to-primary text-navy-foreground relative overflow-hidden bg-linear-to-br pb-24">
        <Decoration />
        <div className={cn("relative mx-auto flex flex-col gap-4 px-4 pt-8", max)}>
          <PublicBreadcrumb items={breadcrumb} />
          <div className="flex items-center gap-4">
            <span className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Icon className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
              {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
            </div>
          </div>
        </div>
      </section>
      <div className={cn("relative mx-auto -mt-16 px-4", max)}>
        <div className="bg-card overflow-hidden rounded-2xl border shadow-lg">
          {actions && <div className="flex justify-end gap-2 border-b px-6 py-3">{actions}</div>}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

interface PublicResultProps {
  icon: IconComponent
  tone?: "success" | "error" | "info"
  title: string
  children?: ReactNode
  actions?: ReactNode
}

/** Resultados que no son formulario: ícono grande, título, texto y botones. */
export function PublicResult({ icon: Icon, tone = "info", title, children, actions }: PublicResultProps) {
  const toneClass = { success: "bg-green-22 text-green", error: "bg-red-22 text-red", info: "bg-primary/10 text-primary" }[tone]
  return (
    <div className="flex flex-col items-start gap-3">
      <span className={cn("flex size-14 items-center justify-center rounded-full", toneClass)}>
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="text-xl font-bold">{title}</h2>
      {children && <div className="text-muted-foreground">{children}</div>}
      {actions && <div className="mt-2 flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

function Decoration() {
  return (
    <>
      <span aria-hidden="true" className="absolute -top-24 -right-16 size-80 rounded-full bg-white/10" />
      <span aria-hidden="true" className="absolute -bottom-24 -left-20 size-56 rounded-full bg-white/10" />
    </>
  )
}
