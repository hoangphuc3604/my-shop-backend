export const Messages = {
  // Auth
  REGISTER_SUCCESS: 'User registered successfully',
  REGISTER_FAILED: 'Registration failed',
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_FAILED: 'Login failed',
  INVALID_CREDENTIALS: 'Invalid username or password',
  ACCOUNT_INACTIVE: 'Account is inactive',

  // Orders
  ORDER_CREATED: 'Order created successfully',
  ORDER_NOT_FOUND: 'Order not found',
  ORDER_STATUS_FINAL: 'Order status is final and cannot be changed',
  ORDER_STATUS_INVALID_TRANSITION: 'Created orders can only transition to Paid or Cancelled',
  ORDER_DELETE_INVALID_STATUS: 'Can only delete orders with status "Created"',
  ORDER_PERMISSION_DENIED: 'Only admin can create orders',
  ORDER_UPDATE_PERMISSION_DENIED: 'Only admin can update orders',
  ORDER_DELETE_PERMISSION_DENIED: 'Only admin can delete orders',

  // Products
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  PRODUCT_NOT_FOUND: 'Product not found',
  PRODUCT_DELETE_HAS_ORDERS: 'Cannot delete product that has been ordered',
  PRODUCT_MANAGE_PERMISSION_DENIED: 'Only admin can manage products',

  // Categories
  CATEGORY_NOT_FOUND: 'Category not found',
  CATEGORY_NAME_EMPTY: 'Category name cannot be empty',
  CATEGORY_NAME_TOO_LONG: 'Category name must be less than 200 characters',
  CATEGORY_NAME_EXISTS: 'Category name already exists',
  CATEGORY_DESCRIPTION_TOO_LONG: 'Category description must be less than 500 characters',
  CATEGORY_CREATED: 'Category created successfully',
  CATEGORY_UPDATED: 'Category updated successfully',
  CATEGORY_DELETED: 'Category deleted successfully',
  CATEGORY_MANAGE_PERMISSION_DENIED: 'Only admin can manage categories',

  // Common validation
  SKU_EMPTY: 'SKU cannot be empty',
  SKU_TOO_LONG: 'SKU must be less than 50 characters',
  SKU_EXISTS: 'SKU already exists',
  NAME_EMPTY: 'Product name cannot be empty',
  NAME_TOO_LONG: 'Product name must be less than 200 characters',
  IMPORT_PRICE_NEGATIVE: 'Import price cannot be negative',
  COUNT_NEGATIVE: 'Count cannot be negative',
  DESCRIPTION_TOO_LONG: 'Description must be less than 1000 characters',
  IMAGES_MIN_REQUIRED: 'At least 3 images are required',
  IMAGES_TOO_MANY_PRIMARY: 'Only one image can be primary',
  IMAGE_URL_EMPTY: 'Image url cannot be empty',
  IMAGE_URL_TOO_LONG: 'Image url must be less than 1000 characters',
  IMAGE_ALT_TOO_LONG: 'Image altText must be less than 200 characters',
  QUANTITY_INVALID: 'Quantity must be greater than 0',
  PRODUCTS_NOT_FOUND: 'Some products not found',

  // Dynamic messages
  INSUFFICIENT_STOCK: (productName: string, available: number) => `Insufficient stock for product ${productName}. Available: ${available}`
} as const

