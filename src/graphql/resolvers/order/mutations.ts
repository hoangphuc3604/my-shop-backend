import { AppDataSource } from '../../../config/database'
import { Order } from '../../../entities/Order'
import { OrderItem } from '../../../entities/OrderItem'
import { Product } from '../../../entities/Product'
import { UserRole } from '../../../entities/User'
import { requireAuth } from '../../../middleware/authorization'
import { ValidationError, NotFoundError, PermissionError, BadRequestError } from '../../../utils/errors/CustomErrors'
import { Messages } from '../../../utils/messages'

enum OrderStatus {
  Created = 'Created',
  Paid = 'Paid',
  Cancelled = 'Cancelled'
}

export const orderMutations = {
  addOrder: requireAuth()(async (_: any, { input }: { input: { orderItems: Array<{ productId: number; quantity: number }> } }, context: any) => {
    if (context.user.role !== UserRole.ADMIN) {
      throw new PermissionError(Messages.ORDER_PERMISSION_DENIED)
    }

    const orderRepository = AppDataSource.getRepository(Order)
    const orderItemRepository = AppDataSource.getRepository(OrderItem)
    const productRepository = AppDataSource.getRepository(Product)

    const targetUserId = context.user.userId

    const productIds = input.orderItems.map(item => item.productId)
    const products = await productRepository.findByIds(productIds)

    if (products.length !== productIds.length) {
      throw new ValidationError(Messages.PRODUCTS_NOT_FOUND)
    }

    const productMap = new Map(products.map(p => [p.productId, p]))

    let totalPrice = 0
    const orderItems: Partial<OrderItem>[] = []

    for (const item of input.orderItems) {
      const product = productMap.get(item.productId)
      if (!product) {
        throw new NotFoundError(Messages.PRODUCT_NOT_FOUND)
      }

      if (item.quantity <= 0) {
        throw new ValidationError(Messages.QUANTITY_INVALID, 'quantity')
      }

      if (item.quantity > product.count) {
        throw new ValidationError(Messages.INSUFFICIENT_STOCK(product.name, product.count))
      }

      const unitPrice = product.importPrice
      const itemTotal = Math.round(unitPrice * item.quantity)

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitSalePrice: unitPrice,
        totalPrice: itemTotal
      })

      totalPrice += itemTotal
    }

    await AppDataSource.transaction(async transactionalEntityManager => {
      const order = orderRepository.create({
        userId: targetUserId,
        finalPrice: totalPrice,
        status: OrderStatus.Created
      })

      const savedOrder = await transactionalEntityManager.save(Order, order)

      for (const orderItem of orderItems) {
        orderItem.orderId = savedOrder.orderId
      }

      await transactionalEntityManager.save(OrderItem, orderItems)

      for (const item of input.orderItems) {
        const product = productMap.get(item.productId)!
        product.count -= item.quantity
        await transactionalEntityManager.save(Product, product)
      }
    })

    return await orderRepository.findOne({
      where: { orderId: (await orderRepository.findOne({ where: { userId: targetUserId }, order: { orderId: 'DESC' } }))!.orderId },
      relations: ['orderItems', 'orderItems.product']
    })
  }),
  updateOrder: requireAuth()(async (_: any, { id, input }: { id: string; input: { status: OrderStatus } }, context: any) => {
    if (context.user.role !== UserRole.ADMIN) {
      throw new PermissionError(Messages.ORDER_UPDATE_PERMISSION_DENIED)
    }

    const orderRepository = AppDataSource.getRepository(Order)

    const order = await orderRepository.findOne({
      where: { orderId: parseInt(id) },
      relations: ['orderItems', 'orderItems.product']
    })

    if (!order) {
      throw new NotFoundError(Messages.ORDER_NOT_FOUND)
    }


    const currentStatus = order.status as OrderStatus
    const newStatus = input.status as OrderStatus

    if (currentStatus === OrderStatus.Created) {
      if (newStatus === OrderStatus.Created) {
        return order
      }

      if (newStatus !== OrderStatus.Paid && newStatus !== OrderStatus.Cancelled) {
        throw new BadRequestError(Messages.ORDER_STATUS_INVALID_TRANSITION)
      }

      if (newStatus === OrderStatus.Cancelled) {
        await AppDataSource.transaction(async transactionalEntityManager => {
          for (const orderItem of order.orderItems) {
            const product = orderItem.product
            product.count += orderItem.quantity
            await transactionalEntityManager.save(Product, product)
          }

          order.status = newStatus
          await transactionalEntityManager.save(Order, order)
        })

        return order
      }
    } else {
      throw new BadRequestError(Messages.ORDER_STATUS_FINAL)
    }

    order.status = newStatus
    return await orderRepository.save(order)
  }),
  deleteOrder: requireAuth()(async (_: any, { id }: { id: string }, context: any) => {
    if (context.user.role !== UserRole.ADMIN) {
      throw new PermissionError(Messages.ORDER_DELETE_PERMISSION_DENIED)
    }

    const orderRepository = AppDataSource.getRepository(Order)
    const productRepository = AppDataSource.getRepository(Product)

    const order = await orderRepository.findOne({
      where: { orderId: parseInt(id) },
      relations: ['orderItems', 'orderItems.product']
    })

    if (!order) {
      throw new NotFoundError(Messages.ORDER_NOT_FOUND)
    }

    if (order.status !== OrderStatus.Created) {
      throw new BadRequestError(Messages.ORDER_DELETE_INVALID_STATUS)
    }

    await AppDataSource.transaction(async transactionalEntityManager => {
      for (const orderItem of order.orderItems) {
        const product = orderItem.product
        product.count += orderItem.quantity
        await transactionalEntityManager.save(Product, product)
      }

      await transactionalEntityManager.delete(Order, { orderId: order.orderId })
    })

    return true
  })
}
