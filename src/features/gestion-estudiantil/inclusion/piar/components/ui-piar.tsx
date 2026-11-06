import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { InfoIcon, PlusIcon, WarningCircleIcon } from "@/components/ui/icons"
import { fetchArchivoViewUrl } from "@/lib/files"

import type { ArchivoRef } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

const AVISO = {
  warning: { fondo: "bg-yellow-22", Icono: WarningCircleIcon, color: "text-yellow" },
  info: { fondo: "bg-primary-22", Icono: InfoIcon, color: "text-primary" },
  error: { fondo: "bg-red-22", Icono: WarningCircleIcon, color: "text-red" },
}

/** Aviso fijo de la pantalla (a diferencia de `NoticeBanner`, no se descarta). */
export function AvisoPiar({ tipo = "warning", children }: { tipo?: keyof typeof AVISO; children: ReactNode }) {
  const { fondo, Icono, color } = AVISO[tipo]
  return (
    <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${fondo}`} role="status">
      <Icono className={`mt-0.5 size-4 shrink-0 ${color}`} />
      <div>{children}</div>
    </div>
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
