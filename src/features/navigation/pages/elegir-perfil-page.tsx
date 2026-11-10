import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChalkboardTeacherIcon, UsersIcon, UserIcon } from "@/components/ui/icons"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"
import { navigationKeys } from "@/features/navigation/api/query-keys"
import {
  PERFIL_LABEL,
  getUltimoPerfil,
  perfilesDeRoles,
  setPerfilDeSesion,
  type Perfil,
} from "@/features/navigation/lib/perfil"
import { elegirPerfilRoute } from "@/router"

const DESCRIPCION: Record<Perfil, string> = {
  FUNCIONARIO: "Lo que le corresponde según su cargo en el establecimiento.",
  ACUDIENTE: "El avance, la matrícula y las comunicaciones de los estudiantes a su cargo.",
  ESTUDIANTE: "Su avance académico, horario y comunicaciones.",
}

const ICONO: Record<Perfil, typeof UserIcon> = {
  FUNCIONARIO: ChalkboardTeacherIcon,
  ACUDIENTE: UsersIcon,
  ESTUDIANTE: UserIcon,
}

/** U.5.PER.1 Iniciar sesión — elegir perfil. */
export function ElegirPerfilPage() {
  const { redirectTo } = elegirPerfilRoute.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user, isPending } = useUser()

  if (isPending || !user) {
    return (
      <CardContent className="flex justify-center py-10">
        <Spinner />
      </CardContent>
    )
  }

  const email = user.email
  const perfiles = perfilesDeRoles(user.roles)
  const ultimo = getUltimoPerfil(email)

  function elegir(perfil: Perfil) {
    setPerfilDeSesion(email, perfil)
    // El menú y los permisos dependen del perfil: se descartan los del anterior.
    queryClient.removeQueries({ queryKey: navigationKeys.menu })
    // Solo rutas internas: un redirectTo externo no se sigue.
    const destino = redirectTo?.startsWith("/app") ? redirectTo : paths.app.root.getHref()
    navigate({ to: destino })
  }

  return (
    <>
      <CardHeader className="text-center">
        <CardTitle>¿Con qué perfil desea entrar?</CardTitle>
        <CardDescription>
          {user.name ? `${user.name}, su` : "Su"} cuenta tiene {perfiles.length} perfiles.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {perfiles.map((perfil) => {
          const Icon = ICONO[perfil]
          return (
            <button
              key={perfil}
              type="button"
              onClick={() => elegir(perfil)}
              className="bg-card hover:border-primary focus-visible:ring-ring/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {PERFIL_LABEL[perfil]}
                  {ultimo === perfil && (
                    <Badge variant="soft" color="info">
                      Último usado
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground block text-sm">{DESCRIPCION[perfil]}</span>
              </span>
            </button>
          )
        })}
        <p className="text-muted-foreground text-center text-xs">
          Puede cambiar de perfil en cualquier momento desde el menú del usuario, en la cabecera.
        </p>
      </CardContent>
    </>
  )
}
