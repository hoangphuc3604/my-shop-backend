import { userQueries } from './queries'

export const userResolvers = {
  Query: {
    ...userQueries
  }
}

