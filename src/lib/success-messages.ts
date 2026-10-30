// Mensajes de éxito centralizados; los errores sí usan el `message` del backend.
interface EntityMessages {
  created: string
  updated: string
  deleted: string
  /** Borrado múltiple desde la barra de herramientas de la tabla. */
  deletedMany?: (count: number) => string
  /** Acción puntual que no encaja en created/updated/deleted. */
  deactivated?: string
  /** Reactivar lo que se inactivó (listas de valor). */
  activated?: string
  /** Aprobar o declinar (p. ej. Coordinador en el Planeador). */
  approved?: string
  declined?: string
}

export const SUCCESS_MESSAGES = {
  academicCalendar: {
    created: "Entrada agregada al calendario.",
    updated: "La entrada del calendario se actualizó correctamente.",
    deleted: "La entrada del calendario se eliminó correctamente.",
  },
  listaValorCategoria: {
    created: "La lista se creó correctamente.",
    updated: "La lista se actualizó correctamente.",
    deleted: "La lista se eliminó correctamente.",
    activated: "La lista se activó correctamente.",
    deactivated: "La lista se inactivó correctamente.",
  },
  // Textos del requerimiento: guardar (crear o modificar) dice lo mismo.
  areaOficial: {
    created: "Área oficial guardada.",
    updated: "Área oficial guardada.",
    deleted: "Área oficial eliminada.",
    activated: "Área oficial activada.",
    deactivated: "Área oficial inactivada.",
  },
  // "Criterio guardado." es el texto del requerimiento (Sección 5).
  criterioPrioridad: {
    created: "Criterio guardado.",
    updated: "Criterio guardado.",
    deleted: "Criterio eliminado.",
    activated: "Criterio activado.",
    deactivated: "Criterio desactivado.",
  },
  listaValor: {
    created: "El valor se creó correctamente.",
    updated: "El valor se actualizó correctamente.",
    deleted: "El valor se eliminó correctamente.",
    activated: "El valor se activó correctamente.",
    deactivated: "El valor se inactivó correctamente.",
  },
  establishment: {
    created: "El establecimiento educativo se creó correctamente.",
    updated: "El establecimiento educativo se actualizó correctamente.",
    deleted: "El establecimiento educativo se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El establecimiento educativo se eliminó correctamente."
        : `Los ${count} establecimientos educativos se eliminaron correctamente.`,
  },
  campus: {
    created: "La sede educativa se creó correctamente.",
    updated: "La sede educativa se actualizó correctamente.",
    deleted: "La sede educativa se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "La sede educativa se eliminó correctamente."
        : `Las ${count} sedes educativas se eliminaron correctamente.`,
    activated: "La sede educativa se activó correctamente.",
    deactivated: "La sede educativa se inactivó correctamente.",
  },
  campusSpecialty: {
    created: "La especialidad se agregó al catálogo de la sede.",
    updated: "La especialidad se actualizó correctamente.",
    deleted: "La especialidad se eliminó del catálogo de la sede.",
  },
  employee: {
    created: "El funcionario se creó correctamente.",
    updated: "El funcionario se actualizó correctamente.",
    deleted: "El funcionario se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El funcionario se eliminó correctamente."
        : `Los ${count} funcionarios se eliminaron correctamente.`,
  },
  academicPeriod: {
    created: "El periodo académico se creó correctamente.",
    updated: "El periodo académico se actualizó correctamente.",
    deleted: "El periodo académico se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El periodo académico se eliminó correctamente."
        : `Los ${count} periodos académicos se eliminaron correctamente.`,
    // Toggle de la reserva de cupos, separado de `updated`.
    activated: "El periodo de reserva de cupos se activó correctamente.",
    deactivated: "El periodo de reserva de cupos se desactivó correctamente.",
  },
  evaluationPeriod: {
    created: "El periodo de evaluación se creó correctamente.",
    updated: "El periodo de evaluación se actualizó correctamente.",
    deleted: "El periodo de evaluación se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El periodo de evaluación se eliminó correctamente."
        : `Los ${count} periodos de evaluación se eliminaron correctamente.`,
  },
  grade: {
    created: "El grado se creó correctamente.",
    updated: "El grado se actualizó correctamente.",
    deleted: "El grado se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El grado se eliminó correctamente."
        : `Los ${count} grados se eliminaron correctamente.`,
  },
  gradeGroup: {
    created: "El grupo de grados se creó correctamente.",
    updated: "El grupo de grados se actualizó correctamente.",
    deleted: "El grupo de grados se eliminó correctamente.",
  },
  ratingScale: {
    created: "La escala de valoración se creó correctamente.",
    updated: "La escala de valoración se actualizó correctamente.",
    deleted: "La escala de valoración se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "La escala de valoración se eliminó correctamente."
        : `Las ${count} escalas de valoración se eliminaron correctamente.`,
  },
  studyPlan: {
    created: "El plan de estudio se creó correctamente.",
    updated: "El plan de estudio se actualizó correctamente.",
    deleted: "El plan de estudio se eliminó correctamente.",
  },
  areaSubject: {
    created: "El área o asignatura se creó correctamente.",
    updated: "El área o asignatura se actualizó correctamente.",
    deleted: "El área o asignatura se eliminó correctamente.",
    deletedMany: (count) =>
      count === 1
        ? "El área o asignatura se eliminó correctamente."
        : `Las ${count} áreas o asignaturas se eliminaron correctamente.`,
  },
  academicAssignment: {
    created: "La asignación académica se creó correctamente.",
    updated: "La asignación académica se actualizó correctamente.",
    deleted: "La asignación académica se eliminó correctamente.",
    activated: "La asignación académica se activó.",
    deactivated: "La asignación académica se inactivó.",
  },
  evaluationCriteria: {
    created: "Los criterios de evaluación se guardaron correctamente.",
    updated: "Los criterios de evaluación se guardaron correctamente.",
    deleted: "Los criterios de evaluación se eliminaron correctamente.",
  },
  criterioUnidad: {
    created: "El criterio se agregó correctamente.",
    updated: "El criterio se actualizó correctamente.",
    deleted: "El criterio se eliminó correctamente.",
  },
  promotionCriteria: {
    created: "Los criterios de promoción se guardaron correctamente.",
    updated: "Los criterios de promoción se guardaron correctamente.",
    deleted: "Los criterios de promoción se eliminaron correctamente.",
  },
  schedule: {
    created: "El horario se guardó correctamente.",
    updated: "El horario se guardó correctamente.",
    deleted: "El horario se eliminó correctamente.",
  },
  enrollment: {
    created: "La inscripción se registró correctamente.",
    updated: "La inscripción se actualizó correctamente.",
    deleted: "La inscripción se eliminó correctamente.",
  },
  matricula: {
    created: "La matrícula se registró correctamente.",
    updated: "La matrícula se actualizó correctamente.",
    deleted: "El estudiante se eliminó correctamente.",
  },
  // Un Superadministrador no se elimina (Regla 9): `deleted` no se usa.
  superadministrador: {
    created: "Superadministrador creado.",
    updated: "Superadministrador guardado.",
    deleted: "Superadministrador eliminado.",
    activated: "Superadministrador activado.",
    deactivated: "Superadministrador inactivado. Perdió el acceso y se cerraron sus sesiones.",
  },
  actividad: {
    created: "La actividad se creó correctamente.",
    updated: "La actividad se actualizó correctamente.",
    deleted: "La actividad se eliminó correctamente.",
    approved: "La actividad se aprobó correctamente.",
    declined: "La actividad se declinó correctamente.",
  },
} satisfies Record<string, EntityMessages>

