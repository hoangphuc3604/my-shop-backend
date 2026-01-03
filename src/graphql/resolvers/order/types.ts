import { Order } from '../../../entities/Order'

export const orderTypes = {
  Order: {
    createdTime: (order: Order) => {
      return order.createdTime.toISOString()
    }
  }
}

