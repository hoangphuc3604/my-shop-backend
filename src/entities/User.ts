import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

export enum UserRole {
  ADMIN = 'ADMIN',
  SALE = 'SALE'
}

export enum Permission {
  READ_USERS = 'READ_USERS',
  MANAGE_USERS = 'MANAGE_USERS',
  READ_PRODUCTS = 'READ_PRODUCTS',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  VIEW_IMPORT_PRICES = 'VIEW_IMPORT_PRICES',
  READ_CATEGORIES = 'READ_CATEGORIES',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  READ_ORDERS = 'READ_ORDERS',
  MANAGE_ORDERS = 'MANAGE_ORDERS',
  CREATE_ORDERS = 'CREATE_ORDERS',
  MANAGE_SYSTEM = 'MANAGE_SYSTEM'
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userId!: number

  @Column({ length: 100 })
  @Index({ unique: true })
  username!: string

  @Column({ length: 255 })
  @Index({ unique: true })
  email!: string

  @Column()
  passwordHash!: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SALE
  })
  role!: UserRole

  @CreateDateColumn()
  createdAt!: Date

  @Column({ type: 'timestamp', nullable: true })
  lastLogin!: Date

  @Column({ default: true })
  isActive!: boolean
}
