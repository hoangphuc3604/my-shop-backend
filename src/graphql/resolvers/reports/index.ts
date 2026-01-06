import { requireAuth } from '../../../middleware/authorization'
import { generateRevenueReport, getProductRevenue } from './queries'

export const reportResolvers = {
  Query: {
    generateRevenueReport: requireAuth()(generateRevenueReport),
    getProductRevenue: requireAuth()(getProductRevenue)
  }
}
