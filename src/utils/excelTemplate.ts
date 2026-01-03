import ExcelJS from 'exceljs'

export interface CategoryData {
  categoryId: number
  name: string
  description?: string
}

export interface TemplateResult {
  fileBase64: string
  filename: string
  mimeType: string
}

export class ExcelTemplateGenerator {
  private static readonly TEMPLATE_FILENAME = 'product_template.xlsx'
  private static readonly MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  private static readonly HEADERS = ['sku', 'name', 'description', 'price', 'categoryId', 'stock', 'images']

  private static readonly HEADER_COMMENTS = {
    sku: 'Optional. Max 50 characters. Allowed: letters, numbers, hyphen, underscore.',
    name: 'Required. Product name. Max 200 characters.',
    description: 'Optional. Product description. Max 1000 characters.',
    price: 'Required. Product price. Must be a number greater than 0.',
    categoryId: 'Required. Choose from dropdown list. Category ID (integer).',
    stock: 'Optional. Stock quantity. Integer >= 0 (default 0).',
    images: 'Optional. Comma-separated image URLs. Format: https://...'
  }

  /**
   * Generates an Excel template file for bulk product import
   * @param categories - Array of available categories for dropdown population
   * @returns Template file as base64 with filename and mime type
   */
  static async generateProductTemplate(categories: CategoryData[] = []): Promise<TemplateResult> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'My Shop Backend'
    workbook.created = new Date()

    this.createInstructionsSheet(workbook, categories)

    const categoryIds = categories.length > 0 ? categories.map(cat => cat.categoryId) : []

    this.createTemplateSheet(workbook, categoryIds)

    const buffer = await workbook.xlsx.writeBuffer() as unknown as Buffer
    const base64 = buffer.toString('base64')

    return {
      fileBase64: base64,
      filename: this.TEMPLATE_FILENAME,
      mimeType: this.MIME_TYPE
    }
  }

  /**
   * Creates the Instructions sheet with usage guidelines and column descriptions
   * @param workbook - Excel workbook instance
   * @param categories - Available categories to display
   */
  private static createInstructionsSheet(workbook: ExcelJS.Workbook, categories: CategoryData[]): void {
    const instructionsSheet = workbook.addWorksheet('Instructions')

    const titleRow = instructionsSheet.getRow(1)
    titleRow.getCell(1).value = 'Product Import Template - Instructions'
    titleRow.font = { size: 16, bold: true }
    instructionsSheet.mergeCells('A1:G1')

    instructionsSheet.getRow(3).getCell(1).value = 'How to use this template:'
    instructionsSheet.getRow(3).font = { bold: true }

    instructionsSheet.getRow(4).getCell(1).value = '1. Go to the "Template" sheet to fill in your product data.'
    instructionsSheet.getRow(5).getCell(1).value = '2. Do NOT modify the header row (row 1) in the Template sheet.'
    instructionsSheet.getRow(6).getCell(1).value = '3. Start entering data from row 2 onwards.'
    instructionsSheet.getRow(7).getCell(1).value = '4. Save the file and upload it using the bulk import feature.'

    instructionsSheet.getRow(9).getCell(1).value = 'Column Descriptions:'
    instructionsSheet.getRow(9).font = { bold: true }

    const descriptions = [
      ['sku', 'Optional. If provided, max 50 characters. Allowed characters: letters, numbers, hyphen, underscore.'],
      ['name', 'Required. Product name. Max 200 characters.'],
      ['description', 'Optional. Product description. Max 1000 characters.'],
      ['price', 'Required. Product price. Must be a number greater than 0.'],
      ['categoryId', 'Required. Choose from dropdown in Template sheet. Must be a valid category ID.'],
      ['stock', 'Optional. Stock quantity. Integer >= 0. Leave empty for default (0).'],
      ['images', 'Optional. Comma-separated image URLs. Format: https://example.com/image.jpg']
    ]

    descriptions.forEach((desc, index) => {
      const row = instructionsSheet.getRow(10 + index)
      row.getCell(1).value = desc[0]
      row.getCell(2).value = desc[1]
      row.getCell(1).font = { bold: true }
      instructionsSheet.mergeCells(`B${10 + index}:G${10 + index}`)
    })

    const categoryStartRow = 10 + descriptions.length + 2
    instructionsSheet.getRow(categoryStartRow).getCell(1).value = 'Available Categories:'
    instructionsSheet.getRow(categoryStartRow).font = { bold: true }

    if (categories.length > 0) {
      categories.forEach((cat, index) => {
        const row = instructionsSheet.getRow(categoryStartRow + 1 + index)
        row.getCell(1).value = cat.categoryId
        row.getCell(2).value = cat.name
        row.getCell(3).value = cat.description || ''
        row.getCell(1).font = { bold: true }
      })
    } else {
      instructionsSheet.getRow(categoryStartRow + 1).getCell(1).value = 'No categories available. Please create categories first.'
      instructionsSheet.getRow(categoryStartRow + 1).font = { italic: true, color: { argb: 'FFFF0000' } }
    }

    const exampleStartRow = categoryStartRow + categories.length + 3
    instructionsSheet.getRow(exampleStartRow).getCell(1).value = 'Example Row:'
    instructionsSheet.getRow(exampleStartRow).font = { bold: true }

    const exampleData = ['PROD001', 'Sample Product', 'This is a sample product description', 100000, categories.length > 0 ? categories[0].categoryId : 'N/A', 10, 'https://example.com/image1.jpg,https://example.com/image2.jpg']

    exampleData.forEach((data, index) => {
      instructionsSheet.getRow(exampleStartRow + 1).getCell(index + 1).value = data
    })

    instructionsSheet.columns = [
      { width: 15 },
      { width: 60 },
      { width: 30 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 20 }
    ]

    const exampleRow = instructionsSheet.getRow(exampleStartRow + 1)
    for (let i = 1; i <= 7; i++) {
      exampleRow.getCell(i).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }
  }

  /**
   * Creates the Template sheet with headers, sample data, and formatting
   * @param workbook - Excel workbook instance
   * @param categoryIds - Array of category IDs for reference
   */
  private static createTemplateSheet(workbook: ExcelJS.Workbook, categoryIds: number[]): void {
    const templateSheet = workbook.addWorksheet('Template')

    const headerRow = templateSheet.getRow(1)
    this.HEADERS.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1)
      cell.value = header
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6FA' }
      }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }

      const comment = this.HEADER_COMMENTS[header as keyof typeof this.HEADER_COMMENTS]
      if (comment) {
        cell.note = comment
      }
    })

    const sampleRow = templateSheet.getRow(2)
    const sampleData = ['PROD001', 'Sample Product Name', 'Sample description for the product', 100000, categoryIds.length > 0 ? categoryIds[0] : '', 10, 'https://example.com/image1.jpg,https://example.com/image2.jpg']

    sampleData.forEach((data, index) => {
      const cell = sampleRow.getCell(index + 1)
      cell.value = data
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    templateSheet.columns = [
      { width: 15 },
      { width: 30 },
      { width: 40 },
      { width: 12 },
      { width: 15 },
      { width: 10 },
      { width: 50 }
    ]

    templateSheet.views = [{ state: 'frozen', ySplit: 1 }]

    this.addDataValidations(templateSheet, categoryIds)
  }

  /**
   * Adds data validations to the template sheet (placeholder for future implementation)
   * @param templateSheet - Template worksheet instance
   * @param categoryIds - Array of category IDs (unused in current implementation)
   */
  private static addDataValidations(templateSheet: ExcelJS.Worksheet, categoryIds: number[]): void {
  }
}
