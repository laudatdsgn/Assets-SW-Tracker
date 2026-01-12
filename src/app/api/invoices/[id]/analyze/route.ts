import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeInvoice, analyzeInvoiceImage } from "@/lib/invoice-analysis"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify ownership
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        cloudStorage: { userId: session.user.id },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Mark as processing
    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "PROCESSING" },
    })

    // Get invoice content from request body
    const body = await request.json()
    const { content, mediaType } = body

    let result

    if (mediaType && mediaType.startsWith("image/")) {
      // Analyze image
      result = await analyzeInvoiceImage(content, mediaType, invoice.fileName)
    } else {
      // Analyze text
      result = await analyzeInvoice(content || "", invoice.fileName)
    }

    // Update invoice with extracted data
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        supplierName: result.supplierName,
        invoiceNumber: result.invoiceNumber,
        issueDate: result.issueDate ? new Date(result.issueDate) : null,
        taxableSupplyDate: result.taxableSupplyDate
          ? new Date(result.taxableSupplyDate)
          : null,
        totalPrice: result.totalPrice,
        currency: result.currency,
        hasVat: result.hasVat,
        extractionConfidence: result.confidence,
        rawExtractedData: result as any,
        status: "NEW", // Back to NEW for user review
      },
    })

    return NextResponse.json({
      invoice: updatedInvoice,
      extraction: result,
    })
  } catch (error) {
    console.error("Error analyzing invoice:", error)

    // Mark as error
    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: "ERROR" },
    })

    return NextResponse.json(
      { error: "Failed to analyze invoice" },
      { status: 500 }
    )
  }
}
