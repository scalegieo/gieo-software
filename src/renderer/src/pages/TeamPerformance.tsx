import { Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useStore } from '@/store/useStore'
import { computeTeamLiveStats } from '@/lib/teamStats'
import { formatCompactCurrency } from '@/lib/types'

export function TeamPerformance(): JSX.Element {
  const { clients, clientProfiles, tasks } = useStore()
  const stats = computeTeamLiveStats(clients, clientProfiles, tasks)

  return (
    <div className="relative z-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          Team Performance
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          Live stats from logged client hours and completed tasks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stats.map((member) => (
          <Card key={member.userId} className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{member.name}</CardTitle>
              <CardDescription>
                {member.clientMrrManaged > 0
                  ? `${formatCompactCurrency(member.clientMrrManaged)} MRR on accounts with logged hours`
                  : 'Log hours on clients to track MRR managed'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Hours this month', value: `${member.hoursThisMonth}h`, color: 'text-sky-400' },
                  { label: 'Hours all-time', value: `${member.hoursAllTime}h`, color: 'text-zinc-100' },
                  { label: 'Tasks done', value: String(member.tasksCompleted), color: 'text-emerald-400' },
                  { label: 'Tasks open', value: String(member.tasksOpen), color: 'text-amber-400' }
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-md border border-zinc-800 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
                    <p className={`text-lg font-semibold tabular-nums mt-0.5 ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
