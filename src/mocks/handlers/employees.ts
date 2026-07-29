import { delay, http, HttpResponse } from "msw"

import {
  deleteEmployeeDetails,
  employeesDb,
  employeesRowsDb,
} from "../db/employees"

import type {
  Employee,
  EmployeeStatus,
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/api/types/employee"

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []
}

function parseEmployeesRequest(body: Partial<EmployeesQueryRequest> | null): EmployeesQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      roles: asArray(body?.filters?.roles),
      workSchedules: asArray(body?.filters?.workSchedules),
      statuses: asArray(body?.filters?.statuses) as EmployeeStatus[],
    },
    sorting: Array.isArray(body?.sorting)
      ? body.sorting
          .filter((sort) => typeof sort?.id === "string" && sort.id.length > 0)
          .map((sort) => ({
            id: sort.id,
            desc: Boolean(sort.desc),
          }))
      : [],
    pageIndex: Number.isNaN(pageIndex) ? 0 : pageIndex,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
  }
}

async function readEmployeesRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<EmployeesQueryRequest>
  } catch {
    return null
  }
}

function applyFilters(rows: typeof employeesRowsDb, filters: EmployeesQueryRequest["filters"]): typeof employeesRowsDb {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const campusText = row.campuses.join(" ").toLowerCase()

      const matches =
        row.documentNumber.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        campusText.includes(needle)

      if (!matches) {
        return false
      }
    }

    if (filters.roles?.length && !filters.roles.includes(row.role.code)) {
      return false
    }

    if (filters.workSchedules?.length && !filters.workSchedules.includes(row.workSchedule.code)) {
      return false
    }

    if (filters.statuses?.length && !filters.statuses.includes(row.status)) {
      return false
    }

    return true
  })
}

function sortValue(row: Employee, id: string) {
  return row[id as keyof Employee]
}

function applySorting(rows: typeof employeesRowsDb, sorting: EmployeesQueryRequest["sorting"]): typeof employeesRowsDb {
  if (!sorting.length) {
    return rows
  }

  const [{ id, desc }] = sorting

  const sorted = [...rows].sort((a, b) => {
    const av =
      id === "documentNumber"
        ? a.documentNumber
        : id === "name"
          ? a.name
          : id === "role"
            ? a.role.name
            : id === "workSchedule"
              ? a.workSchedule.name
              : id === "status"
                ? a.status
                : sortValue(a as unknown as Employee, id)
    const bv =
      id === "documentNumber"
        ? b.documentNumber
        : id === "name"
          ? b.name
          : id === "role"
            ? b.role.name
            : id === "workSchedule"
              ? b.workSchedule.name
              : id === "status"
                ? b.status
                : sortValue(b as unknown as Employee, id)

    if (av === bv) {
      return 0
    }

    return av > bv ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const employeeHandlers = [
  http.post("*/api/establishments/employees/query", async ({ request }) => {
    await delay(250)

    const body = await readEmployeesRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseEmployeesRequest(body)

    const filtered = applySorting(applyFilters(employeesRowsDb, filters), sorting)
    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<EmployeesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.delete("*/api/establishments/employees/:id", async ({ params }) => {
    await delay(250)

    const employeeId = Array.isArray(params.id) ? params.id[0] : params.id

    if (!employeeId) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Identificador de funcionario inválido.",
        },
        { status: 400 }
      )
    }

    const employee = employeesDb.find((item) => item.id === employeeId)

    if (!employee) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Funcionario no encontrado.",
        },
        { status: 404 }
      )
    }

    deleteEmployeeDetails(employee.id)

    return HttpResponse.json({
      status: "ok",
      message: "Funcionario eliminado.",
    })
  }),
]