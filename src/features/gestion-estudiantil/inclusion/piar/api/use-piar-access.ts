import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"

/** `GET /gestion-estudiantil/inclusion/acceso` (`fn_inclusion_acceso`, V602): lo que el usuario puede en el menú. */
export interface AccesoInclusion {
  puede_ver: boolean
  puede_ver_piar: boolean
  puede_ver_orientacion: boolean
  puede_ver_aviso_sin_piar: boolean
  /** El rol de sede exporta y consulta el informe solo con una sede elegida. */
  informe_requiere_sede: boolean
  puede_crear_piar: boolean
  puede_crear_atencion: boolean
  puede_ver_informe: boolean
}

export const fetchAccesoInclusion = () =>
  evalCol.getRows<AccesoInclusion>("/gestion-estudiantil/inclusion/acceso").then((r) => r[0] ?? null)

/** Banderas de acceso de Inclusión y orientación; sin respuesta, todo deshabilitado. El backend vuelve a validar cada acción. */
export function usePiarAccess() {
  const q = useQuery({ queryKey: ["inclusion", "acceso"], queryFn: fetchAccesoInclusion, staleTime: 60_000, retry: false })
  const a = q.data
  return {
    cargando: q.isPending,
    veListado: Boolean(a?.puede_ver_piar),
    veOrientacion: Boolean(a?.puede_ver_orientacion),
    veAvisoSinPiar: Boolean(a?.puede_ver_aviso_sin_piar),
    veInforme: Boolean(a?.puede_ver_informe),
    informeRequiereSede: Boolean(a?.informe_requiere_sede),
    puedeCrearPiar: Boolean(a?.puede_crear_piar),
    puedeCrearAtencion: Boolean(a?.puede_crear_atencion),
  }
}
