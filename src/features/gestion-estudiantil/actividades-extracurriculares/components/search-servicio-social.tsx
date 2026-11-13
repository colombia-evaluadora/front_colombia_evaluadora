import { optionTerm } from "@/components/search/query-syntax"

import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { ComboOpciones as Combo } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BarraBusquedaFiltros } from "@/features/gestion-estudiantil/commons/components/barra-busqueda-filtros"
import {
  useSearchFiltros,
  type SearchFiltrosProps,
} from "@/features/gestion-estudiantil/commons/hooks/use-search-filtros"
import {
  SERVICIO_SOCIAL_FILTROS_VACIOS,
  type ServicioSocialFiltros,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"

export interface OpcionesFiltrosServicioSocial {
  sedes: Opcion[]
  jornadas: Opcion[]
  grados: Opcion[]
  estados: Opcion[]
}

interface Props extends SearchFiltrosProps<ServicioSocialFiltros> {
  opciones: OpcionesFiltrosServicioSocial
}

/** Buscador del listado de servicio social (G.5.SOC.LIS): por estudiante, con Sede, Jornada, Grado y Estado. */
export function SearchServicioSocial(props: Props) {
  const { opciones } = props
  const s = useSearchFiltros<ServicioSocialFiltros>({
    ...props,
    vacios: SERVICIO_SOCIAL_FILTROS_VACIOS,
    terms: [
      optionTerm("sede", "sede", opciones.sedes),
      optionTerm("jornada", "jornada", opciones.jornadas),
      optionTerm("grado", "grado", opciones.grados),
      optionTerm("estado", "estado", opciones.estados),
    ],
  })
  const { draft, setDraft } = s

  return (
    <BarraBusquedaFiltros id="servicio-social-search" placeholder="Buscar por estudiante" estado={s}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 px-4 md:grid-cols-2">
        <Combo
          id="servicio-social-sede"
          label="Sede"
          value={draft.sede}
          options={opciones.sedes}
          onChange={(sede) => setDraft({ ...draft, sede, jornada: "", grado: "" })}
        />
        <Combo
          id="servicio-social-jornada"
          label="Jornada"
          value={draft.jornada}
          options={opciones.jornadas}
          disabled={!draft.sede}
          placeholder={draft.sede ? "Todos" : "Elija una sede primero"}
          onChange={(jornada) => setDraft({ ...draft, jornada, grado: "" })}
        />
        <Combo
          id="servicio-social-grado"
          label="Grado"
          value={draft.grado}
          options={opciones.grados}
          disabled={!draft.sede || !draft.jornada}
          placeholder={draft.sede && draft.jornada ? "Todos" : "Elija sede y jornada primero"}
          onChange={(grado) => setDraft({ ...draft, grado })}
        />
        <Combo
          id="servicio-social-estado"
          label="Estado"
          value={draft.estado}
          options={opciones.estados}
          onChange={(estado) => setDraft({ ...draft, estado })}
        />
      </div>
    </BarraBusquedaFiltros>
  )
}
