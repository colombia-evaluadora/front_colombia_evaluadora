import { Badge } from "@/components/ui/badge"
import { LockIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/**
 * Marca de la Regla 116 de Establecimiento: el establecimiento agregó al funcionario y este aún no
 * le autoriza el tratamiento de datos (lo hace desde Mi cuenta). Mientras tanto el SSO oculta su
 * documento, contacto, fecha de nacimiento, género, foto y dirección (`datos_restringidos`).
 */
export function SinAutorizacionBadge() {
  return (
    <Badge variant="soft" color="warning" title="Aún no autoriza el tratamiento de sus datos a este establecimiento">
      <LockIcon data-icon="inline-start" aria-hidden />
      Sin autorización
    </Badge>
  )
}

/** Aviso de la ficha: por qué faltan datos y por qué no se pueden modificar. */
export function SinAutorizacionAviso({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-yellow-stroke bg-yellow-22 p-4 text-sm text-foreground",
        className,
      )}
    >
      <LockIcon className="mt-0.5 size-5 shrink-0 text-yellow" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Sin autorización de tratamiento de datos</p>
        <p className="text-muted-foreground">
          El funcionario aún no autoriza a este establecimiento el tratamiento de sus datos personales. Hasta que lo
          haga desde Mi cuenta, su documento, contacto, fecha de nacimiento, género, foto y dirección se ocultan y no
          se pueden modificar.
        </p>
      </div>
    </div>
  )
}
