import type { Client, ClientProfile, Task } from '@/lib/types'
import { GIEO_USERS } from '@/lib/auth'

export interface TeamMemberLiveStats {
  userId: string
  name: string
  hoursThisMonth: number
  hoursAllTime: number
  tasksCompleted: number
  tasksOpen: number
  clientMrrManaged: number
}

function isThisMonth(isoDate: string): boolean {
  const d = new Date(isoDate)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function memberMatchesEntry(memberName: string, teamMember?: string): boolean {
  if (!teamMember?.trim()) return false
  return teamMember.trim().toLowerCase() === memberName.toLowerCase()
}

export function computeTeamLiveStats(
  clients: Client[],
  profiles: Record<string, ClientProfile>,
  tasks: Task[]
): TeamMemberLiveStats[] {
  return GIEO_USERS.map(({ profile }) => {
    let hoursThisMonth = 0
    let hoursAllTime = 0
    const clientIdsWithHours = new Set<string>()

    for (const [clientId, clientProfile] of Object.entries(profiles)) {
      for (const entry of clientProfile.time_entries ?? []) {
        if (!memberMatchesEntry(profile.name, entry.team_member)) continue
        hoursAllTime += entry.hours
        clientIdsWithHours.add(clientId)
        if (isThisMonth(entry.date)) {
          hoursThisMonth += entry.hours
        }
      }
    }

    const memberTasks = tasks.filter((t) => t.assignee_id === profile.id)
    const clientMrrManaged = clients
      .filter((c) => c.status === 'active' && clientIdsWithHours.has(c.id))
      .reduce((sum, c) => sum + c.mrr, 0)

    return {
      userId: profile.id,
      name: profile.name,
      hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
      hoursAllTime: Math.round(hoursAllTime * 10) / 10,
      tasksCompleted: memberTasks.filter((t) => t.status === 'done').length,
      tasksOpen: memberTasks.filter((t) => t.status !== 'done').length,
      clientMrrManaged
    }
  })
}
