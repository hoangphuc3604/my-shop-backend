import { AppDataSource } from '../../../config/database'
import { Order } from '../../../entities/Order'
import { OrderItem } from '../../../entities/OrderItem'
import { Product } from '../../../entities/Product'
import { formatToGMT7ISO, formatDateToYYYYMMDDGMT7, formatCurrentTimeGMT7 } from '../../../utils/timezone'

interface ProductQuantity {
  productId: number
  productName: string
  quantity: number
}

interface DailyRevenue {
  date: string
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  totalQuantity: number
  productQuantities: ProductQuantity[]
}

interface WeeklyRevenue {
  weekNumber: number
  year: number
  weekStartDate: string
  weekEndDate: string
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  totalQuantity: number
  productQuantities: ProductQuantity[]
}

interface MonthlyRevenue {
  month: number
  year: number
  monthName: string
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  totalQuantity: number
  productQuantities: ProductQuantity[]
}

interface YearlyRevenue {
  year: number
  totalRevenue: number
  orderCount: number
  averageOrderValue: number
  totalQuantity: number
  productQuantities: ProductQuantity[]
}

interface ProductRevenue {
  productId: number
  productName: string
  sku: string
  totalQuantitySold: number
  totalRevenue: number
  averagePricePerUnit: number
}

interface RevenueReport {
  generatedDate: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  dailyRevenues: DailyRevenue[]
  weeklyRevenues: WeeklyRevenue[]
  monthlyRevenues: MonthlyRevenue[]
  yearlyRevenues: YearlyRevenue[]
  productRevenues: ProductRevenue[]
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

function getWeekStartAndEnd(date: Date): { start: Date, end: Date } {
  const dayOfWeek = date.getDay()
  const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)

  const start = new Date(date)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}


function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1]
}

function getUtcRangeForDateRange(fromDate?: string, toDate?: string) {
  if (!fromDate && !toDate) return null

  const GMT_OFFSET_MS = 7 * 60 * 60 * 1000
  let startUtc: Date
  let endUtc: Date

  if (fromDate) {
    const [year, month, day] = fromDate.split('-').map(Number)
    const localStartOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
    startUtc = new Date(localStartOfDay.getTime() - GMT_OFFSET_MS)
  } else {
    startUtc = new Date('1970-01-01T00:00:00Z')
  }

  if (toDate) {
    const [year, month, day] = toDate.split('-').map(Number)
    const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
    endUtc = new Date(localEndOfDay.getTime() - GMT_OFFSET_MS)
  } else {
    endUtc = new Date('2100-01-01T00:00:00Z')
  }

  return { startUtc, endUtc }
}


