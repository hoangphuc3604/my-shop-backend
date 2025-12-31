# My Shop Backend

GraphQL API server for My Shop built with Apollo Server, TypeScript, TypeORM, and PostgreSQL.

## Features

- ✅ Apollo Server with GraphQL
- ✅ TypeScript support
- ✅ TypeORM with PostgreSQL
- ✅ Auto database seeding
- ✅ Structured logging
- ✅ Professional project structure

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
DB_URL=postgresql://username:password@localhost:5432/database_name
PORT=4000
NODE_ENV=development
LOG_LEVEL=info
```

### Database Setup

Make sure PostgreSQL is running and create a database. Update the `DB_URL` in `.env` accordingly.

### Running the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production build
npm run build
npm start
```

The server will automatically:
1. Connect to the database
2. Run migrations (synchronize schema)
3. Seed initial data (categories, products, orders)

## GraphQL API

Once running, access GraphQL Playground at: `http://localhost:4000`

### Available Queries

```graphql
# Get all users
query {
  users {
    userId
    username
    email
    createdAt
  }
}

# Get all categories with products
query {
  categories {
    categoryId
    name
    products {
      productId
      name
      sku
      importPrice
    }
  }
}

# Get all products
query {
  products {
    productId
    sku
    name
    description
    importPrice
    count
    category {
      name
    }
  }
}

# Get all orders
query {
  orders {
    orderId
    createdTime
    finalPrice
    status
    orderItems {
      quantity
      unitSalePrice
      product {
        name
      }
    }
  }
}
```

## Database Schema

- **Users**: User accounts
- **Categories**: Product categories (Electronics, Clothing, Home & Garden)
- **Products**: Product catalog with images and pricing
- **Orders**: Customer orders
- **OrderItems**: Order line items

## Seeding Data

The application automatically seeds:
- 3 categories
- 66 products (22 per category)
- 10 sample orders with order items

Data is only seeded if categories table is empty.
