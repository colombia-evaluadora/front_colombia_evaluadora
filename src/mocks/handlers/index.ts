import { paymentsHandlers } from "./payments"
import { navigationHandlers } from "./navigation"
import { authHandlers } from "./auth"

export const handlers = [...authHandlers, ...paymentsHandlers, ...navigationHandlers]
