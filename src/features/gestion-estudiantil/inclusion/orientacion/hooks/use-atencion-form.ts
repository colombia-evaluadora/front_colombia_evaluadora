import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { useAppForm } from "@/lib/forms"

import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useAnularAtencion, useGuardarAtencion } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { useAtencionQuery, useEstudiantesAtencionQuery, useRemisionesDeQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { atencionAlBackend, esquemaAtencion, valoresDesde } from "@/features/gestion-estudiantil/inclusion/orientacion/utils/atencion-form"
import { mensajePiar } from "@/features/gestion-estudiantil/inclusion/piar/utils/errores-piar"

interface SearchAtencion {
  matricula?: number
  remision?: number
  motivo?: number
  estudiante?: string
  ver?: boolean
}

/** Estado de la página de atención (ATE.1): nueva, desde una remisión, modificar o ver. */
export function useAtencionForm() {
  const navigate = useNavigate()
  const { atencionId } = useParams({ strict: false }) as { atencionId?: string }
  const s = useSearch({ strict: false }) as SearchAtencion
  const id = atencionId ? Number(atencionId) : undefined
  const { data: detalle, isPending, error } = useAtencionQuery(id)

  const modalidades = useCatalogo("MODALIDAD_ATENCION_ORIENTACION")
  const origenes = useCatalogo("ORIGEN_ATENCION_ORIENTACION")
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const entidades = useCatalogo("ENTIDAD_REMISION")

  const [matricula, setMatricula] = useState(s.matricula ? String(s.matricula) : "")
  const [busqueda, setBusqueda] = useState("")
  const [remision, setRemision] = useState(s.remision ? String(s.remision) : "")
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const estudianteFijo = detalle?.estudiante.nombre ?? s.estudiante
  const estudiantes = useEstudiantesAtencionQuery(busqueda, !id && !s.matricula).data ?? []
  const remisiones = useRemisionesDeQuery(detalle ? String(detalle.estudiante.fk_tmatricula) : matricula).data ?? []

  const guardar = useGuardarAtencion()
  const anular = useAnularAtencion()
  const volver = () => navigate({ to: paths.app.inclusionOrientacion.getHref(), search: { tab: "orientacion" } })
  const avisar = (e: unknown) => setNotice({ id: Date.now(), message: mensajePiar(e) })

  const form = useAppForm({
    defaultValues: valoresDesde(undefined, s.motivo),
    validators: { onSubmit: esquemaAtencion },
    onSubmit: async ({ value }) => {
      if (!id && !matricula) return setNotice({ id: Date.now(), message: "Elija el estudiante." })
      const esRemision = origenes.find((o) => o.value === value.origen)?.codigo === "REMISION_DOCENTE"
      if (esRemision && !remision) return setNotice({ id: Date.now(), message: "Elija la remisión de origen." })
      const body = atencionAlBackend(value, esRemision ? Number(remision) : null)
      try {
        await guardar.mutateAsync({ id, body: id ? body : { ...body, FK_MATRICULA: Number(matricula) } })
        volver()
      } catch (e) {
        avisar(e)
      }
    },
  })

  // Al llegar el detalle o los catálogos: sin esto los selects quedan vacíos.
  useEffect(() => {
    if (detalle) {
      form.reset(valoresDesde(detalle))
      if (detalle.remision_origen) setRemision(String(detalle.remision_origen.id))
    }
    // Solo al cargar el detalle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detalle?.id]);
  useEffect(() => {
    if (id) return
    const modalidad = modalidades.find((m) => m.codigo === "ATENCION")?.value
    const origen = s.remision ? origenes.find((o) => o.codigo === "REMISION_DOCENTE")?.value : undefined
    if (modalidad && !form.state.values.modalidad) form.setFieldValue("modalidad", modalidad)
    if (origen && !form.state.values.origen) form.setFieldValue("origen", origen)
    // Una vez lleguen los catálogos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalidades.length, origenes.length])

  return {
    id, detalle, cargando: id != null && isPending, error, soloLectura: Boolean(s.ver),
    modalidades, origenes, motivos, entidades,
    matricula, setMatricula, setBusqueda, estudiantes, estudianteFijo, remision, setRemision, remisiones,
    notice, setNotice, form, guardando: guardar.isPending, volver,
    anular: (motivo: string) => anular.mutateAsync({ id: id as number, motivo }).then(volver),
  }
}
