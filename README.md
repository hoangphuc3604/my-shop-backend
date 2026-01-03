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
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d
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