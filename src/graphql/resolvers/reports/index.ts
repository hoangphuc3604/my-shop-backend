import { requireAuth, requirePermission } from '../../../middleware/authorization'
import { Permission } from '../../../entities/User'
import { generateRevenueReport, getProductRevenue } from './queries'

export const reportResolvers = {
  Query: {
    generateRevenueReport: requirePermission(Permission.MANAGE_SYSTEM)(generateRevenueReport),
    getProductRevenue: requirePermission(Permission.MANAGE_SYSTEM)(getProductRevenue)
  }
}
