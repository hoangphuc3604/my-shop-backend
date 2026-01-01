import 'reflect-metadata'
import 'dotenv/config'
import { ApolloServer } from 'apollo-server'
import { typeDefs, resolvers } from './graphql'
import { logger } from './config/logger'
import { AppDataSource } from './config/database'
import { DatabaseSeeder } from './utils/seeder'
import { AuthService } from './utils/auth/auth'
import { User } from './entities/User'
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core'
import { formatError } from './utils/errors/ErrorFormatter'

const PORT = process.env.PORT || 4000

const requestLoggerPlugin = {
  async requestDidStart(requestContext: any) {
    const { request, context } = requestContext
    const operationName = request.operationName || 'Anonymous'
    const user = context.user ? context.user.username : 'Anonymous'

    logger.info(`GraphQL Request: ${operationName} by ${user}`)

    return {
      async willSendResponse(requestContext: any) {
        const { response, errors } = requestContext
        if (errors) {
          logger.error(`GraphQL Errors in ${operationName}:`, errors)
        } else {
          logger.info(`GraphQL Response: ${operationName} completed successfully`)
        }
      }
    }
  }
}

const getUserFromToken = async (token: string) => {
  try {
    const payload = AuthService.verifyToken(token)
    if (!payload || !payload.userId) {
      return null
    }

    const userRepository = AppDataSource.getRepository(User)
    const user = await userRepository.findOne({
      where: { userId: payload.userId }
    })

    return user || null
  } catch (error) {
    return null
  }
}

async function startServer() {
  try {
    await AppDataSource.initialize()
    logger.info('Database connection established')

    const seeder = new DatabaseSeeder()
    await seeder.seed()
    logger.info('Database seeded successfully')

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: true,
      persistedQueries: false,
      formatError,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault(),
        requestLoggerPlugin
      ],
      context: async ({ req }) => {
        const token = req.headers.authorization?.replace('Bearer ', '') || ''
        const user = token ? await getUserFromToken(token) : null

        return {
          logger,
          user
        }
      }
    })

    const { url } = await server.listen(PORT)
    logger.info(`Server ready at ${url}`)

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`)

      try {
        await server.stop()
        logger.info('Apollo Server stopped')

        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy()
          logger.info('Database connection closed')
        }

        logger.info('Graceful shutdown completed')
        process.exit(0)
      } catch (error) {
        logger.error('Error during graceful shutdown', error)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error)
      gracefulShutdown('uncaughtException')
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
      gracefulShutdown('unhandledRejection')
    })

  } catch (error) {
    logger.error('Failed to start server', error)
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy()
    }
    process.exit(1)
  }
}

startServer().catch((error) => {
  logger.error('Failed to start server', error)
  process.exit(1)
})
