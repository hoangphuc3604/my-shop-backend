import { dashboardQueries } from './queries'

export const dashboardResolvers = {
  Query: {
    ...dashboardQueries
  }
}
