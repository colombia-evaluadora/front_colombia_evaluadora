import { Link } from "@tanstack/react-router"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { SIN_ESCALA_MENSAJE } from "@/features/planeador/lib/instrumento-faltantes"

/**
 * Aviso cuando el período no tiene escala de valoración aplicable (o la escala no tiene
 * niveles activos). Reemplaza a los valores por defecto que antes se inventaban en el
 * front (niveles Bajo/Básico/Alto/Superior, rango 0-100): sin escala no hay qué precargar
 * y el instrumento no se puede guardar. El enlace solo aparece si el usuario puede ver
 * Período académico (las escalas cuelgan de cada período).
 */
export function SinEscalaAviso({ className }: { className?: string }) {
  const { puedeVer } = useMenuPermission("PERIODOS_ACADEMICOS")
  return (
    <Alert variant="warning" className={className} data-testid="sin-escala-aviso">
      <WarningIcon />
      <AlertTitle>Sin escala de valoración</AlertTitle>
      <AlertDescription>
        <p>
          {SIN_ESCALA_MENSAJE}{" "}
          {puedeVer && (
            <Link to={paths.app.establishments.academicPeriods.getHref()}>Ir a Período académico › Escalas de valoración</Link>
          )}
        </p>
      </AlertDescription>
    </Alert>
  )
}
