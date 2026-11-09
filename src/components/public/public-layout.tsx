import { useState } from "react"
import { Link, Outlet } from "@tanstack/react-router"

import logo from "@/assets/icon.svg"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { ListIcon, SignInIcon, XIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

/** Nombre del sitio público (Guía UX §17: identidad provisional). */
export const PUBLIC_SITE_NAME = "Control Escolar"

const NAV_LINKS = [
  { to: paths.publico.inscribir.getHref(), label: "Inscribir" },
  { to: paths.publico.consultarInscripcion.getHref(), label: "Consultar inscripción" },
  { to: paths.publico.verificar.getHref(), label: "Verificar documento" },
] as const

/**
 * Marco de las páginas públicas (Guía UX §22, U.1.INI.1): cabecera del sitio,
 * sin menú lateral ni cabecera de la app, y el pie con la Ley 1581.
 */
export function PublicLayout() {
  return (
    <div className="bg-background flex min-h-svh flex-col">
      <PublicHeader />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}

function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="bg-navy text-navy-foreground sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-8">
        <Link to={paths.home.getHref()} className="flex items-center gap-2 font-extrabold">
          <img src={logo} alt="" aria-hidden="true" className="size-8" />
          <span className="text-lg">{PUBLIC_SITE_NAME}</span>
        </Link>

        <nav aria-label="Sitio público" className="ml-auto hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-navy-foreground/90 hover:text-navy-foreground border-b-2 border-transparent py-1 text-sm"
              activeProps={{ className: "border-navy-foreground font-bold text-navy-foreground" }}
            >
              {link.label}
            </Link>
          ))}
          <LoginButton />
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="text-navy-foreground md:hidden"
            aria-expanded={open}
            aria-controls="menu-publico"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <XIcon /> : <ListIcon />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="menu-publico" aria-label="Sitio público" className="flex flex-col gap-1 px-4 pb-4 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm hover:bg-white/10"
              activeProps={{ className: "font-bold bg-white/10" }}
            >
              {link.label}
            </Link>
          ))}
          <LoginButton className="mt-2 self-start" />
        </nav>
      )}
    </header>
  )
}

function LoginButton({ className }: { className?: string }) {
  return (
    <Link
      to={paths.auth.login.getHref()}
      className={cn(
        "border-navy-foreground/80 inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-sm font-semibold hover:bg-white/10",
        className,
      )}
      activeProps={{ className: "bg-navy-foreground text-navy" }}
    >
      <SignInIcon className="size-4" aria-hidden="true" />
      Iniciar sesión
    </Link>
  )
}

function PublicFooter() {
  return (
    <footer className="bg-card text-muted-foreground border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {/* La política de tratamiento de datos y la ayuda aún no tienen página. */}
        <p>Tratamos sus datos conforme a la Ley 1581 de 2012.</p>
        <p>Plataforma {PUBLIC_SITE_NAME} · bySloz</p>
      </div>
    </footer>
  )
}
