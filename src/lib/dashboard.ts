import { callAdminApi } from './admin'

export type DashboardData = {
  metrics: { sellers:number; shops:number; activeShops:number; products:number; premium:number; free:number; customerInterests:number; premiumRevenue:number }
  payments: Array<{ id:string; amount:number; status:string; created_at:string; shop_id:string }>
  legacyPayments: Array<{ id:string; amount:number; status:string; created_at:string; shop_id:string }>
  latencyMs: number
  requestId: string
}

export function fetchDashboard() { return callAdminApi<DashboardData>('/api/admin/dashboard') }
