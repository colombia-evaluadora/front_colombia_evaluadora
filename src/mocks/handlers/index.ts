import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { establishmentHandlers } from "./establishments"
import { campusHandlers } from "./campuses"
import { employeeHandlers } from "./employees"
import { catalogHandlers } from "./catalog"
import { reservationsHandlers } from "./reservations"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...reservationsHandlers,
  ...establishmentHandlers,
  ...campusHandlers,
  ...employeeHandlers,
  ...catalogHandlers
]
