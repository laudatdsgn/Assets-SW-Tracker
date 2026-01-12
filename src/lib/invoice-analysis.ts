import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface InvoiceExtractionResult {
  supplierName: string | null
  invoiceNumber: string | null
  issueDate: string | null
  taxableSupplyDate: string | null
  totalPrice: number | null
  currency: string | null
  hasVat: boolean | null
  suggestedType: "asset" | "software" | null
  suggestedCategory: string | null
  suggestedName: string | null
  confidence: number
}

export async function analyzeInvoice(
  fileContent: string,
  fileName: string
): Promise<InvoiceExtractionResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this invoice document and extract the following information. Return your response as JSON.

File name: ${fileName}

Document content:
${fileContent}

Extract:
1. supplierName - The vendor/supplier company name
2. invoiceNumber - The invoice number/ID
3. issueDate - Date of issue (ISO format YYYY-MM-DD)
4. taxableSupplyDate - Date of taxable supply if different from issue date (ISO format)
5. totalPrice - Total amount as a number (without currency symbol)
6. currency - Currency code (CZK, EUR, USD, etc.)
7. hasVat - Whether VAT is included (boolean)
8. suggestedType - Is this likely an "asset" (physical item, one-time purchase) or "software" (subscription, SaaS, hosting, domain)?
9. suggestedCategory - Suggested category based on content:
   - For assets: COMPUTER, MONITOR, PHONE, CAMERA, EQUIPMENT, FURNITURE, SOFTWARE_LICENSE, VEHICLE, OTHER
   - For software: SAAS, HOSTING, DOMAIN, AI_TOOLS, DEVELOPMENT, DESIGN, PRODUCTIVITY, COMMUNICATION, STORAGE, SECURITY, OTHER
10. suggestedName - A short, clear name for the item based on invoice content
11. confidence - Your confidence in the extraction (0.0 to 1.0)

Return ONLY valid JSON, no other text:
{
  "supplierName": string | null,
  "invoiceNumber": string | null,
  "issueDate": string | null,
  "taxableSupplyDate": string | null,
  "totalPrice": number | null,
  "currency": string | null,
  "hasVat": boolean | null,
  "suggestedType": "asset" | "software" | null,
  "suggestedCategory": string | null,
  "suggestedName": string | null,
  "confidence": number
}`,
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }

    // Parse the JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response")
    }

    const result = JSON.parse(jsonMatch[0]) as InvoiceExtractionResult
    return result
  } catch (error) {
    console.error("Error analyzing invoice:", error)
    return {
      supplierName: null,
      invoiceNumber: null,
      issueDate: null,
      taxableSupplyDate: null,
      totalPrice: null,
      currency: null,
      hasVat: null,
      suggestedType: null,
      suggestedCategory: null,
      suggestedName: null,
      confidence: 0,
    }
  }
}

export async function analyzeInvoiceImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  fileName: string
): Promise<InvoiceExtractionResult> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyze this invoice image and extract the following information. Return your response as JSON.

File name: ${fileName}

Extract:
1. supplierName - The vendor/supplier company name
2. invoiceNumber - The invoice number/ID
3. issueDate - Date of issue (ISO format YYYY-MM-DD)
4. taxableSupplyDate - Date of taxable supply if different from issue date (ISO format)
5. totalPrice - Total amount as a number (without currency symbol)
6. currency - Currency code (CZK, EUR, USD, etc.)
7. hasVat - Whether VAT is included (boolean)
8. suggestedType - Is this likely an "asset" (physical item, one-time purchase) or "software" (subscription, SaaS, hosting, domain)?
9. suggestedCategory - Suggested category based on content
10. suggestedName - A short, clear name for the item
11. confidence - Your confidence in the extraction (0.0 to 1.0)

Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === "text")
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude")
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from response")
    }

    return JSON.parse(jsonMatch[0]) as InvoiceExtractionResult
  } catch (error) {
    console.error("Error analyzing invoice image:", error)
    return {
      supplierName: null,
      invoiceNumber: null,
      issueDate: null,
      taxableSupplyDate: null,
      totalPrice: null,
      currency: null,
      hasVat: null,
      suggestedType: null,
      suggestedCategory: null,
      suggestedName: null,
      confidence: 0,
    }
  }
}
