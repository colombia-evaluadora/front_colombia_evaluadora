import { useEffect } from "react"

import {
  MatriculaFormSection,
  MatriculaSelectField,
  MatriculaTextField,
} from "@/features/coverage/matricula/components/forms/form-create-matricula/fields"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"

import type {
  GrupoDisponible,
  ReservaFicha,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-ficha-query"

const nada = () => {}

/** «2028 · Anual · Ciclo 1» → «Anual · Ciclo 1»: el año va en su propio campo. */
const periodoSinAnio = (ciclo: string, anio: string) =>
  anio && ciclo.startsWith(`${anio} · `) ? ciclo.slice(anio.length + 3) : ciclo

interface SeccionMatriculaReservaProps {
  reserva: ReservaFicha["reserva"]
  /** Ver detalle: todo en solo lectura. */
  soloLectura: boolean
  grupos: GrupoDisponible[]
  grupoId: string
  onGrupo: (id: string) => void
  especialidadId: string
  onEspecialidad: (id: string) => void
  grupoInvalido: boolean
}

/**
 * Bloque 1 de Asignar grupo (3.6): sede, año, jornada, período y grado salen de la reserva y no se
 * cambian; solo se elige el grupo (los del grado con cupo, Regla 30) y la especialidad.
 */
export function SeccionMatriculaReserva({
  reserva,
  soloLectura,
  grupos,
  grupoId,
  onGrupo,
  especialidadId,
  onEspecialidad,
  grupoInvalido,
}: SeccionMatriculaReservaProps) {
  const { data: especialidades = [], isSuccess } = useEspecialidadesQuery(reserva.fkTperiodoAcademico ?? undefined)
  const nombreEspecialidad = new Map(especialidades.map((e) => [String(e.id), e.label]))
  // La especialidad precargada es la de la matrícula anterior: en un traslado es de otro establecimiento
  // y el back la rechazaría. Si no está entre las del período, se deja sin elegir.
  const ajena = !soloLectura && isSuccess && Boolean(especialidadId) && !nombreEspecialidad.has(especialidadId)
  useEffect(() => {
    if (ajena) onEspecialidad("")
  }, [ajena, onEspecialidad])
  const nombreGrupo = new Map(
    grupos.map((g) => [String(g.id), `${g.nombre} · ${g.cupoLibre} ${g.cupoLibre === 1 ? "cupo" : "cupos"}`]),
  )
  const sinCupo = Object.fromEntries(grupos.filter((g) => !g.alcanza).map((g) => [String(g.id), "Sin cupo"]))

  return (
    <MatriculaFormSection title="Información de matrícula">
      <MatriculaTextField id="reserva-sede" label="Sede" value={reserva.sede} onChange={nada} disabled />
      <MatriculaTextField id="reserva-anio" label="Año" value={reserva.anio} onChange={nada} disabled />
      <MatriculaTextField id="reserva-jornada" label="Jornada" value={reserva.jornada} onChange={nada} disabled />
      <MatriculaTextField
        id="reserva-periodo"
        label="Período"
        value={periodoSinAnio(reserva.ciclo, reserva.anio)}
        onChange={nada}
        disabled
      />
      <MatriculaTextField id="reserva-grado" label="Grado" value={reserva.grado} onChange={nada} disabled />
      {soloLectura ? (
        <MatriculaTextField
          id="reserva-grupo"
          label="Grupo"
          value={reserva.grupoGenerado ?? ""}
          onChange={nada}
          disabled
          description={reserva.grupoGenerado ? undefined : "Se elige al asignar grupo."}
        />
      ) : (
        <MatriculaSelectField
          id="reserva-grupo"
          label="Grupo"
          required
          value={grupoId}
          options={grupos.map((g) => String(g.id))}
          labelFor={(id) => nombreGrupo.get(id) ?? id}
          disabledOptions={sinCupo}
          invalid={grupoInvalido}
          description="Solo grupos del grado con cupo disponible."
          onChange={onGrupo}
        />
      )}
      <MatriculaSelectField
        id="reserva-especialidad"
        label="Carácter/Especialidad/Énfasis"
        value={especialidadId}
        options={especialidades.map((e) => String(e.id))}
        labelFor={(id) => nombreEspecialidad.get(id) ?? id}
        disabled={soloLectura}
        onChange={onEspecialidad}
      />
      <MatriculaTextField id="reserva-tipo" label="Tipo de matrícula" value="Principal" onChange={nada} disabled />
    </MatriculaFormSection>
  )
}
