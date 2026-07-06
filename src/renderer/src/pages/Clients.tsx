import { useState, useEffect } from 'react'
import {
  ExternalLink,
  FileText,
  Upload,
  FolderOpen,
  Plus,
  DollarSign,
  UserCircle,
  Clock,
  CalendarClock
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClientProfilePanel } from '@/components/ClientProfilePanel'
import { ClientHoursBillingPanel } from '@/components/ClientHoursBillingPanel'
import { AddClientDialog } from '@/components/AddClientDialog'
import { useStore } from '@/store/useStore'
import { formatCurrency, slugify } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import { getTotalHours, computeNextBillingDate, getBillingReminder } from '@/lib/retainerBilling'
import type { Client } from '@/lib/types'

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'pending' | 'secondary' {
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'pending' | 'secondary'> = {
    active: 'success',
    approved: 'success',
    paid: 'success',
    pending: 'pending',
    revision: 'warning',
    paused: 'secondary',
    churned: 'destructive'
  }
  return map[status] ?? 'secondary'
}

function ClientDetailDialog({
  client,
  open,
  onClose
}: {
  client: Client | null
  open: boolean
  onClose: () => void
}): JSX.Element | null {
  const { campaigns, financials, tasks, getClientProfile, syncStripePayments, createStripePaymentLink } = useStore()
  const [localFiles, setLocalFiles] = useState<string[]>([])
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [stripeStatus, setStripeStatus] = useState<string | null>(null)
  const [stripeConfigured, setStripeConfigured] = useState(false)

  const clientCampaigns = campaigns.filter((c) => c.client_id === client?.id)
  const clientFinancials = financials.filter((f) => f.client_id === client?.id)
  const clientTasks = tasks.filter((t) => t.client_id === client?.id)
  const clientSlug = slugify(client?.company ?? client?.name ?? 'client')
  const profile = client ? getClientProfile(client.id) : null

  useEffect(() => {
    if (open && window.gieo?.getStripeStatus) {
      void window.gieo.getStripeStatus().then((s) => setStripeConfigured(s.configured))
    }
  }, [open])

  useEffect(() => {
    if (open && client && window.gieo) {
      void window.gieo.listLocalFiles('Active').then((result) => {
        if (result.success && result.files) {
          setLocalFiles(result.files.filter((f) => f.includes(clientSlug) || f.startsWith(clientSlug)))
        }
      })
    }
  }, [open, client, clientSlug])

  const handleStripeSync = async (): Promise<void> => {
    setStripeStatus('Syncing from Stripe…')
    const result = await syncStripePayments()
    if (result.error) {
      setStripeStatus(result.error)
    } else {
      setStripeStatus(`Synced ${result.count ?? 0} invoice(s) from Stripe`)
    }
  }

  const handleCreatePaymentLink = async (): Promise<void> => {
    if (!client) return
    setStripeStatus('Creating payment link…')
    const result = await createStripePaymentLink(client.id)
    if (result.error) {
      setStripeStatus(result.error)
    } else if (result.url) {
      setStripeStatus('Payment link created — opening in browser')
      window.open(result.url, '_blank')
    }
  }

  const handleUpload = async (): Promise<void> => {
    if (!window.gieo || !client) return
    setUploadStatus('Uploading...')
    const result = await window.gieo.pickAndSaveFile(clientSlug)
    if (result.success) {
      setUploadStatus(`Saved: ${result.fileName}`)
      setLocalFiles((prev) => [...prev, result.fileName ?? ''])
    } else if (result.canceled) {
      setUploadStatus(null)
    } else {
      setUploadStatus(`Error: ${result.error}`)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{client.company ?? client.name}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2">
            <span>MRR {formatCurrency(client.mrr)}</span>
            <Badge variant={statusVariant(client.status)} className="capitalize">{client.status}</Badge>
            {profile && (
              <>
                <span className="text-zinc-500">· {getTotalHours(profile).toFixed(1)}h logged</span>
                {profile.retainer_schedule?.enabled && (
                  <span className="text-zinc-500">
                    · Next bill {formatDate(computeNextBillingDate(profile.retainer_schedule).toISOString())}
                  </span>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hours-billing">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="hours-billing" className="gap-1">
              <Clock className="h-3.5 w-3.5" /> Hours & Billing
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-1">
              <UserCircle className="h-3.5 w-3.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="meta-ads">Meta Ads</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="local-files">Local Files</TabsTrigger>
          </TabsList>

          <TabsContent value="hours-billing">
            <ScrollArea className="h-[min(560px,65vh)]">
              <ClientHoursBillingPanel client={client} />
            </ScrollArea>
          </TabsContent>

          <TabsContent value="profile">
            <ClientProfilePanel client={client} />
          </TabsContent>

          <TabsContent value="financials">
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void handleStripeSync()}
                disabled={!stripeConfigured}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Sync Stripe Invoices
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => void handleCreatePaymentLink()}
                disabled={!stripeConfigured}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Create Payment Link
              </Button>
            </div>
            {!stripeConfigured && (
              <p className="text-xs text-amber-400 mb-3 border border-amber-500/20 bg-amber-500/10 rounded-md px-3 py-2">
                Add your Stripe secret key in <code className="text-amber-200">src/main/gieo-config.ts</code> (sk_test_… or sk_live_…) to manage real payments.
              </p>
            )}
            {stripeStatus && (
              <p className="text-xs text-zinc-400 mb-3">{stripeStatus}</p>
            )}
            <ScrollArea className="h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="text-left py-2 font-medium">Invoice</th>
                    <th className="text-left py-2 font-medium">Amount</th>
                    <th className="text-left py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientFinancials.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-zinc-500">No financial records — sync from Stripe or add manually</td>
                    </tr>
                  ) : (
                    clientFinancials.map((fin) => (
                      <tr key={fin.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2.5">
                          {fin.hosted_invoice_url ? (
                            <a
                              href={fin.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-zinc-200 hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5 text-zinc-500" />
                              Stripe Invoice
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-2 truncate max-w-[200px]">
                              <FileText className="h-3.5 w-3.5 text-zinc-500" />
                              {fin.invoice_path}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-zinc-100">{formatCurrency(fin.amount)}</td>
                        <td className="py-2.5">
                          <Badge variant={statusVariant(fin.status)} className="capitalize">{fin.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="meta-ads">
            <ScrollArea className="h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="text-left py-2 font-medium">Ad URL</th>
                    <th className="text-left py-2 font-medium">Spend</th>
                    <th className="text-left py-2 font-medium">ROAS</th>
                    <th className="text-left py-2 font-medium">Creative</th>
                  </tr>
                </thead>
                <tbody>
                  {clientCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">No campaigns tracked</td>
                    </tr>
                  ) : (
                    clientCampaigns.map((camp) => (
                      <tr key={camp.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="py-2.5">
                          <a
                            href={camp.ad_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-zinc-200 hover:underline truncate max-w-[180px]"
                          >
                            View Ad <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </td>
                        <td className="py-2.5">{formatCurrency(camp.spend)}</td>
                        <td className="py-2.5">
                          <span className={cn(
                            camp.roas >= 3 ? 'text-emerald-400' : camp.roas >= 2 ? 'text-amber-400' : 'text-red-400'
                          )}>
                            {camp.roas.toFixed(1)}x
                          </span>
                        </td>
                        <td className="py-2.5">
                          <Badge variant={statusVariant(camp.status)} className="capitalize">{camp.status}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks">
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {clientTasks.length === 0 ? (
                  <p className="py-8 text-center text-zinc-500 text-sm">No tasks assigned</p>
                ) : (
                  clientTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-zinc-800/50">
                      <div>
                        <p className="text-sm">{task.title}</p>
                        <p className="text-xs text-zinc-500">Due {formatDate(task.due_date)}</p>
                      </div>
                      <Badge variant={statusVariant(task.status)} className="capitalize">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="local-files">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => void handleUpload()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Contract / Invoice
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void window.gieo?.getDataPaths().then((paths) => {
                    setUploadStatus(`Storage: ${paths.active}`)
                  })}
                  className="gap-1.5"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Show Path
                </Button>
              </div>
              {uploadStatus && <p className="text-xs text-zinc-400">{uploadStatus}</p>}
              <ScrollArea className="h-48 rounded-md border border-zinc-800 p-3">
                {localFiles.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-6">
                    No local files yet. Upload to ~/GIEO_Data/Active/{clientSlug}/
                  </p>
                ) : (
                  localFiles.map((file) => (
                    <div key={file} className="flex items-center gap-2 py-1.5 text-sm">
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      {file}
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export function Clients(): JSX.Element {
  const { clients, clientProfiles, getClientProfile, setActiveClient } = useStore()
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const openClient = (client: Client): void => {
    getClientProfile(client.id)
    setSelectedClient(client)
    setActiveClient(client.id)
    setDialogOpen(true)
  }

  return (
    <div className="relative z-10 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Client Hub</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {clients.length} accounts · {clients.filter((c) => c.status === 'active').length} active · hours & retainer billing
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add Client
        </Button>
      </div>

      <Card className="bg-zinc-900/50 overflow-hidden border-zinc-800">
        <ScrollArea className="w-full">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Client</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">MRR</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider hidden md:table-cell">Services</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider hidden md:table-cell">Hours</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider hidden lg:table-cell">Next bill</th>
                <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const cp = clientProfiles[client.id] ?? getClientProfile(client.id)
                const billReminder = cp ? getBillingReminder(client, cp) : null
                return (
                  <tr
                    key={client.id}
                    onClick={() => openClient(client)}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{client.company ?? client.name}</p>
                        <p className="text-xs text-zinc-500">{cp?.primary_contact || client.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-zinc-100">
                        <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
                        {formatCurrency(client.mrr)}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {cp?.services.slice(0, 2).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px] font-normal">{s.split(' ')[0]}</Badge>
                        ))}
                        {(cp?.services.length ?? 0) > 2 && (
                          <Badge variant="secondary" className="text-[10px]">+{(cp?.services.length ?? 0) - 2}</Badge>
                        )}
                        {!cp?.services.length && <span className="text-zinc-600 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-zinc-300 tabular-nums">
                        <Clock className="h-3.5 w-3.5 text-zinc-500" />
                        {cp ? `${getTotalHours(cp).toFixed(1)}h` : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      {cp?.retainer_schedule?.enabled ? (
                        <div className="flex items-center gap-1 text-xs">
                          <CalendarClock className={cn('h-3.5 w-3.5', billReminder ? 'text-amber-400' : 'text-zinc-500')} />
                          <span className={cn(billReminder?.isOverdue && 'text-red-400', billReminder?.isReminderWindow && 'text-amber-400')}>
                            {formatDate(computeNextBillingDate(cp.retainer_schedule).toISOString())}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(client.status)} className="capitalize">{client.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </ScrollArea>
      </Card>

      <ClientDetailDialog
        client={selectedClient}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setActiveClient(null)
        }}
      />

      <AddClientDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