// Alta de funcionario: `mensajeInvitacion` = la invitación falló (warning);
// `invitacionEnviada` = se mandó el correo; ninguno = se reusó una cuenta activa.
export function employeeInvitationNotice(result: {
  invitacionEnviada?: boolean | null
  mensajeInvitacion?: string | null
  email?: string | null
}): { message: string; variant: "success" | "warning" } {
  if (result.mensajeInvitacion != null) {
    return { message: `Funcionario creado. ${result.mensajeInvitacion}`, variant: "warning" }
  }
  if (result.invitacionEnviada) {
    return {
      message: `Funcionario creado. Se envió el correo de activación a ${result.email ?? ""}.`,
      variant: "success",
    }
  }
  return { message: "Funcionario creado.", variant: "success" }
}

// Guardar un Superadministrador: el texto del requerimiento ("Superadministrador
// creado. Se envió el enlace a [correo].") y sus variantes sin enlace o con falla.
export function superadministradorSaveNotice(
  result: {
    enlaceEnviadoA: string | null
    cuentaExistente: boolean
    enlaceFallido: string | null
  },
  creado: boolean,
): { message: string; variant: "success" | "warning" } {
  const base = creado ? SUCCESS_MESSAGES.superadministrador.created : SUCCESS_MESSAGES.superadministrador.updated
  if (result.enlaceFallido != null) {
    return { message: `${base} No se pudo enviar el enlace: ${result.enlaceFallido}`, variant: "warning" }
  }
  if (result.enlaceEnviadoA) {
    return { message: `${base} Se envió el enlace a ${result.enlaceEnviadoA}.`, variant: "success" }
  }
  if (creado && result.cuentaExistente) {
    return { message: `${base} Ya tenía una cuenta activa: entra con su contraseña actual.`, variant: "success" }
  }
  return { message: base, variant: "success" }
}
