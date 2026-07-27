import { http, HttpResponse } from "msw"
import { CATALOGS } from "@/lib/catalogs"
import { DOCUMENT_TYPES } from "../db/catalogs/document-types"
import { EMPLOYEE_ROLES } from "../db/catalogs/employee-roles"
import { GENDERS } from "../db/catalogs/genders"
import { MUNICIPALITIES } from "../db/catalogs/municipalities"
import { EDUCATION_LEVELS } from "../db/catalogs/education-levels"
import { WORK_SCHEDULES } from "../db/catalogs/work-schedules"
import {
  CALENDARS,
  COST_REGIMEN,
  RANGO_TARIFAS,
  IDIOMAS,
  LEGAL_TYPES,
  ZONES,
  DISABILITIES,
  LICENSE_STATUSES,
} from "../db/catalogs/establishment"

export const catalogHandlers = [
  http.get(`/api/catalogs/${CATALOGS.DOCUMENT_TYPES}`, () => {
    return HttpResponse.json(DOCUMENT_TYPES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EMPLOYEE_ROLES}`, () => {
    return HttpResponse.json(EMPLOYEE_ROLES)
  }),

  http.get(`/api/catalogs/${CATALOGS.GENDERS}`, () => {
    return HttpResponse.json(GENDERS)
  }),

  http.get(`/api/catalogs/${CATALOGS.MUNICIPALITIES}`, () => {
    return HttpResponse.json(MUNICIPALITIES)
  }),

  http.get(`/api/catalogs/${CATALOGS.EDUCATION_LEVELS}`, () => {
    return HttpResponse.json(EDUCATION_LEVELS)
  }),

  http.get(`/api/catalogs/${CATALOGS.WORK_SCHEDULES}`, () => {
    return HttpResponse.json(WORK_SCHEDULES)
  }),

  http.get(`/api/catalogs/${CATALOGS.CALENDARIOS}`, () => {
    return HttpResponse.json(CALENDARS)
  }),

  http.get(`/api/catalogs/${CATALOGS.COST_REGIMEN}`, () => {
    return HttpResponse.json(COST_REGIMEN)
  }),

  http.get(`/api/catalogs/${CATALOGS.RANGO_TARIFAS}`, () => {
    return HttpResponse.json(RANGO_TARIFAS)
  }),

  http.get(`/api/catalogs/${CATALOGS.IDIOMAS}`, () => {
    return HttpResponse.json(IDIOMAS)
  }),

  http.get(`/api/catalogs/${CATALOGS.LEGAL_TYPES}`, () => {
    return HttpResponse.json(LEGAL_TYPES)
  }),

  http.get(`/api/catalogs/${CATALOGS.ZONES}`, () => {
    return HttpResponse.json(ZONES)
  }),

  http.get(`/api/catalogs/${CATALOGS.DISABILITIES}`, () => {
    return HttpResponse.json(DISABILITIES)
  }),

  http.get(`/api/catalogs/${CATALOGS.LICENSE_STATUSES}`, () => {
    return HttpResponse.json(LICENSE_STATUSES)
  }),
]