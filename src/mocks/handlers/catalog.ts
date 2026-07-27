import { http, HttpResponse } from "msw"
import { DOCUMENT_TYPES } from "../db/catalogs/document-types"
import { EMPLOYEE_ROLES } from "../db/catalogs/employee-roles"
import { GENDERS } from "../db/catalogs/genders"
import { MUNICIPALITIES } from "../db/catalogs/municipalities"
import { EDUCATION_LEVELS } from "../db/catalogs/education-levels"
import { WORK_SCHEDULES } from "../db/catalogs/work-schedules"
import {
  CALENDARIOS,
  COST_REGIMEN,
  RANGO_TARIFAS,
  IDIOMAS,
  LEGAL_TYPES,
  ZONES,
  DISABILITIES,
  LICENSE_STATUSES,
} from "../db/catalogs/establishment"

export const catalogHandlers = [
  http.get("/api/catalogs/document-types", () => {
    return HttpResponse.json(DOCUMENT_TYPES)
  }),

  http.get("/api/catalogs/employee-roles", () => {
    return HttpResponse.json(EMPLOYEE_ROLES)
  }),

  http.get("/api/catalogs/genders", () => {
    return HttpResponse.json(GENDERS)
  }),

  http.get("/api/catalogs/municipalities", () => {
    return HttpResponse.json(MUNICIPALITIES)
  }),

  http.get("/api/catalogs/education-levels", () => {
    return HttpResponse.json(EDUCATION_LEVELS)
  }),

  http.get("/api/catalogs/work-schedules", () => {
    return HttpResponse.json(WORK_SCHEDULES)
  }),

  http.get("/api/catalogs/calendarios", () => {
    return HttpResponse.json(CALENDARIOS)
  }),

  http.get("/api/catalogs/cost-regimen", () => {
    return HttpResponse.json(COST_REGIMEN)
  }),

  http.get("/api/catalogs/rango-tarifas", () => {
    return HttpResponse.json(RANGO_TARIFAS)
  }),

  http.get("/api/catalogs/idiomas", () => {
    return HttpResponse.json(IDIOMAS)
  }),

  http.get("/api/catalogs/legal-types", () => {
    return HttpResponse.json(LEGAL_TYPES)
  }),

  http.get("/api/catalogs/zones", () => {
    return HttpResponse.json(ZONES)
  }),

  http.get("/api/catalogs/disabilities", () => {
    return HttpResponse.json(DISABILITIES)
  }),

  http.get("/api/catalogs/license-statuses", () => {
    return HttpResponse.json(LICENSE_STATUSES)
  }),
]