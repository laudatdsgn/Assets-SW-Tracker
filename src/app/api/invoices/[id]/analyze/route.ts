import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, invoices } from "@/lib/db"
import { eq } from "drizzle-orm"
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
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.id),
      with: {
        cloudStorage: true,
      },
    })

    if (!invoice || invoice.cloudStorage?.userId !== session.user.id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // Mark as processing
    await db.update(invoices).set({
      status: "PROCESSING",
      updatedAt: new Date(),
    }).where(eq(invoices.id, params.id))

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
    await db.update(invoices).set({
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
      rawExtractedData: JSON.stringify(result),
      status: "NEW", // Back to NEW for user review
      updatedAt: new Date(),
    }).where(eq(invoices.id, params.id))

    const updatedInvoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, params.id),
    })

    return NextResponse.json({
      invoice: updatedInvoice,
      extraction: result,
    })
  } catch (error) {
    console.error("Error analyzing invoice:", error)

    // Mark as error
    await db.update(invoices).set({
      status: "ERROR",
      updatedAt: new Date(),
    }).where(eq(invoices.id, params.id))

    return NextResponse.json(
      { error: "Failed to analyze invoice" },
      { status: 500 }
    )
  }
}
