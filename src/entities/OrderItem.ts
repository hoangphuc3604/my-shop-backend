import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './Order'
import { Product } from './Product'

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  orderItemId!: number

  @Column({ type: 'int', default: 1 })
  quantity!: number

  @Column({ type: 'float', default: 0 })
  unitSalePrice!: number

  @Column({ type: 'int', default: 0 })
  totalPrice!: number

  @Column({ type: 'int' })
  orderId!: number

  @Column({ type: 'int' })
  productId!: number

  @ManyToOne(() => Order, order => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order

  @ManyToOne(() => Product, product => product.orderItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product
}
