import { delay, http, HttpResponse } from "msw"

import {
  deleteEmployeeDetails,
  deleteManyEmployeeDetails,
  employeesDb,
  employeesRowsDb,
  upsertEmployeeDetails,
} from "../db/employees"
import { upsertPerson } from "../db/persons"

import type {
  Employee,
  EmployeeStatus,
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/api/types/employee"
import type { Person } from "@/features/establishment/api/types/person"

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
      const roleText = row.roles.map((role) => role.name).join(" ").toLowerCase()

      const matches =
        row.documentNumber.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        campusText.includes(needle) ||
        roleText.includes(needle)

      if (!matches) {
        return false
      }
    }

    if (
      filters.roles?.length &&
      !row.roles.some((role) => filters.roles!.includes(role.code))
    ) {
      return false
    }

    if (filters.workSchedules?.length && !filters.workSchedules.includes(row.workSchedule.code)) {
      return false
    }

    if (
      filters.statuses?.length &&
      !row.statuses.some((status) => filters.statuses!.includes(status))
    ) {
      return false
    }

    return true
  })
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
            ? a.roles[0]?.name ?? ""
            : id === "workSchedule"
              ? a.workSchedule.name
              : id === "status"
                ? a.statuses[0] ?? ""
                : ""
    const bv =
      id === "documentNumber"
        ? b.documentNumber
        : id === "name"
          ? b.name
          : id === "role"
            ? b.roles[0]?.name ?? ""
            : id === "workSchedule"
              ? b.workSchedule.name
              : id === "status"
                ? b.statuses[0] ?? ""
                : ""

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

  http.post("*/api/establishments/employees/person", async ({ request }) => {
    await delay(250)

    const values = (await request.json()) as Person
    const person = upsertPerson(values)

    return HttpResponse.json({
      status: "ok",
      message: "Usuario guardado.",
      person,
    })
  }),

  http.get("*/api/establishments/employees/:id", async ({ params }) => {
    await delay(150)

    const employee = employeesDb.find((item) => item.id === params.id)

    if (!employee) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Funcionario no encontrado.",
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      status: "ok",
      employee,
    })
  }),

  http.post("*/api/establishments/employees", async ({ request }) => {
    await delay(250)

    const values = (await request.json()) as Employee
    const employee: Employee = {
      ...values,
      id: values.id || `employee-${Date.now()}`,
    }

    const savedEmployee = upsertEmployeeDetails(employee)

    return HttpResponse.json({
      status: "ok",
      message: "Funcionario creado.",
      employee: savedEmployee,
    })
  }),

  http.put("*/api/establishments/employees/:id", async ({ params, request }) => {
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

    const existing = employeesDb.find((item) => item.id === employeeId)

    if (!existing) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Funcionario no encontrado.",
        },
        { status: 404 }
      )
    }

    const values = (await request.json()) as Employee
    const employee: Employee = {
      ...values,
      id: employeeId,
    }

    const savedEmployee = upsertEmployeeDetails(employee)

    return HttpResponse.json({
      status: "ok",
      message: "Funcionario actualizado.",
      employee: savedEmployee,
    })
  }),

  http.delete("*/api/establishments/employees/bulk-delete", async ({ request }) => {
    await delay(250)

    let ids: unknown
    try {
      ids = await request.json()
    } catch {
      return HttpResponse.json(
        {
          status: "error",
          message: "Cuerpo inválido. Se esperaba una lista de identificadores.",
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Se esperaba una lista de identificadores (strings).",
        },
        { status: 400 },
      )
    }

    const uniqueIds = Array.from(new Set(ids.filter((id) => id.length > 0)))
    deleteManyEmployeeDetails(uniqueIds)

    return HttpResponse.json({
      status: "ok",
      message: `${uniqueIds.length} funcionario(s) eliminado(s).`,
      deletedCount: uniqueIds.length,
    })
  }),

  http.delete("*/api/establishments/employees/:id", async ({ params }) => {
    await delay(250)

    const id = Array.isArray(params.id) ? params.id[0] : params.id

    if (!id || id === "bulk-delete") {
      return HttpResponse.json(
        {
          status: "error",
          message: "Funcionario no encontrado.",
        },
        { status: 404 }
      )
    }

    const employee = employeesDb.find((item) => item.id === id)

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