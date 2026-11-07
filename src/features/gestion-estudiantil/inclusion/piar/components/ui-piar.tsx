import type { ReactNode } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { InfoIcon, PlusIcon, WarningCircleIcon } from "@/components/ui/icons"
import { fetchArchivoViewUrl } from "@/lib/files"

import type { ArchivoRef } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

const AVISO = {
  warning: { variant: "warning", Icono: WarningCircleIcon },
  info: { variant: "default", Icono: InfoIcon },
  error: { variant: "destructive", Icono: WarningCircleIcon },
} as const

/** Aviso fijo de la pantalla (a diferencia de `NoticeBanner`, no se descarta). */
export function AvisoPiar({ tipo = "warning", children }: { tipo?: keyof typeof AVISO; children: ReactNode }) {
  const { variant, Icono } = AVISO[tipo]
  return (
    <Alert variant={variant} role="status">
      <Icono />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export function EnlaceArchivo({ archivo }: { archivo: ArchivoRef }) {
  return (
    <button
      type="button"
      className="text-primary hover:underline"
      onClick={async () => window.open((await fetchArchivoViewUrl(archivo.id)).url, "_blank", "noopener")}
    >
      {archivo.nombre}
    </button>
  )
}

export function ListaDatos({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">{children}</dl>
}

export function Par({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

export function BotonSeccion({ onClick, icono, children }: { onClick: () => void; icono?: ReactNode; children: ReactNode }) {
  return (
    <Button size="xs" variant="outline" color="neutral" type="button" onClick={onClick}>
      {icono ?? <PlusIcon data-icon="inline-start" />}
      {children}
    </Button>
  )
}

export function BotonQuitar({ onClick }: { onClick: () => void }) {
  return (
    <Button size="xs" variant="ghost" color="neutral" type="button" onClick={onClick}>
      Quitar
    </Button>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
}
