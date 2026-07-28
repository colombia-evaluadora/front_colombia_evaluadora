import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"
import { auditsHandlers } from "./audits"
import { auditTablesHandlers } from "./audit-tables"
import { establishmentHandlers } from "./establishments"
import { campusHandlers } from "./campuses"
import { catalogHandlers } from "./catalog"

export const handlers = [
  ...authHandlers,
  ...paymentsHandlers,
  ...navigationHandlers,
  ...auditsHandlers,
  ...auditTablesHandlers,
  ...establishmentHandlers,
  ...campusHandlers,
  ...catalogHandlers
]
