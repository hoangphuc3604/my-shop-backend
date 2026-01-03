# 🚀 Ví Dụ Sử Dụng Thực Tế

Trang này cung cấp các ví dụ thực tế và workflow hoàn chỉnh cho việc sử dụng API My Shop.

## 📋 Mục Lục

- [Workflow Cơ Bản](#workflow-cơ-bản)
- [Authentication Flow](#authentication-flow)
- [Product Management](#product-management)
- [Order Management](#order-management)
- [Advanced Queries](#advanced-queries)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## 🔄 Workflow Cơ Bản

### 1. Ping Server
```bash
# Kiểm tra server có hoạt động không
curl "https://my-shop-backend-fb9q.onrender.com/graphql?query={hello}"
```

### 2. Đăng Ký & Đăng Nhập
```graphql
# Đăng ký tài khoản mới
mutation {
  register(input: {
    username: "nguyenvana"
    email: "nguyenvana@example.com"
    password: "password123"
  }) {
    success
    token
    message
  }
}

# Đăng nhập để nhận token
mutation {
  login(input: {
    username: "admin"
    password: "admin123"
  }) {
    token
    user { username role }
  }
}
```

### 3. Sử dụng API với Token
```bash
# Header cho tất cả requests sau khi đăng nhập
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🔐 Authentication Flow

### Đăng Ký Người Dùng Mới
```graphql
mutation RegisterUser {
  register(input: {
    username: "sales_rep_01"
    email: "sales@example.com"
    password: "secure_password_123"
  }) {
    success
    token
    user {
      userId
      username
      email
      role
      createdAt
    }
    message
  }
}
```

### Đăng Nhập và Lấy Thông Tin
```graphql
mutation LoginAndGetInfo {
  login(input: {
    username: "admin"
    password: "admin123"
  }) {
    success
    token
    user {
      userId
      username
      email
      role
      lastLogin
      isActive
    }
    message
  }
}
```

### Kiểm Tra Thông Tin Tài Khoản Hiện Tại
```graphql
query GetMyProfile {
  me {
    userId
    username
    email
    role
    createdAt
    lastLogin
  }
}
```

---

## 📦 Product Management

### Lấy Danh Sách Sản Phẩm Cơ Bản
```graphql
query GetBasicProducts {
  products(params: {}) {
    items {
      productId
      name
      count
      category {
        name
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
    }
  }
}
```

### Tìm Kiếm Sản Phẩm Nâng Cao
```graphql
query SearchProducts {
  products(params: {
    search: "áo thun"
    minPrice: 100000
    maxPrice: 500000
    sortBy: IMPORT_PRICE
    sortOrder: ASC
    page: 1
    limit: 20
  }) {
    items {
      productId
      sku
      name
      importPrice
      count
      description
      category {
        name
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
      hasNextPage
    }
  }
}
```

### Lấy Chi Tiết Một Sản Phẩm
```graphql
query GetProductDetails($productId: ID!) {
  product(id: $productId) {
    productId
    sku
    name
    importPrice
    count
    description
    images {
      url
      altText
      position
      isPrimary
    }
    category {
      categoryId
      name
      description
    }
  }
}
```

### Tải Template Excel Để Import Sản Phẩm
```graphql
query GetProductTemplate {
  productTemplate {
    fileBase64
    filename
    mimeType
  }
}
```

**Mô tả:**
- Trả về file template Excel (.xlsx) với hướng dẫn đầy đủ bằng tiếng Anh
- File có data validation, dropdown cho categoryId, và comments cho từng cột
- Chỉ user có quyền `MANAGE_PRODUCTS` mới có thể truy cập

**Cách sử dụng trên client:**
```javascript
// GraphQL query
const query = `
  query GetProductTemplate {
    productTemplate {
      fileBase64
      filename
      mimeType
    }
  }
`;

// Decode base64 và save file
const response = await fetch('/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query })
});

const { data } = await response.json();
const { fileBase64, filename, mimeType } = data.productTemplate;

// Convert base64 to blob and download
const byteCharacters = atob(fileBase64);
const byteNumbers = new Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
  byteNumbers[i] = byteCharacters.charCodeAt(i);
}
const byteArray = new Uint8Array(byteNumbers);
const blob = new Blob([byteArray], { type: mimeType });

const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

### Import Sản Phẩm Hàng Loạt Từ Excel
```graphql
mutation BulkCreateProducts {
  bulkCreateProducts(fileBase64: "UEsDBBQAAAAIAG1Xa1YAAAAAAAAAAAAAAAALAAAAeGwt...") {
    createdCount
    failedCount
    errors {
      row
      message
      field
    }
  }
}
```

**Cách tạo file Excel:**
1. Tải template bằng query `productTemplate`
2. Điền dữ liệu sản phẩm theo hướng dẫn trong sheet "Instructions"
3. Sử dụng dropdown cho categoryId và tuân thủ validation rules
4. Convert file sang base64 (có thể dùng online tools hoặc code)
5. Gửi qua mutation

**Ví dụ cấu trúc file Excel (theo template):**
```
sku,name,description,price,categoryId,stock,images
PROD001,"Cotton T-Shirt","High-quality cotton t-shirt",150000,1,50,"https://example.com/image1.jpg,https://example.com/image2.jpg"
PROD002,"Slim Fit Jeans","Premium slim fit jeans for women",350000,2,30,"https://example.com/image3.jpg"
```

**Lưu ý validation (theo template):**
- `sku`: Optional. Max 50 chars. Allowed: letters, numbers, hyphen, underscore.
- `name`: Required. Product name. Max 200 chars.
- `description`: Optional. Max 1000 chars.
- `price`: Required. Number > 0.
- `categoryId`: Required. Choose from dropdown list (auto-populated from database).
- `stock`: Optional. Integer >= 0 (default 0).
- `images`: Optional. Comma-separated URLs (https:// format recommended).

### Lấy Danh Sách Danh Mục
```graphql
query GetCategoriesWithProducts {
  categories(params: {
    page: 1
    limit: 10
  }) {
    items {
      categoryId
      name
      description
      products {
        productId
        name
        count
      }
    }
    pagination {
      totalCount
    }
  }
}
```

---

## 🛒 Order Management

### Tạo Đơn Hàng Mới (Admin Only)
```graphql
mutation CreateNewOrder {
  addOrder(input: {
    orderItems: [
      {
        productId: 1
        quantity: 2
      },
      {
        productId: 3
        quantity: 1
      }
    ]
  }) {
    orderId
    createdTime
    finalPrice
    status
    orderItems {
      product {
        name
        sku
      }
      quantity
      unitSalePrice
      totalPrice
    }
  }
}
```

### Lấy Danh Sách Đơn Hàng
```graphql
query GetOrdersList {
  orders(params: {
    page: 1
    limit: 10
    startDate: "2024-01-01"
    endDate: "2024-12-31"
  }) {
    items {
      orderId
      createdTime
      finalPrice
      status
      orderItems {
        quantity
        totalPrice
        product {
          name
        }
      }
    }
    pagination {
      totalCount
      currentPage
      totalPages
    }
  }
}
```

### Lấy Chi Tiết Đơn Hàng
```graphql
query GetOrderDetails($orderId: ID!) {
  order(id: $orderId) {
    orderId
    createdTime
    finalPrice
    status
    orderItems {
      orderItemId
      quantity
      unitSalePrice
      totalPrice
      product {
        productId
        name
        sku
        description
      }
    }
  }
}
```

### Cập Nhật Trạng Thái Đơn Hàng
```graphql
mutation UpdateOrderStatus($orderId: ID!) {
  updateOrder(id: $orderId, input: {
    status: Paid
  }) {
    orderId
    status
    createdTime
  }
}
```

### Xóa Đơn Hàng (Chỉ trạng thái Created)
```graphql
mutation DeletePendingOrder($orderId: ID!) {
  deleteOrder(id: $orderId)
}
```

---

## 🔍 Advanced Queries

### Phân Trang Nâng Cao
```graphql
query GetProductsWithPagination {
  products(params: {
    page: 2
    limit: 5
    sortBy: COUNT
    sortOrder: DESC
  }) {
    items {
      name
      count
      importPrice
    }
    pagination {
      totalCount
      currentPage
      totalPages
      limit
      hasNextPage
      hasPrevPage
    }
  }
}
```

### Lọc Theo Nhiều Tiêu Chí
```graphql
query GetFilteredProducts {
  products(params: {
    search: "điện thoại"
    minPrice: 5000000
    maxPrice: 20000000
    sortBy: IMPORT_PRICE
    sortOrder: DESC
  }) {
    items {
      productId
      name
      importPrice
      count
      category {
        name
      }
    }
  }
}
```

### Query Nhiều Resource Cùng Lúc
```graphql
query GetDashboardData {
  products(params: { limit: 5 }) {
    items {
      name
      count
    }
  }
  categories(params: { limit: 3 }) {
    items {
      name
      products {
        productId
      }
    }
  }
  orders(params: { limit: 3 }) {
    items {
      orderId
      status
      finalPrice
    }
  }
  me {
    username
    role
  }
}
```

---

## ⚠️ Error Handling

### Xử Lý Lỗi Authentication
```graphql
# Request không có token
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### Xử Lý Lỗi Validation
```graphql
# Đăng ký với username đã tồn tại
mutation {
  register(input: {
    username: "existing_user"
    email: "test@example.com"
    password: "123"
  }) {
    success
    message
  }
}

# Response
{
  "data": {
    "register": {
      "success": false,
      "message": "Username or email already exists"
    }
  }
}
```

### Xử Lý Lỗi Permission
```graphql
# User thường truy cập admin API
{
  "errors": [
    {
      "message": "Permission denied",
      "extensions": {
        "code": "PERMISSION_ERROR"
      }
    }
  ]
}
```

### Xử Lý Lỗi Business Logic
```graphql
# Tạo đơn hàng với sản phẩm hết hàng
mutation {
  addOrder(input: {
    orderItems: [
      {
        productId: 1
        quantity: 1000  # Quá nhiều
      }
    ]
  }) {
    orderId
  }
}

# Sẽ throw error với message về insufficient stock
```

---

## 💡 Best Practices

### 1. **Authentication & Security**
```javascript
// Lưu token sau khi đăng nhập
const login = async (username, password) => {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user { username role }
          }
        }
      `,
      variables: { input: { username, password } }
    })
  });

  const { data } = await response.json();
  if (data.login.token) {
    localStorage.setItem('token', data.login.token);
  }
  return data.login;
};

// Sử dụng token cho mọi request
const makeAuthenticatedRequest = (query, variables = {}) => {
  const token = localStorage.getItem('token');
  return fetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });
};
```

### 2. **Pagination Handling**
```javascript
const loadProducts = async (page = 1, search = '') => {
  const query = `
    query GetProducts($params: ProductListParams) {
      products(params: $params) {
        items {
          productId
          name
          importPrice
          count
        }
        pagination {
          totalCount
          currentPage
          totalPages
          hasNextPage
          hasPrevPage
        }
      }
    }
  `;

  const response = await makeAuthenticatedRequest(query, {
    params: {
      page,
      limit: 10,
      search,
      sortBy: 'IMPORT_PRICE',
      sortOrder: 'ASC'
    }
  });

  const { data } = await response.json();
  return data.products;
};
```

### 3. **Error Handling**
```javascript
const handleApiCall = async (operation) => {
  try {
    const response = await operation();

    if (response.errors) {
      // GraphQL errors
      response.errors.forEach(error => {
        console.error('GraphQL Error:', error.message);
        // Handle specific error types
        if (error.extensions?.code === 'UNAUTHENTICATED') {
          // Redirect to login
          window.location.href = '/login';
        }
      });
      return null;
    }

    return response.data;
  } catch (networkError) {
    console.error('Network Error:', networkError);
    // Handle network errors
    return null;
  }
};
```

### 4. **Optimizing Queries**
```javascript
// ❌ Bad: Query quá nhiều data không cần thiết
query GetAllProductData {
  products(params: {}) {
    items {
      productId
      name
      importPrice
      count
      description
      images {
        url
        altText
        position
        isPrimary
      }
      category {
        categoryId
        name
        description
        products {
          productId
          name
        }
      }
      orderItems {
        orderItemId
        quantity
      }
    }
  }
}

// ✅ Good: Query chỉ data cần thiết
query GetProductList {
  products(params: { limit: 10 }) {
    items {
      productId
      name
      importPrice
      count
      category {
        name
      }
    }
    pagination {
      totalCount
      hasNextPage
    }
  }
}
```

### 5. **Real-time Updates (Future)**
```javascript
// Khi có subscription support
const subscribeToOrders = () => {
  // Will be available when subscriptions are implemented
  // subscription {
  //   orderCreated {
  //     orderId
  //     finalPrice
  //     status
  //   }
  // }
};
```

### 6. **Caching Strategy**
```javascript
// Cache categories vì chúng ít thay đổi
let categoriesCache = null;
const getCategories = async () => {
  if (!categoriesCache) {
    const query = `
      query {
        categories(params: {}) {
          items {
            categoryId
            name
          }
        }
      }
    `;
    const response = await makeAuthenticatedRequest(query);
    categoriesCache = response.data.categories.items;
  }
  return categoriesCache;
};
```

---

## 🎯 Common Use Cases

### E-commerce Website
1. **Trang chủ**: Hiển thị sản phẩm nổi bật
2. **Tìm kiếm**: Sản phẩm theo từ khóa + bộ lọc giá
3. **Danh mục**: Sản phẩm theo category
4. **Giỏ hàng**: Tạo đơn hàng từ cart

### Admin Dashboard
1. **Thống kê**: Tổng sản phẩm, đơn hàng, doanh thu
2. **Quản lý sản phẩm**: CRUD operations
3. **Quản lý đơn hàng**: Xem và cập nhật trạng thái
4. **Quản lý người dùng**: Thêm/xóa sales reps

### Mobile App
1. **Authentication**: Đăng nhập/đăng ký
2. **Product browsing**: Infinite scroll với pagination
3. **Order placement**: Tạo đơn hàng từ app
4. **Profile management**: Cập nhật thông tin cá nhân

---

## 🔧 Testing với GraphQL Playground

1. **Truy cập**: `https://my-shop-backend-fb9q.onrender.com/graphql`
2. **Test ping**: `{ hello }`
3. **Đăng nhập**: Sử dụng tab Variables để truyền input
4. **Copy token**: Từ response login để sử dụng cho các query khác
5. **Test phân quyền**: Thử truy cập admin APIs với user thường

---

## 📱 Integration Examples

### React với Apollo Client
```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://my-shop-backend-fb9q.onrender.com/graphql',
  cache: new InMemoryCache(),
  headers: {
    authorization: localStorage.getItem('token') || ''
  }
});

// Usage
const GET_PRODUCTS = gql`
  query GetProducts($params: ProductListParams) {
    products(params: $params) {
      items {
        productId
        name
        importPrice
      }
      pagination {
        totalCount
        hasNextPage
      }
    }
  }
`;
```

### Vue.js với vue-apollo
```javascript
// Tương tự với React, sử dụng vue-apollo
import Vue from 'vue';
import VueApollo from 'vue-apollo';
import ApolloClient from 'apollo-client';

Vue.use(VueApollo);

const apolloClient = new ApolloClient({
  // config
});

const apolloProvider = new VueApollo({
  defaultClient: apolloClient,
});
```

---

*Tài liệu này được cập nhật liên tục. Hãy kiểm tra các file khác trong thư mục docs để có thông tin chi tiết hơn!* 📚
