import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "CZK"): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("cs-CZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

export function calculateMonthlyEquivalent(
  price: number,
  billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME"
): number {
  switch (billingPeriod) {
    case "MONTHLY":
      return price
    case "YEARLY":
      return price / 12
    case "ONE_TIME":
      return 0
  }
}

export function calculateYearlyTotal(
  price: number,
  billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME"
): number {
  switch (billingPeriod) {
    case "MONTHLY":
      return price * 12
    case "YEARLY":
      return price
    case "ONE_TIME":
      return 0
  }
}

export function calculateDepreciationEndDate(
  purchaseDate: Date,
  years: number
): Date {
  const endDate = new Date(purchaseDate)
  endDate.setFullYear(endDate.getFullYear() + years)
  return endDate
}

export function getDepreciationStatus(
  endDate: Date | null
): "active" | "ending_soon" | "ended" | "none" {
  if (!endDate) return "none"

  const now = new Date()
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

  if (endDate < now) return "ended"
  if (endDate < threeMonthsFromNow) return "ending_soon"
  return "active"
}
