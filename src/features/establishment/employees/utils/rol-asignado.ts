import { addDays, startOfDay } from "date-fns"

import type { RolAsignado } from "@/features/establishment/employees/api/types/rol-asignado"

/** `yyyy-MM-dd` → `dd/MM/yyyy`; vacío queda vacío. */
export const fechaCorta = (value: string | null | undefined) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "")

/** "Sede · Jornada", como lo muestran los textos de la Sección 4.2. */
export const sedeJornada = (rol: Pick<RolAsignado, "campusName" | "workScheduleName">) =>
  `${rol.campusName} · ${rol.workScheduleName}`

/** Vigente hasta debe ser posterior a hoy (Regla 94): el primer día que se puede elegir. */
export const primerDiaVigente = () => addDays(startOfDay(new Date()), 1)

/** Desde cuántos días antes la columna Marca avisa "Vence en N días". */
export const DIAS_AVISO_VENCIMIENTO = 30

/** Roles que no se asignan desde Roles y permisos (Reglas 18 y 83). */
export const ROLES_NO_ASIGNABLES = ["RECTOR", "DIRECTOR_GRUPO"]
