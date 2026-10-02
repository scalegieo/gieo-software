import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Building2, DollarSign, CheckCircle2, Circle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useStore } from '@/store/useStore'
import { useWorkspace } from '@/hooks/useWorkspace'
import { LEAD_STAGES, type Lead, type LeadStage, formatCurrency } from '@/lib/types'
import { cn } from '@/lib/utils'

function LeadCard({ lead, isOverlay = false }: { lead: Lead; isOverlay?: boolean }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-md border border-zinc-800 bg-zinc-950 p-3 cursor-grab active:cursor-grabbing',
        isOverlay && 'shadow-xl ring-1 ring-zinc-500/40 rotate-1',
        isDragging && !isOverlay && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{lead.name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.company}</span>
          </div>
        </div>
        <button
          className="text-zinc-600 hover:text-zinc-400 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-zinc-300">
        <DollarSign className="h-3 w-3" />
        {formatCurrency(lead.value)}
      </div>
    </div>
  )
}

function KanbanColumn({ stage, leads }: { stage: LeadStage; leads: Lead[] }): JSX.Element {
  const stageConfig = LEAD_STAGES.find((s) => s.id === stage)!
  const columnLeads = leads.filter((l) => l.stage === stage)
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-lg p-1 transition-colors',
        isOver && 'bg-zinc-900/80 ring-1 ring-zinc-500/40'
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-[10px] border', stageConfig.color)}>
            {stageConfig.label}
          </Badge>
          <span className="text-xs text-zinc-500">{columnLeads.length}</span>
        </div>
      </div>
      <SortableContext items={columnLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2 min-h-[200px]">
            {columnLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </ScrollArea>
      </SortableContext>
    </div>
  )
}

function OnboardingPanel({ lead }: { lead: Lead }): JSX.Element {
  const toggleOnboardingItem = useStore((s) => s.toggleOnboardingItem)
  const completed = lead.onboarding_checklist?.filter((i) => i.completed).length ?? 0
  const total = lead.onboarding_checklist?.length ?? 0

  return (
    <Card className="mt-4 bg-zinc-900/50 border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-zinc-200" />
          Onboarding Checklist — {lead.company}
        </CardTitle>
        <p className="text-xs text-zinc-500">{completed}/{total} completed</p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {lead.onboarding_checklist?.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleOnboardingItem(lead.id, item.id)}
            className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-zinc-800/50 transition-colors"
          >
            {item.completed ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-zinc-200 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-zinc-600 mt-0.5" />
            )}
            <span className={cn('text-sm', item.completed && 'line-through text-zinc-500')}>
              {item.label}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

export function CRM(): JSX.Element {
  const { leads } = useWorkspace()
  const updateLeadStage = useStore((s) => s.updateLeadStage)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  const wonLeads = leads.filter((l) => l.stage === 'won' && l.onboarding_checklist)

  const handleDragStart = (event: DragStartEvent): void => {
    const lead = leads.find((l) => l.id === event.active.id)
    if (lead) setActiveLead(lead)
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    let targetStage: LeadStage | null = null

    if (LEAD_STAGES.some((s) => s.id === over.id)) {
      targetStage = over.id as LeadStage
    } else {
      const overLead = leads.find((l) => l.id === over.id)
      if (overLead) targetStage = overLead.stage
    }

    if (targetStage && targetStage !== lead.stage) {
      void updateLeadStage(leadId, targetStage)
    }
  }

  return (
    <div className="relative z-10 space-y-4 h-full flex flex-col">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">CRM Pipeline</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Drag leads across stages · Won triggers onboarding</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {LEAD_STAGES.map(({ id }) => (
            <KanbanColumn key={id} stage={id} leads={leads} />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {wonLeads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wonLeads.map((lead) => (
            <OnboardingPanel key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}
