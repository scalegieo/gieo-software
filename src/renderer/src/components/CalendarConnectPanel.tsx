import { Calendar, Link2, Unlink, Loader2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { CalendarConnectionStatus } from '@/lib/calendarTypes'

interface CalendarConnectPanelProps {
  status: CalendarConnectionStatus | null
  onConnectGoogle: () => Promise<{ success: boolean; error?: string }>
  onDisconnectGoogle: () => Promise<void>
  onConnectCalendly: (token: string) => Promise<{ success: boolean; error?: string }>
  onDisconnectCalendly: () => Promise<void>
}

export function CalendarConnectPanel({
  status,
  onConnectGoogle,
  onDisconnectGoogle,
  onConnectCalendly,
  onDisconnectCalendly
}: CalendarConnectPanelProps): JSX.Element {
  const [calendlyToken, setCalendlyToken] = useState('')
  const [busy, setBusy] = useState<'google' | 'calendly' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const googleConnected = status?.google.connected
  const calendlyConnected = status?.calendly.connected

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="liquid-glass-panel border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-400" />
            Google Calendar
          </CardTitle>
          <CardDescription className="text-xs">
            Sign in with Google — shows your primary calendar in GIEO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {googleConnected ? (
            <>
              <p className="text-xs text-emerald-400">Connected · {status?.google.email}</p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void onDisconnectGoogle()}
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </>
          ) : (
            <>
              {!status?.google.configured && (
                <p className="text-[11px] text-amber-400/90 leading-relaxed">
                  Add Google OAuth credentials in gieo-config.ts first (Desktop app client, redirect{' '}
                  <code className="text-zinc-400">http://127.0.0.1:42857/oauth/callback</code>).
                </p>
              )}
              <Button
                size="sm"
                className="gap-1.5"
                disabled={busy === 'google' || !status?.google.configured}
                onClick={() => {
                  setBusy('google')
                  setMsg(null)
                  void onConnectGoogle().then((r) => {
                    setMsg(r.error ?? (r.success ? 'Google Calendar connected' : 'Failed'))
                    setBusy(null)
                  })
                }}
              >
                {busy === 'google' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
                Connect Google
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="liquid-glass-panel border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            Calendly
          </CardTitle>
          <CardDescription className="text-xs">
            Paste your Calendly personal access token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {calendlyConnected ? (
            <>
              <p className="text-xs text-emerald-400">
                Connected · {status?.calendly.name ?? status?.calendly.email}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => void onDisconnectCalendly()}
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Calendly PAT (Integrations → API & Webhooks)"
                value={calendlyToken}
                onChange={(e) => setCalendlyToken(e.target.value)}
                className="h-9 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={busy === 'calendly' || !calendlyToken.trim()}
                  onClick={() => {
                    setBusy('calendly')
                    setMsg(null)
                    void onConnectCalendly(calendlyToken).then((r) => {
                      setMsg(r.error ?? (r.success ? 'Calendly connected' : 'Failed'))
                      if (r.success) setCalendlyToken('')
                      setBusy(null)
                    })
                  }}
                >
                  {busy === 'calendly' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                  Connect Calendly
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() =>
                    window.open('https://calendly.com/integrations/api_webhooks', '_blank')
                  }
                >
                  Get token
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {msg && <p className="text-xs text-zinc-400 md:col-span-2">{msg}</p>}
    </div>
  )
}
