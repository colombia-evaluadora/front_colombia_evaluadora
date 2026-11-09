import { Link } from "@tanstack/react-router"

import { BackToHomeLink, PublicBand, PublicResult } from "@/components/public/public-page"
import { Button } from "@/components/ui/button"
import { ClockIcon, MagnifyingGlassIcon, PersonAddIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

const SERVICIOS = {
  inscribir: {
    icon: PersonAddIcon,
    title: "Inscribir",
    breadcrumb: ["Inscripciones", "Inscribir"],
  },
  consultar: {
    icon: MagnifyingGlassIcon,
    title: "Consultar inscripción",
    breadcrumb: ["Consultar inscripción"],
  },
} as const

/**
 * Inscribir (U.2) y Consultar inscripción (U.3) mientras no exista la
 * inscripción pública en el backend (Cobertura §3.3). Ver PLAN-paginas-publicas.md, fases 6 y 7.
 */
export function ProximamentePage({ servicio }: { servicio: keyof typeof SERVICIOS }) {
  const s = SERVICIOS[servicio]
  return (
    <PublicBand icon={s.icon} title={s.title} breadcrumb={[...s.breadcrumb]} width="md">
      <PublicResult
        icon={ClockIcon}
        title="Muy pronto"
        actions={
          <>
            <Button color="primary" nativeButton={false} render={<Link to={paths.auth.login.getHref()} />}>
              Iniciar sesión
            </Button>
            <BackToHomeLink />
          </>
        }
      >
        Este servicio estará disponible pronto. Mientras tanto, comuníquese con el establecimiento.
      </PublicResult>
    </PublicBand>
  )
}

export function InscribirProximamentePage() {
  return <ProximamentePage servicio="inscribir" />
}

export function ConsultarProximamentePage() {
  return <ProximamentePage servicio="consultar" />
}
