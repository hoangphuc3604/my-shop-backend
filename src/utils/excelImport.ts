import * as XLSX from 'xlsx'

export interface ExcelProductRow {
  rowIndex: number
  sku?: string
  name: string
  description?: string
  importPrice: number
  categoryId: number
  stock: number
  images?: string[]
}

export interface ExcelParseError {
  rowIndex: number
  message: string
  field?: string
}

export class ExcelImportService {
  private static readonly MAX_ROWS = 500
  private static readonly HEADER_MAPPING = {
    'sku': 'sku',
    'name': 'name',
    'description': 'description',
    'price': 'importPrice',
    'categoryid': 'categoryId',
    'stock': 'stock',
    'images': 'images'
  } as const

  /**
   * Parses base64 Excel file and returns structured product data with validation errors
   * Prioritizes "Template" sheet if available, otherwise uses the first sheet
   * @param base64Data - Base64 encoded Excel file content
   * @returns Object containing parsed rows and any validation errors
   */
  static parse(base64Data: string): { rows: ExcelProductRow[], errors: ExcelParseError[] } {
    try {
      const buffer = Buffer.from(base64Data, 'base64')

      const workbook = XLSX.read(buffer, { type: 'buffer' })

      // Prioritize "Template" sheet if it exists, otherwise use first sheet
      let sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'template')
      if (!sheetName) {
        sheetName = workbook.SheetNames[0]
      }

      if (!sheetName) {
        return {
          rows: [],
          errors: [{ rowIndex: 0, message: 'No worksheets found in Excel file' }]
        }
      }

      const worksheet = workbook.Sheets[sheetName]

      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null
      }) as any[][]

      if (rawData.length < 2) {
        return {
          rows: [],
          errors: [{ rowIndex: 0, message: 'Excel file must contain at least header row and one data row' }]
        }
      }

      const headers = rawData[0] as string[]
      const dataRows = rawData.slice(1)

      const headerValidation = this.validateHeaders(headers)
      if (headerValidation.errors.length > 0) {
        return {
          rows: [],
          errors: headerValidation.errors.map(error => ({ ...error, rowIndex: 1 }))
        }
      }

      if (dataRows.length > this.MAX_ROWS) {
        return {
          rows: [],
          errors: [{
            rowIndex: 0,
            message: `Too many rows. Maximum allowed: ${this.MAX_ROWS}, found: ${dataRows.length}`
          }]
        }
      }

      const rows: ExcelProductRow[] = []
      const errors: ExcelParseError[] = []

      dataRows.forEach((row, index) => {
        const rowIndex = index + 2
        const rowData = this.mapRowToObject(headers, row)

        const rowErrors = this.validateRow(rowData, rowIndex)
        if (rowErrors.length > 0) {
          errors.push(...rowErrors)
          return
        }

        const transformedRow = this.transformRowData(rowData, rowIndex)
        if (transformedRow.errors.length > 0) {
          errors.push(...transformedRow.errors)
          return
        }

        rows.push(transformedRow.row!)
      })

      return { rows, errors }
    } catch (error) {
      return {
        rows: [],
        errors: [{
          rowIndex: 0,
          message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      }
    }
  }

  /**
   * Validates that all required headers are present in the Excel file
   * @param headers - Array of header strings from the Excel file
   * @returns Object containing any validation errors
   */
  private static validateHeaders(headers: string[]): { errors: ExcelParseError[] } {
    const errors: ExcelParseError[] = []
    const expectedHeaders = Object.keys(this.HEADER_MAPPING)

    const missingHeaders = expectedHeaders.filter(header =>
      !headers.some(h => h && h.toLowerCase().trim() === header.toLowerCase())
    )

    if (missingHeaders.length > 0) {
      errors.push({
        rowIndex: 1,
        message: `Missing required headers: ${missingHeaders.join(', ')}`
      })
    }

    return { errors }
  }

  /**
   * Maps Excel row data to object using header mapping
   * @param headers - Array of header strings
   * @param row - Array of cell values for the row
   * @returns Object with mapped field names and values
   */
  private static mapRowToObject(headers: string[], row: any[]): Record<string, any> {
    const obj: Record<string, any> = {}

    headers.forEach((header, index) => {
      if (header && row[index] !== null && row[index] !== undefined) {
        const normalizedHeader = header.toLowerCase().trim()
        const fieldName = this.HEADER_MAPPING[normalizedHeader as keyof typeof this.HEADER_MAPPING]
        if (fieldName) {
          obj[fieldName] = row[index]
        }
      }
    })

    return obj
  }

  /**
   * Validates a single row of Excel data
   * @param rowData - Object containing parsed row data
   * @param rowIndex - Row index in the Excel file (1-based)
   * @returns Array of validation errors for this row
   */
  private static validateRow(rowData: Record<string, any>, rowIndex: number): ExcelParseError[] {
    const errors: ExcelParseError[] = []
    console.log(rowData)

    if (!rowData.name || typeof rowData.name !== 'string' || rowData.name.trim() === '') {
      errors.push({ rowIndex, message: 'Name is required and must be a non-empty string', field: 'name' })
    }

    if (rowData.importPrice === undefined || rowData.importPrice === null) {
      errors.push({ rowIndex, message: 'Price is required', field: 'importPrice' })
    }

    if (rowData.categoryId === undefined || rowData.categoryId === null) {
      errors.push({ rowIndex, message: 'CategoryId is required', field: 'categoryId' })
    }

    if (rowData.sku !== undefined && rowData.sku !== null && rowData.sku !== '') {
      if (typeof rowData.sku !== 'string' || rowData.sku.length > 50) {
        errors.push({ rowIndex, message: 'SKU must be a string with maximum 50 characters', field: 'sku' })
      }
    }

    if (rowData.description !== undefined && rowData.description !== null && rowData.description !== '') {
      if (typeof rowData.description !== 'string' || rowData.description.length > 1000) {
        errors.push({ rowIndex, message: 'Description must be a string with maximum 1000 characters', field: 'description' })
      }
    }

    return errors
  }

  /**
   * Transforms and validates row data types, converting strings to appropriate types
   * @param rowData - Raw row data object from Excel parsing
   * @param rowIndex - Row index in the Excel file (1-based)
   * @returns Object containing transformed row data or validation errors
   */
  private static transformRowData(rowData: Record<string, any>, rowIndex: number): { row?: ExcelProductRow, errors: ExcelParseError[] } {
    const errors: ExcelParseError[] = []

    try {
      const importPrice = typeof rowData.importPrice === 'number'
        ? rowData.importPrice
        : parseFloat(rowData.importPrice)

      if (isNaN(importPrice) || importPrice < 0) {
        errors.push({ rowIndex, message: 'Price must be a valid positive number', field: 'importPrice' })
        return { errors }
      }

      const categoryId = typeof rowData.categoryId === 'number'
        ? rowData.categoryId
        : parseInt(rowData.categoryId, 10)

      if (isNaN(categoryId) || categoryId <= 0) {
        errors.push({ rowIndex, message: 'CategoryId must be a valid positive integer', field: 'categoryId' })
        return { errors }
      }

      const stock = rowData.stock !== undefined && rowData.stock !== null
        ? (typeof rowData.stock === 'number' ? rowData.stock : parseInt(rowData.stock, 10))
        : 0

      if (isNaN(stock) || stock < 0) {
        errors.push({ rowIndex, message: 'Stock must be a valid non-negative integer', field: 'stock' })
        return { errors }
      }

      let images: string[] | undefined
      if (rowData.images) {
        const imagesStr = typeof rowData.images === 'string' ? rowData.images : String(rowData.images)
        images = imagesStr.split(',')
          .map((url: string) => url.trim())
          .filter((url: string) => url.length > 0)

        const urlRegex = /^https?:\/\/.+\..+/
        const invalidUrls = images.filter(url => !urlRegex.test(url))
        if (invalidUrls.length > 0) {
          errors.push({
            rowIndex,
            message: `Invalid image URLs: ${invalidUrls.join(', ')}`,
            field: 'images'
          })
          return { errors }
        }
      }

      const row: ExcelProductRow = {
        rowIndex,
        sku: rowData.sku || undefined,
        name: rowData.name.trim(),
        description: rowData.description ? rowData.description.trim() : undefined,
        importPrice,
        categoryId,
        stock,
        images
      }

      return { row, errors }
    } catch (error) {
      errors.push({
        rowIndex,
        message: `Failed to transform row data: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      return { errors }
    }
  }
}
