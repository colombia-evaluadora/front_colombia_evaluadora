import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

/**
 * Sede como la usan otros features (permisos de funcionarios, selects):
 * sale de `fn_sed_listar_todos` (`/establecimientos/sedes/opciones`).
 */
export interface Campus {
  id: number
  name: string
  dane: string
  zone: CatalogItem | null
  neighborhood: string
  commune: string
  address: string
  phone: string
}

/** Activo / Inactivo (`TSEDE.ESTADO`, sso V445.1). Inactivar no borra: la sede deja de recibir registros nuevos. */
export type CampusStatus = "A" | "I"

/** Fila del listado (`fn_sed_listar`, sso V448). */
export interface CampusRow {
  id: number
  consecutive: string
  /** Consecutivo 1: la crea el sistema con el establecimiento y va primero. */
  isPrincipal: boolean
  name: string
  dane: string
  establishmentId: number
  establishmentName: string
  zoneName: string
  /** Nombres de las jornadas de la sede, separados por coma. */
  workSchedules: string
  status: CampusStatus
}

export interface CampusWorkSchedule {
  id: number
  name: string
}

/** Detalle de una sede (`fn_sed_detalle`): lo editable más lo calculado. */
export interface CampusDetail {
  id: number
  establishmentId: number
  establishmentName: string
  consecutive: string
  isPrincipal: boolean
  name: string
  dane: string
  zoneId: number | null
  zoneName: string
  /** En la principal, la zona viene del establecimiento si este es de una sola zona. */
  zoneSynced: boolean
  neighborhood: string
  commune: string
  address: string
  phone: string
  workSchedules: CampusWorkSchedule[]
  status: CampusStatus
  attendsDisability: boolean
  attendsConflictVictims: boolean
}

/** Valores del formulario de la sede (crear y editar). */
export interface CampusFormValues {
  establishmentId: number | null
  consecutive: string
  name: string
  dane: string
  zoneId: number | null
  neighborhood: string
  commune: string
  address: string
  phone: string
  workScheduleIds: number[]
}

/** Opción liviana para el selector de establecimiento. */
export interface EstablishmentOption {
  id: number
  name: string
}

export interface CampusesQueryFilters {
  /** Nombre o código DANE antiguo. */
  search?: string
  /** PK de los establecimientos. */
  establishments?: number[]
  /** `VALOR` de la lista ZONA. */
  zones?: string[]
  /** `VALOR` de la lista JORNADA. */
  workSchedules?: string[]
  statuses?: CampusStatus[]
}

export interface CampusesQueryRequest {
  filters: CampusesQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface CampusesQueryResponse {
  rows: CampusRow[]
  pageCount: number
  totalCount: number
}

/** Especialidad de la lista general (`TESPECIALIDAD`) con su carácter. */
export interface SpecialtyCatalogItem {
  id: number
  name: string
  characterId: number
  characterName: string
  /** "Otra": la única que lleva nombre propio y puede repetirse. */
  isOther: boolean
}

/** Ítem del catálogo de especialidades de una sede (`TSEDE_ESPECIALIDAD`). */
export interface CampusSpecialty {
  id: number
  characterId: number
  characterName: string
  specialtyId: number
  specialtyName: string
  ownName: string | null
  isOther: boolean
  status: CampusStatus
}

export interface CampusSpecialtyValues {
  characterId: number | null
  specialtyId: number | null
  ownName: string
  status: CampusStatus
}
