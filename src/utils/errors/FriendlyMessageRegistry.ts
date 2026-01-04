import { Messages } from '../messages'

export type FieldMessages = { [field: string]: string }

const registry: { [inputType: string]: FieldMessages } = {
  CreateProductInput: {
    images: 'Please provide at least 3 images for the product.',
    categoryId: 'Please select a category for the product.',
    sku: 'Please provide a valid SKU.',
    name: 'Please provide a product name.',
    importPrice: 'Please provide a valid import price.',
    count: 'Please provide a valid stock count.'
  },
  UpdateProductInput: {
    images: 'Please provide at least 3 images for the product.',
    categoryId: 'Please select a category for the product.',
    sku: 'Please provide a valid SKU.',
    name: 'Please provide a product name.',
    importPrice: 'Please provide a valid import price.',
    count: 'Please provide a valid stock count.'
  },
  CreateCategoryInput: {
    name: 'Please provide a category name.',
    description: 'Please provide a valid category description.'
  },
  UpdateCategoryInput: {
    name: 'Please provide a category name.',
    description: 'Please provide a valid category description.'
  }
}

export function registerFriendlyMessages(inputType: string, messages: FieldMessages) {
  registry[inputType] = { ...(registry[inputType] || {}), ...(messages || {}) }
}

export function getFriendlyMessagesForInput(inputType?: string): FieldMessages | undefined {
  if (!inputType) return undefined
  return registry[inputType]
}

export const defaultGenericFieldMessages: FieldMessages = {
  images: 'Please provide at least 3 images.',
  categoryId: 'Please select a category.',
  sku: 'Please provide a valid SKU.',
  name: 'Please provide a value for name.',
  importPrice: 'Please provide a valid import price.',
  count: 'Please provide a valid stock count.'
}

const operationRegistry: { [operation: string]: FieldMessages } = {}

export function registerFriendlyMessagesForOperation(operationName: string, messages: FieldMessages) {
  operationRegistry[operationName] = { ...(operationRegistry[operationName] || {}), ...(messages || {}) }
}

export function getFriendlyMessagesForOperation(operationName?: string): FieldMessages | undefined {
  if (!operationName) return undefined
  return operationRegistry[operationName]
}


