import * as fs from 'fs'
import * as path from 'path'

interface GraphQLResponse {
  data: {
    productTemplate: {
      fileBase64: string
      filename: string
      mimeType: string
    }
  }
}

/**
 * Parses GraphQL response and saves the base64 file to disk
 * @param jsonResponse - Raw JSON string from GraphQL query response
 * @param outputPath - Optional custom output path for the file
 */
function saveTemplateFromResponse(jsonResponse: string, outputPath?: string): void {
  try {
    const response: GraphQLResponse = JSON.parse(jsonResponse)

    if (!response.data?.productTemplate) {
      throw new Error('Invalid response format: missing productTemplate data')
    }

    const { fileBase64, filename, mimeType } = response.data.productTemplate

    if (!fileBase64 || !filename) {
      throw new Error('Invalid response: missing fileBase64 or filename')
    }

    const buffer = Buffer.from(fileBase64, 'base64')

    const outputDir = outputPath || process.cwd()
    const filePath = path.join(outputDir, filename)

    fs.writeFileSync(filePath, buffer)

    console.log(`✅ File saved successfully!`)
    console.log(`📁 Path: ${filePath}`)
    console.log(`📄 Filename: ${filename}`)
    console.log(`📋 MIME Type: ${mimeType}`)
    console.log(`📏 Size: ${buffer.length} bytes`)

  } catch (error) {
    console.error('❌ Error processing file:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

// Example usage - replace with your actual GraphQL response
const exampleResponse = `{
  "data": {
    "productTemplate": {
      "fileBase64": "UEsDBBQAAAAIAG1Xa1YAAAAAAAAAAAAAAAALAAAAeGwt...",
      "filename": "product_template.xlsx",
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  }
}`

// Uncomment the line below to test with example response
// saveTemplateFromResponse(exampleResponse)

// For command line usage, you can run:
// npx ts-node test.ts <json-file-path> [output-path]

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log('Usage: npx ts-node test.ts <json-file-path> [output-path]')
    console.log('Example: npx ts-node test.ts response.json ./output/')
    process.exit(1)
  }

  const jsonFilePath = args[0]
  const outputPath = args[1]

  try {
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf-8')
    saveTemplateFromResponse(jsonContent, outputPath)
  } catch (error) {
    console.error('❌ Error reading JSON file:', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

export { saveTemplateFromResponse }
