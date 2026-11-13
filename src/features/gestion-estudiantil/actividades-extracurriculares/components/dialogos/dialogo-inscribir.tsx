import { useEffect, useMemo, useState } from "react"

import { DatePicker } from "@/components/date-picker"
import { useNotify } from "@/components/notice/notice-context"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { PersonAddIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useInscribirEstudiante } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/mutations/actividades"
import { useCandidatosQuery } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/query/use-actividades-query"
import type { CandidatoRow } from "@/features/gestion-estudiantil/actividades-extracurriculares/api/types"
import { avisarExito } from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/avisos"
import {
  dateAFechaIso,
  fechaIsoADate,
  hoySiEnRango,
} from "@/features/gestion-estudiantil/actividades-extracurriculares/utils/formatos-actividad"

const ESPERA_MS = 300
const etiqueta = (c: CandidatoRow) => `${c.estudiante_nombre} · ${c.grado_grupo}`

interface Props {
  actividad: { id: number; nombre: string; fecha_inicio: string; fecha_fin: string }
  onClose: () => void
}

/** Inscribir estudiante (G.5.ACT.LIS.1): Estudiante (candidatos con búsqueda) y Fecha de inscripción (hoy si está en rango). */
export function DialogoInscribir({ actividad: a, onClose }: Props) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  const inicio = fechaIsoADate(a.fecha_inicio)
  const fin = fechaIsoADate(a.fecha_fin)

  const [matricula, setMatricula] = useState("")
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [elegidas, setElegidas] = useState<Record<string, CandidatoRow>>({})
  const [fecha, setFecha] = useState<Date | undefined>(() => hoySiEnRango(inicio, fin))

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])

  const candidatos = useCandidatosQuery(a.id, busqueda).data
  const opciones = useMemo<Opcion[]>(() => {
    const mapa = new Map<string, CandidatoRow>()
    for (const c of candidatos ?? []) mapa.set(String(c.id), c)
    for (const [k, c] of Object.entries(elegidas)) if (!mapa.has(k)) mapa.set(k, c)
    return [...mapa.entries()].map(([value, c]) => ({ value, label: etiqueta(c) }))
  }, [candidatos, elegidas])

  const elegir = (v: string) => {
    const c = candidatos?.find((x) => String(x.id) === v)
    if (c) setElegidas((e) => ({ ...e, [v]: c }))
    setMatricula(v)
  }

  const errores: { matricula?: string; fecha?: string } = {}
  if (!matricula) errores.matricula = "El estudiante es obligatorio."
  if (!fecha) errores.fecha = "La fecha de inscripción es obligatoria."
  const error = (c: keyof typeof errores) => (s.intento ? errores[c] : undefined)

  const mut = useInscribirEstudiante({
    mutationConfig: {
      onSuccess: () => {
        avisarExito(notify, "Estudiante inscrito.")
        onClose()
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const guardar = () => {
    s.setIntento(true)
    s.setError(null)
    if (Object.keys(errores).length > 0) {
      enfocarPrimerError()
      return
    }
    mut.mutate({ id: a.id, FK_MATRICULA: Number(matricula), FECHA_INSCRIPCION: dateAFechaIso(fecha!) })
  }

  return (
    <DialogoOperacionShell
      titulo={`Inscribir estudiante — ${a.nombre}`}
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      confirmar={{ label: "Inscribir", icon: <PersonAddIcon data-icon="inline-start" />, onClick: guardar }}
    >
      <ComboOpciones
        id="inscribir-estudiante"
        label="Estudiante"
        required
        size="default"
        todos={false}
        placeholder="Buscar estudiante"
        value={matricula}
        options={opciones}
        error={error("matricula")}
        onInputChange={setTexto}
        onChange={elegir}
      />
      <Field orientation="vertical" variant="outlined" className="gap-2" data-invalid={Boolean(error("fecha")) || undefined}>
        <FieldLabel htmlFor="inscribir-fecha">Fecha de inscripción*</FieldLabel>
        <DatePicker
          id="inscribir-fecha"
          value={fecha}
          minDate={inicio}
          maxDate={fin}
          aria-invalid={Boolean(error("fecha")) || undefined}
          onChange={setFecha}
        />
        {error("fecha") && <FieldError>{error("fecha")}</FieldError>}
      </Field>
    </DialogoOperacionShell>
  )
}
