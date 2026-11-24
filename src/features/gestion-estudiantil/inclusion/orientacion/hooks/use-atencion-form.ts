import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearch } from "@tanstack/react-router"

import { queueNotice } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { useAppForm } from "@/lib/forms"

import { useCatalogo } from "@/features/gestion-estudiantil/commons/api/use-catalogo"
import { useGuardarAtencion } from "@/features/gestion-estudiantil/inclusion/orientacion/api/mutations/atenciones"
import { useEstudiantesAtencionQuery, useRemisionesDeQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import type { FirmanteForm } from "@/features/gestion-estudiantil/inclusion/orientacion/components/firmantes-atencion"
import type { AtencionDetalle } from "@/features/gestion-estudiantil/inclusion/orientacion/api/types"
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
export function useAtencionForm(detalle: AtencionDetalle | undefined, estado: { isPending: boolean; error: unknown }) {
  const navigate = useNavigate()
  const { atencionId } = useParams({ strict: false }) as { atencionId?: string }
  const s = useSearch({ strict: false }) as SearchAtencion
  const id = atencionId ? Number(atencionId) : undefined
  const { isPending, error } = estado

  const modalidades = useCatalogo("MODALIDAD_ATENCION_ORIENTACION")
  const origenes = useCatalogo("ORIGEN_ATENCION_ORIENTACION")
  const motivos = useCatalogo("MOTIVO_ORIENTACION")
  const entidades = useCatalogo("ENTIDAD_REMISION")
  const calidades = useCatalogo("CALIDAD_FIRMANTE_ATENCION")
  const [firmantes, setFirmantes] = useState<FirmanteForm[]>(() =>
    (detalle?.firmantes ?? []).map((f, i) => ({ clave: i + 1, funcionario: String(f.fk_tfuncionario), nombre: f.nombre, calidad: String(f.fk_tlv_calidad) })),
  )

  const [matricula, setMatricula] = useState(s.matricula ? String(s.matricula) : "")
  const [busqueda, setBusqueda] = useState("")
  const [remision, setRemision] = useState(detalle?.remision_origen ? String(detalle.remision_origen.id) : s.remision ? String(s.remision) : "")
  const [notice, setNotice] = useState<{ id: number; message: string } | null>(null)
  const estudianteFijo = detalle?.estudiante.nombre ?? s.estudiante
  const estudiantes = useEstudiantesAtencionQuery(busqueda, !id && !s.matricula).data ?? []
  const remisiones = useRemisionesDeQuery(detalle ? String(detalle.estudiante.fk_tmatricula) : matricula).data ?? []

  const guardar = useGuardarAtencion()
  const volver = () => navigate({ to: paths.app.inclusionOrientacion.getHref(), search: { tab: "orientacion" } })
  const avisar = (e: unknown) => setNotice({ id: Date.now(), message: mensajePiar(e) })

  const form = useAppForm({
    defaultValues: valoresDesde(detalle, s.motivo),
    validators: { onSubmit: esquemaAtencion },
    onSubmit: async ({ value }) => {
      if (!id && !matricula) return setNotice({ id: Date.now(), message: "Elija el estudiante." })
      const esRemision = origenes.find((o) => o.value === value.origen)?.codigo === "REMISION_DOCENTE"
      if (esRemision && !remision) return setNotice({ id: Date.now(), message: "Elija la remisión de origen." })
      if (firmantes.some((f) => !f.funcionario || !f.calidad)) return setNotice({ id: Date.now(), message: "Cada firmante necesita funcionario y calidad." })
      const body = {
        ...atencionAlBackend(value, esRemision ? Number(remision) : null),
        // Un JSONB viaja como cadena JSON; en una corrección, la lista reemplaza a los firmantes actuales.
        FIRMANTES: JSON.stringify(firmantes.map((f) => ({ fk_tfuncionario: Number(f.funcionario), fk_tlv_calidad: Number(f.calidad) }))),
      }
      try {
        await guardar.mutateAsync({ id, body: id ? body : { ...body, FK_MATRICULA: Number(matricula) } })
        queueNotice(id ? "Atención actualizada." : "Atención registrada.")
        volver()
      } catch (e) {
        avisar(e)
      }
    },
  })

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
    modalidades, origenes, motivos, entidades, calidades, firmantes, setFirmantes,
    matricula, setMatricula, setBusqueda, estudiantes, estudianteFijo, remision, setRemision, remisiones,
    notice, setNotice, form, guardando: guardar.isPending, volver,
  }
}
