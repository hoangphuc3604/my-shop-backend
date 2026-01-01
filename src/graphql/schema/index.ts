import { gql } from 'apollo-server'

export const typeDefs = gql`
  type User {
    userId: ID!
    username: String!
    email: String!
    role: String!
    createdAt: String!
    lastLogin: String
    isActive: Boolean!
  }

  type Category {
    categoryId: ID!
    name: String!
    description: String
    products: [Product!]!
  }

  type Product {
    productId: ID!
    sku: String!
    name: String!
    importPrice: Int
    count: Int!
    description: String!
    imageUrl1: String!
    imageUrl2: String!
    imageUrl3: String!
    categoryId: Int!
    category: Category!
    orderItems: [OrderItem!]!
  }

  type Order {
    orderId: ID!
    createdTime: String!
    finalPrice: Int!
    status: String!
    orderItems: [OrderItem!]!
  }

  type OrderItem {
    orderItemId: ID!
    quantity: Int!
    unitSalePrice: Float!
    totalPrice: Int!
    orderId: Int!
    productId: Int!
    order: Order!
    product: Product!
  }

  type PaginationInfo {
    totalCount: Int!
    currentPage: Int!
    totalPages: Int!
    limit: Int!
    hasNextPage: Boolean!
    hasPrevPage: Boolean!
  }

  type PaginatedUsers {
    items: [User!]!
    pagination: PaginationInfo!
  }

  type PaginatedCategories {
    items: [Category!]!
    pagination: PaginationInfo!
  }

  type PaginatedProducts {
    items: [Product!]!
    pagination: PaginationInfo!
  }

  type PaginatedOrders {
    items: [Order!]!
    pagination: PaginationInfo!
  }

  type AuthResponse {
    success: Boolean!
    token: String
    user: User
    message: String!
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    username: String!
    password: String!
  }

  input ListParams {
    search: String
    page: Int
    limit: Int
  }

  type Query {
    hello: String!
    users(params: ListParams): PaginatedUsers!
    user(id: ID!): User
    categories(params: ListParams): PaginatedCategories!
    category(id: ID!): Category
    products(params: ListParams): PaginatedProducts!
    product(id: ID!): Product
    orders(params: ListParams): PaginatedOrders!
    order(id: ID!): Order
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): AuthResponse!
    login(input: LoginInput!): AuthResponse!
  }
`
