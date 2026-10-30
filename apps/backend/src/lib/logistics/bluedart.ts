import { env } from "../../env.js"
import type { OrderDoc } from "../../db/schema.js"

export function isBlueDartConfigured(): boolean {
  return !!(env.BLUEDART_CUSTOMER_CODE && env.BLUEDART_LOGIN_ID && env.BLUEDART_LICENCE_KEY)
}

export interface BlueDartShipmentResult {
  success: boolean
  awb: string
  labelUrl?: string
  status: string
  destinationArea?: string
}

export async function createBlueDartShipment(order: OrderDoc): Promise<BlueDartShipmentResult> {
  if (!isBlueDartConfigured()) {
    const awb = `84${order.displayId}${Math.floor(100000 + Math.random() * 900000)}`
    return {
      success: true,
      awb,
      labelUrl: `/uploads/labels/bluedart_${awb}.pdf`,
      status: "Awaiting Dispatch Scan",
      destinationArea: order.shippingAddress.city,
    }
  }

  // BlueDart Waybill WebService endpoint
  const endpoint =
    env.BLUEDART_API_MODE === "production"
      ? "https://netconnect.bluedart.com/Ver1.10/ShippingAPI/WayBill/WayBillGeneration.svc/rest/GenerateWayBill"
      : "https://apigateway-sandbox.bluedart.com/stage/waybill/v1/GenerateWayBill"

  const payload = {
    Request: {
      Consignee: {
        ConsigneeName: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
        ConsigneeAddress1: order.shippingAddress.address1,
        ConsigneeAddress2: order.shippingAddress.address2 ?? "",
        ConsigneePincode: order.shippingAddress.postalCode,
        ConsigneeMobile: order.shippingAddress.phone ?? "9886000000",
      },
      Services: {
        ProductCode: order.paymentMethod === "cod" ? "A" : "E", // Domestic Priority / Apex
        ProductType: "Dox",
        PieceCount: order.items.reduce((acc, i) => acc + i.quantity, 0),
        ActualWeight: 0.5,
        CollectableAmount: order.paymentMethod === "cod" ? order.totals.total / 100 : 0,
      },
      Shipper: {
        CustomerCode: env.BLUEDART_CUSTOMER_CODE,
        LoginId: env.BLUEDART_LOGIN_ID,
        LicenceKey: env.BLUEDART_LICENCE_KEY,
      },
    },
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  const awb = data?.GenerateWayBillResult?.AWBNo
  if (!res.ok || !awb) {
    throw new Error(`BlueDart AWB generation failed: ${JSON.stringify(data)}`)
  }

  return {
    success: true,
    awb,
    status: "Manifest Generated",
    labelUrl: `/uploads/labels/bluedart_${awb}.pdf`,
    destinationArea: data?.GenerateWayBillResult?.DestinationArea,
  }
}

export async function trackBlueDartShipment(awb: string) {
  if (!isBlueDartConfigured()) {
    return {
      awb,
      status: "In Transit",
      expectedDelivery: new Date(Date.now() + 24 * 3600 * 1000).toLocaleDateString(),
      scans: [
        { time: new Date().toISOString(), status: "Arrived at destination delivery facility", location: "Koramangala Hub" },
        { time: new Date(Date.now() - 7200000).toISOString(), status: "In transit from BLR-FC1", location: "Bengaluru South" },
      ],
    }
  }

  // Production BlueDart tracking REST endpoint
  const endpoint = `https://api.bluedart.com/v1/tracking?handler=tnt&numbers=${encodeURIComponent(awb)}`
  const res = await fetch(endpoint, {
    headers: {
      LicenceKey: env.BLUEDART_LICENCE_KEY!,
      LoginId: env.BLUEDART_LOGIN_ID!,
    },
  })
  return res.json()
}