export async function generateRevenueReport(
  _: any,
  args: { fromDate?: string; toDate?: string }
): Promise<RevenueReport> {
  const { fromDate, toDate } = args

  let whereClause = 'o.status = :status'
  let parameters: any = { status: 'Paid' }

  const dateRange = getUtcRangeForDateRange(fromDate, toDate)
  if (dateRange) {
    whereClause += ' AND o.createdTime >= :startUtc AND o.createdTime <= :endUtc'
    parameters.startUtc = dateRange.startUtc
    parameters.endUtc = dateRange.endUtc
  }

  const orderRepository = AppDataSource.getRepository(Order)
  const orderItemRepository = AppDataSource.getRepository(OrderItem)

  const orderItems = await orderItemRepository
    .createQueryBuilder('oi')
    .select([
      'oi.*',
      'o.createdTime as orderCreatedTime',
      'o.finalPrice as orderFinalPrice',
      'p.name as productName',
      'p.sku as productSku'
    ])
    .leftJoin('oi.order', 'o')
    .leftJoin('oi.product', 'p')
    .where(whereClause, parameters)
    .orderBy('o.createdTime', 'ASC')
    .getRawMany()

  const dailyMap = new Map<string, { revenue: number; orders: Set<number>; items: Map<number, { quantity: number; name: string }> }>()
  const weeklyMap = new Map<string, { revenue: number; orders: Set<number>; items: Map<number, { quantity: number; name: string }> }>()
  const monthlyMap = new Map<string, { revenue: number; orders: Set<number>; items: Map<number, { quantity: number; name: string }> }>()
  const yearlyMap = new Map<string, { revenue: number; orders: Set<number>; items: Map<number, { quantity: number; name: string }> }>()
  const productMap = new Map<number, { name: string; sku: string; revenue: number; quantity: number }>()
  const orderRevenueMap = new Map<number, number>()

  orderItems.forEach(item => {
    const totalPrice = parseFloat(item.totalPrice) || 0
    const quantity = parseInt(item.quantity) || 0
    const finalPrice = parseFloat(item.orderfinalprice) || 0


    let createdTime: Date
    try {
      const createdTimeValue = item.ordercreatedtime
      if (typeof createdTimeValue === 'string') {
        createdTime = new Date(createdTimeValue)
      } else {
        createdTime = new Date(createdTimeValue)
      }

      if (isNaN(createdTime.getTime())) {
        console.warn('Invalid createdTime:', createdTimeValue, typeof createdTimeValue)
        return
      }
    } catch (error) {
      console.warn('Error parsing createdTime:', item.ordercreatedtime, error)
      return
    }

    const localDate = new Date(createdTime.getTime() + 7 * 60 * 60 * 1000)
    const dateStr = formatDateToYYYYMMDDGMT7(createdTime)
    const weekKey = `${localDate.getFullYear()}-W${getWeekNumber(localDate)}`
    const monthKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}`
    const yearKey = localDate.getFullYear().toString()

    if (!dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, { revenue: 0, orders: new Set(), items: new Map() })
    }
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, { revenue: 0, orders: new Set(), items: new Map() })
    }
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { revenue: 0, orders: new Set(), items: new Map() })
    }
    if (!yearlyMap.has(yearKey)) {
      yearlyMap.set(yearKey, { revenue: 0, orders: new Set(), items: new Map() })
    }

    const daily = dailyMap.get(dateStr)!
    const weekly = weeklyMap.get(weekKey)!
    const monthly = monthlyMap.get(monthKey)!
    const yearly = yearlyMap.get(yearKey)!

    daily.revenue += totalPrice
    weekly.revenue += totalPrice
    monthly.revenue += totalPrice
    yearly.revenue += totalPrice

    daily.orders.add(item.orderId)
    weekly.orders.add(item.orderId)
    monthly.orders.add(item.orderId)
    yearly.orders.add(item.orderId)

    if (!daily.items.has(item.productId)) {
      daily.items.set(item.productId, { quantity: 0, name: item.productname })
    }
    if (!weekly.items.has(item.productId)) {
      weekly.items.set(item.productId, { quantity: 0, name: item.productname })
    }
    if (!monthly.items.has(item.productId)) {
      monthly.items.set(item.productId, { quantity: 0, name: item.productname })
    }
    if (!yearly.items.has(item.productId)) {
      yearly.items.set(item.productId, { quantity: 0, name: item.productname })
    }

    daily.items.get(item.productId)!.quantity += quantity
    weekly.items.get(item.productId)!.quantity += quantity
    monthly.items.get(item.productId)!.quantity += quantity
    yearly.items.get(item.productId)!.quantity += quantity

    if (!productMap.has(item.productId)) {
      productMap.set(item.productId, {
        name: item.productname,
        sku: item.productsku,
        revenue: 0,
        quantity: 0
      })
    }

    if (!orderRevenueMap.has(item.orderId)) {
      orderRevenueMap.set(item.orderId, finalPrice)
    }

    const product = productMap.get(item.productId)!
    product.revenue += totalPrice
    product.quantity += quantity
  })

  const dailyRevenues: DailyRevenue[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      totalRevenue: data.revenue,
      orderCount: data.orders.size,
      averageOrderValue: data.orders.size > 0 ? data.revenue / data.orders.size : 0,
      totalQuantity: Array.from(data.items.values()).reduce((sum, item) => sum + item.quantity, 0),
      productQuantities: Array.from(data.items.entries()).map(([productId, item]) => ({
        productId,
        productName: item.name,
        quantity: item.quantity
      }))
    }))

  const weeklyRevenues: WeeklyRevenue[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [yearStr, weekStr] = key.split('-W')
      const year = parseInt(yearStr)
      const weekNumber = parseInt(weekStr)

      const firstDayLocal = new Date(year, 0, 1, 0, 0, 0, 0)
      const days = (weekNumber - 1) * 7
      const weekStartLocal = new Date(firstDayLocal)
      weekStartLocal.setDate(firstDayLocal.getDate() + days - firstDayLocal.getDay() + 1)
      weekStartLocal.setHours(0, 0, 0, 0)

      const weekEndLocal = new Date(weekStartLocal)
      weekEndLocal.setDate(weekStartLocal.getDate() + 6)
      weekEndLocal.setHours(23, 59, 59, 999)

      return {
        weekNumber,
        year,
        weekStartDate: formatDateToYYYYMMDDGMT7(weekStartLocal),
        weekEndDate: formatDateToYYYYMMDDGMT7(weekEndLocal),
        totalRevenue: data.revenue,
        orderCount: data.orders.size,
        averageOrderValue: data.orders.size > 0 ? data.revenue / data.orders.size : 0,
        totalQuantity: Array.from(data.items.values()).reduce((sum, item) => sum + item.quantity, 0),
        productQuantities: Array.from(data.items.entries()).map(([productId, item]) => ({
          productId,
          productName: item.name,
          quantity: item.quantity
        }))
      }
    })

  const monthlyRevenues: MonthlyRevenue[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [yearStr, monthStr] = key.split('-')
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)

      return {
        month,
        year,
        monthName: getMonthName(month),
        totalRevenue: data.revenue,
        orderCount: data.orders.size,
        averageOrderValue: data.orders.size > 0 ? data.revenue / data.orders.size : 0,
        totalQuantity: Array.from(data.items.values()).reduce((sum, item) => sum + item.quantity, 0),
        productQuantities: Array.from(data.items.entries()).map(([productId, item]) => ({
          productId,
          productName: item.name,
          quantity: item.quantity
        }))
      }
    })

  const yearlyRevenues: YearlyRevenue[] = Array.from(yearlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearStr, data]) => ({
      year: parseInt(yearStr),
      totalRevenue: data.revenue,
      orderCount: data.orders.size,
      averageOrderValue: data.orders.size > 0 ? data.revenue / data.orders.size : 0,
      totalQuantity: Array.from(data.items.values()).reduce((sum, item) => sum + item.quantity, 0),
      productQuantities: Array.from(data.items.entries()).map(([productId, item]) => ({
        productId,
        productName: item.name,
        quantity: item.quantity
      }))
    }))

  const productRevenues: ProductRevenue[] = Array.from(productMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([productId, data]) => ({
      productId,
      productName: data.name,
      sku: data.sku,
      totalQuantitySold: data.quantity,
      totalRevenue: data.revenue,
      averagePricePerUnit: data.quantity > 0 ? data.revenue / data.quantity : 0
    }))

  const totalRevenue = Array.from(orderRevenueMap.values()).reduce((sum, revenue) => sum + revenue, 0)
  const totalOrders = orderRevenueMap.size
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return {
    generatedDate: formatCurrentTimeGMT7(),
    totalRevenue,
    totalOrders,
    averageOrderValue,
    dailyRevenues,
    weeklyRevenues,
    monthlyRevenues,
    yearlyRevenues,
    productRevenues
  }
}

export async function getProductRevenue(
  _: any,
  args: { fromDate?: string; toDate?: string }
): Promise<ProductRevenue[]> {
  const { fromDate, toDate } = args

  let whereClause = 'o.status = :status'
  let parameters: any = { status: 'Paid' }

  const dateRange = getUtcRangeForDateRange(fromDate, toDate)
  if (dateRange) {
    whereClause += ' AND o.createdTime >= :startUtc AND o.createdTime <= :endUtc'
    parameters.startUtc = dateRange.startUtc
    parameters.endUtc = dateRange.endUtc
  }

  const orderItemRepository = AppDataSource.getRepository(OrderItem)

  const productRevenuesRaw = await orderItemRepository
    .createQueryBuilder('oi')
    .select([
      'p.productId',
      'p.name as productName',
      'p.sku',
      'SUM(oi.totalPrice) as totalRevenue',
      'SUM(oi.quantity) as totalQuantitySold'
    ])
    .innerJoin('oi.order', 'o')
    .innerJoin('oi.product', 'p')
    .where(whereClause, parameters)
    .groupBy('p.productId')
    .addGroupBy('p.name')
    .addGroupBy('p.sku')
    .orderBy('totalRevenue', 'DESC')
    .getRawMany()

  return productRevenuesRaw.map(item => {
    const totalQuantitySold = parseInt(item.totalQuantitySold) || 0
    const totalRevenue = parseFloat(item.totalRevenue) || 0
    return {
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      totalQuantitySold,
      totalRevenue,
      averagePricePerUnit: totalQuantitySold > 0 ? totalRevenue / totalQuantitySold : 0
    }
  })
}
