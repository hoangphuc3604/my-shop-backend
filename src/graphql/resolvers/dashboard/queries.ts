import { AppDataSource } from '../../../config/database'
import { Product } from '../../../entities/Product'
import { Order } from '../../../entities/Order'
import { OrderItem } from '../../../entities/OrderItem'
import { Permission } from '../../../entities/User'
import { requirePermission } from '../../../middleware/authorization'
import { logger } from '../../../config/logger'
import { formatToGMT7ISO, formatDateToYYYYMMDDGMT7, getUtcRangeForLocalDay, getUtcRangeForLocalMonth } from '../../../utils/timezone'
interface DashboardStats {
  totalProducts: number
  lowStockProducts: Array<{
    productId: number
    sku: string
    name: string
    count: number
    importPrice: number | null
  }>
  topSellingProducts: Array<{
    productId: number
    sku: string
    name: string
    totalSold: number
  }>
  todayOrdersCount: number
  todayRevenue: number
  recentOrders: Array<{
    orderId: number
    createdTime: string
    finalPrice: number
    status: string
    user: {
      username: string
    }
    orderItems: Array<{
      quantity: number
      unitSalePrice: number
      totalPrice: number
      product: {
        name: string
        sku: string
      }
    }>
  }>
  monthlyRevenueChart: Array<{
    date: string
    revenue: number
  }>
}

