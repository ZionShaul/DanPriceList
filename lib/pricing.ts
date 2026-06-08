// חישוב מדדי מחיר לחומר (סעיף 9) – מימוש זהה ל-RPC ב-SQL, לצורכי בדיקה/ולידציה.

export interface PricedPurchase {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PriceMetrics {
  low: number;
  high: number;
  weightedAvg: number;
  count: number;
  totalQuantity: number;
}

/**
 * נמוך = מחיר היחידה הנמוך ביותר.
 * גבוה = מחיר היחידה הגבוה ביותר.
 * ממוצע משוקלל = סך כל המחיר הכולל / סך כל הכמות.
 */
export function computePriceMetrics(rows: PricedPurchase[]): PriceMetrics | null {
  if (rows.length === 0) return null;
  let low = Infinity;
  let high = -Infinity;
  let sumTotal = 0;
  let sumQty = 0;
  for (const r of rows) {
    if (r.unitPrice < low) low = r.unitPrice;
    if (r.unitPrice > high) high = r.unitPrice;
    sumTotal += r.totalPrice;
    sumQty += r.quantity;
  }
  return {
    low,
    high,
    weightedAvg: sumQty > 0 ? sumTotal / sumQty : NaN,
    count: rows.length,
    totalQuantity: sumQty,
  };
}
