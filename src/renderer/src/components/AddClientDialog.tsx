import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { SERVICE_OPTIONS, BUSINESSES, type BusinessId } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddClientDialogProps {
  open: boolean
  onClose: () => void
  defaultBusiness?: BusinessId
}

export function AddClientDialog({ open, onClose, defaultBusiness = 'gieo' }: AddClientDialogProps): JSX.Element {
  const addClient = useStore((s) => s.addClient)
  const [business, setBusiness] = useState<BusinessId>(defaultBusiness)
  const [company, setCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mrr, setMrr] = useState('')
  const [services, setServices] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setBusiness(defaultBusiness)
  }, [open, defaultBusiness])

  const reset = (): void => {
    setCompany('')
    setContactName('')
    setEmail('')
    setPhone('')
    setMrr('')
    setServices([])
    setError(null)
  }

  const toggleService = (service: string): void => {
    setServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    )
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!company.trim()) {
      setError('Company name is required.')
      return
    }

    setSaving(true)
    setError(null)

    const mrrCents = Math.round(parseFloat(mrr || '0') * 100)
    const result = await addClient({
      company: company.trim(),
      name: contactName.trim() || company.trim(),
      mrr: Number.isFinite(mrrCents) ? mrrCents : 0,
      email: email.trim(),
      phone: phone.trim(),
      services,
      business
    })

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }

    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Creates client record + auto-generated profile for notes, calls, and services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Business</label>
            <div className="flex gap-2">
              {BUSINESSES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBusiness(b.id)}
                  className={cn(
                    'flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    business === b.id
                      ? 'border-violet-500/40 bg-violet-500/10 text-violet-200'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-zinc-500">Company *</label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Primary Contact</label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">MRR ($)</label>
              <Input type="number" min="0" step="100" value={mrr} onChange={(e) => setMrr(e.target.value)} placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@acme.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-500">Services Requested</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_OPTIONS.map((service) => (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs transition-colors',
                    services.includes(service)
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
