import { useState, useEffect, useCallback } from 'react'
import { Phone, Mail, Plus, UserPlus, ExternalLink, RefreshCw, Sheet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStore } from '@/store/useStore'
import { CONFIG } from '@/lib/config'

export function LeadSheet(): JSX.Element {
  const { scrapedLeads, updateScrapedLead, addScrapedLead, convertScrapedLeadToClient, syncLeadSheetFromGoogle } = useStore()
  const [convertId, setConvertId] = useState<string | null>(null)
  const [mrrInput, setMrrInput] = useState('5000')
  const [addOpen, setAddOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({ name: '', company: '', phone: '', email: '', source: 'Manual', notes: '' })

  const runSync = useCallback(async () => {
    setSyncing(true)
    setSyncError(null)
    const result = await syncLeadSheetFromGoogle()
    setSyncing(false)
    if (result.error) {
      setSyncError(result.error)
    } else {
      setLastSync(new Date().toLocaleTimeString())
      if (result.imported > 0) {
        setSyncError(null)
      }
    }
  }, [syncLeadSheetFromGoogle])

  useEffect(() => {
    void runSync()
    const interval = setInterval(() => void runSync(), 60_000)
    return () => clearInterval(interval)
  }, [runSync])

  const handleConvert = async (): Promise<void> => {
    if (!convertId) return
    const mrr = Math.round(parseFloat(mrrInput) * 100)
    await convertScrapedLeadToClient(convertId, mrr)
    setConvertId(null)
  }

  const statusColor = (s: string): 'secondary' | 'success' | 'warning' | 'destructive' | 'pending' => {
    const map: Record<string, 'secondary' | 'success' | 'warning' | 'destructive' | 'pending'> = {
      new: 'pending', contacted: 'warning', qualified: 'secondary', converted: 'success', dead: 'destructive'
    }
    return map[s] ?? 'secondary'
  }

  return (
    <div className="relative z-10 space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Sheet className="h-5 w-5" />
            Lead Sheet
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Live Google Sheets scraper · auto-syncs every 60s
            {lastSync && <span className="text-zinc-600"> · Last sync {lastSync}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void runSync()} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(CONFIG.googleSheets.editUrl, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open Sheet
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </Button>
        </div>
      </div>

      {syncError && (
        <p className="text-xs text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-md px-3 py-2">{syncError}</p>
      )}

      <Tabs defaultValue="sheet" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="sheet">Google Sheet</TabsTrigger>
          <TabsTrigger value="crm">CRM Leads ({scrapedLeads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sheet" className="flex-1 min-h-0 mt-3">
          <Card className="h-[calc(100vh-220px)] min-h-[400px] bg-zinc-900/50 border-zinc-800 overflow-hidden p-0">
            <iframe
              title="GIEO Lead Scraper Sheet"
              src={CONFIG.googleSheets.embedUrl}
              className="h-full w-full border-0 bg-white"
              allowFullScreen
            />
          </Card>
        </TabsContent>

        <TabsContent value="crm" className="flex-1 min-h-0 mt-3">
          <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-220px)] min-h-[400px] w-full">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-950 z-10">
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-zinc-500 font-medium">Lead</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-zinc-500 font-medium">Contact</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-zinc-500 font-medium hidden md:table-cell">Source</th>
                    <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-zinc-500 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-zinc-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scrapedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">
                        No leads synced yet. Add rows to your Google Sheet or click Sync Now.
                      </td>
                    </tr>
                  ) : (
                    scrapedLeads.map((lead) => (
                      <tr key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-3 px-4">
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-zinc-500">{lead.company}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-0.5 text-xs">
                            {lead.phone && <span className="flex items-center gap-1 text-zinc-300"><Phone className="h-3 w-3" />{lead.phone}</span>}
                            {lead.email && <span className="flex items-center gap-1 text-zinc-400"><Mail className="h-3 w-3" />{lead.email}</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-zinc-400 text-xs">{lead.source}</td>
                        <td className="py-3 px-4">
                          <Badge variant={statusColor(lead.status)} className="capitalize text-[10px]">{lead.status}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1">
                            {lead.status !== 'converted' && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateScrapedLead(lead.id, { status: 'contacted' })}>
                                  Called
                                </Button>
                                <Button size="sm" className="h-7 text-xs gap-1" onClick={() => { setConvertId(lead.id); setMrrInput('5000') }}>
                                  <UserPlus className="h-3 w-3" />
                                  Client
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!convertId} onOpenChange={() => setConvertId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Convert to Client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-zinc-500">Monthly Retainer ($)</label>
              <Input type="number" value={mrrInput} onChange={(e) => setMrrInput(e.target.value)} />
            </div>
            <Button className="w-full gap-1" onClick={() => void handleConvert()}>
              <ExternalLink className="h-3.5 w-3.5" />
              Create Client + Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="Name" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} />
            <Input placeholder="Company" value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} />
            <Input placeholder="Phone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
            <Input placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
            <Input placeholder="Notes" value={newLead.notes} onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })} />
            <Button onClick={() => {
              addScrapedLead({ ...newLead, status: 'new' })
              setAddOpen(false)
              setNewLead({ name: '', company: '', phone: '', email: '', source: 'Manual', notes: '' })
            }}>Add Lead</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