export const dashboardQueries = {
  dashboardStats: requirePermission(Permission.READ_PRODUCTS)(async (_: any, args: any, context: any): Promise<DashboardStats> => {
    logger.info(`Fetching dashboard stats for user: ${context.user.username}`)

    try {
      const productRepository = AppDataSource.getRepository(Product)
      const totalProducts = await productRepository.count()

      const lowStockProducts = await productRepository
        .createQueryBuilder('product')
        .select([
          'product.productId',
          'product.sku',
          'product.name',
          'product.count',
          'product.importPrice'
        ])
        .where('product.count < :threshold', { threshold: 5 })
        .orderBy('product.count', 'ASC')
        .limit(5)
        .getRawAndEntities()
        .then(result => result.entities.map(product => ({
          productId: product.productId,
          sku: product.sku,
          name: product.name,
          count: product.count,
          importPrice: context.user.role === 'ADMIN' ? product.importPrice : null
        })))

      const topSellingProductsQuery = productRepository
        .createQueryBuilder('product')
        .select([
          'product.productId',
          'product.sku',
          'product.name',
          'SUM(orderItem.quantity) as totalSold'
        ])
        .innerJoin('product.orderItems', 'orderItem')
        .innerJoin('orderItem.order', 'order')
        .where('order.status = :status', { status: 'Paid' })
        .groupBy('product.productId')
        .addGroupBy('product.sku')
        .addGroupBy('product.name')
        .orderBy('totalSold', 'DESC')
        .limit(5)

      const topSellingProductsRaw = await topSellingProductsQuery.getRawAndEntities()

      logger.info(`Top selling products raw results: ${JSON.stringify(topSellingProductsRaw.raw)}`)
      logger.info(`Top selling products entities count: ${topSellingProductsRaw.entities.length}`)

      const topSellingProducts = topSellingProductsRaw.raw.map((raw: any, index: number) => {
        const product = topSellingProductsRaw.entities[index]
        const totalSoldKey = Object.keys(raw).find(k => /total/i.test(k)) || 'totalSold'
        return {
          productId: product?.productId || 0,
          sku: product?.sku || '',
          name: product?.name || '',
          totalSold: parseInt(raw[totalSoldKey]) || 0
        }
      })

      const orderRepository = AppDataSource.getRepository(Order)
      const { startUtc, endUtc } = getUtcRangeForLocalDay()

      const todayStats = await orderRepository
        .createQueryBuilder('order')
        .select([
          'COUNT(order.orderId) as ordersCount',
          'SUM(order.finalPrice) as totalRevenue'
        ])
        .where('order.createdTime >= :startUtc AND order.createdTime < :endUtc', { startUtc, endUtc })
        .getRawOne()

      const ordersCountKey = Object.keys(todayStats || {}).find(k => /count/i.test(k)) || 'ordersCount'
      const revenueKey = Object.keys(todayStats || {}).find(k => /(sum|revenue|total)/i.test(k)) || 'totalRevenue'

      const todayOrdersCount = parseInt(todayStats?.[ordersCountKey]) || 0
      const todayRevenue = parseInt(todayStats?.[revenueKey]) || 0

      const recentOrders = await orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.user', 'user')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .leftJoinAndSelect('orderItems.product', 'product')
        .select([
          'order.orderId',
          'order.createdTime',
          'order.finalPrice',
          'order.status',
          'user.username',
          'orderItems.orderItemId',
          'orderItems.quantity',
          'orderItems.unitSalePrice',
          'orderItems.totalPrice',
          'product.name',
          'product.sku'
        ])
        .orderBy('order.createdTime', 'DESC')
        .limit(3)
        .getMany()

      const nowGMT7 = new Date(Date.now() + 7 * 60 * 60 * 1000)
      const currentMonth = nowGMT7.getMonth() + 1
      const currentYear = nowGMT7.getFullYear()

      logger.info(`Current month calculation - nowGMT7: ${nowGMT7.toISOString()}, currentMonth: ${currentMonth}, currentYear: ${currentYear}`)

      const { startMonthUtc, endMonthUtc } = getUtcRangeForLocalMonth(currentYear, currentMonth)

      logger.info(`UTC range for month - startMonthUtc: ${startMonthUtc.toISOString()}, endMonthUtc: ${endMonthUtc.toISOString()}`)

      const rawMonthlyData = await orderRepository
        .createQueryBuilder('order')
        .select([
          'DATE((order.createdTime AT TIME ZONE \'UTC\') + INTERVAL \'7 hours\') as date',
          'SUM(order.finalPrice) as revenue'
        ])
        .where('order.createdTime >= :startMonthUtc AND order.createdTime < :endMonthUtc', { startMonthUtc, endMonthUtc })
        .groupBy('DATE((order.createdTime AT TIME ZONE \'UTC\') + INTERVAL \'7 hours\')')
        .orderBy('date', 'ASC')
        .getRawMany()

      logger.info(`Raw monthly data from DB: ${JSON.stringify(rawMonthlyData)}`)

      const monthlyRevenueChart = rawMonthlyData.map((row: any) => {
        const formattedDate = formatDateToYYYYMMDDGMT7(row.date)
        logger.info(`Formatting date - raw date: ${row.date}, formatted: ${formattedDate}, revenue: ${row.revenue}`)
        return {
          date: formattedDate,
          revenue: parseInt(row.revenue) || 0
        }
      })

      logger.info(`Final monthlyRevenueChart: ${JSON.stringify(monthlyRevenueChart)}`)

      logger.info('Successfully fetched dashboard stats')

      return {
        totalProducts,
        lowStockProducts,
        topSellingProducts,
        todayOrdersCount,
        todayRevenue,
        recentOrders: recentOrders.map(order => ({
          orderId: order.orderId,
          createdTime: order.createdTime instanceof Date ? formatToGMT7ISO(order.createdTime) : formatToGMT7ISO(new Date(String(order.createdTime))),
          finalPrice: order.finalPrice,
          status: order.status,
          user: {
            username: order.user.username
          },
          orderItems: order.orderItems.map(item => ({
            quantity: item.quantity,
            unitSalePrice: item.unitSalePrice,
            totalPrice: item.totalPrice,
            product: {
              name: item.product.name,
              sku: item.product.sku
            }
          }))
        })),
        monthlyRevenueChart
      }
    } catch (error) {
      logger.error(`Failed to fetch dashboard stats: ${error instanceof Error ? error.message : 'Unknown error'}`)
      throw new Error('Failed to fetch dashboard statistics')
    }
  })
}
