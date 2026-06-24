import { Plus, Minus, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { GIEO_USERS } from '@/lib/auth'
import { formatCompactCurrency } from '@/lib/types'

const METRIC_CONFIG = [
  { key: 'lovable_sites' as const, label: 'Lovable Sites', color: 'text-purple-400', roles: ['ops'] },
  { key: 'ads_created' as const, label: 'Ads Created', color: 'text-blue-400', roles: ['creative', 'sales'] },
  { key: 'ad_spend_managed' as const, label: 'Ad Spend Managed', color: 'text-amber-400', roles: ['media_buyer'] },
  { key: 'software_shipped' as const, label: 'Software Shipped', color: 'text-emerald-400', roles: ['admin', 'media_buyer'] }
]

export function TeamPerformance(): JSX.Element {
  const { teamMetrics, incrementTeamMetric } = useStore()

  return (
    <div className="relative z-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          Team Performance
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">Auto-tracked from completed tasks + manual adjustments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GIEO_USERS.map((user) => {
          const m = teamMetrics[user.profile.id] ?? {
            lovable_sites: 0, ads_created: 0, ad_spend_managed: 0, software_shipped: 0
          }
          return (
            <Card key={user.profile.id} className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{user.profile.name}</CardTitle>
                <CardDescription className="capitalize">{user.profile.role.replace('_', ' ')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {METRIC_CONFIG.map(({ key, label, color }) => {
                  const val = m[key]
                  const display = key === 'ad_spend_managed' ? formatCompactCurrency(val) : String(val)
                  return (
                    <div key={key} className="flex items-center justify-between rounded-md border border-zinc-800 px-3 py-2">
                      <div>
                        <p className="text-xs text-zinc-500">{label}</p>
                        <p className={`text-lg font-semibold ${color}`}>{display}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => incrementTeamMetric(user.profile.id, key, key === 'ad_spend_managed' ? 100000 : 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => incrementTeamMetric(user.profile.id, key, key === 'ad_spend_managed' ? -100000 : -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
