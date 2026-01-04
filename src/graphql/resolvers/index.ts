import { optionalAuth } from '../../middleware/authorization'
import { authResolvers } from './auth'
import { userResolvers } from './user'
import { categoryResolvers } from './category'
import { productResolvers } from './product'
import { orderResolvers } from './order'
import { dashboardResolvers } from './dashboard'

export const resolvers = {
  Query: {
    hello: optionalAuth()(() => 'Hello, World!'),
    ...authResolvers.Query,
    ...userResolvers.Query,
    ...categoryResolvers.Query,
    ...productResolvers.Query,
    ...orderResolvers.Query,
    ...dashboardResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...productResolvers.Mutation,
    ...orderResolvers.Mutation,
    ...categoryResolvers.Mutation
  },
  // Type resolvers
  Order: {
    ...orderResolvers.Order
  }
}
