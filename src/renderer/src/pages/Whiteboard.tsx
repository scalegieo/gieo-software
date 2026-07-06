import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, Trash2, Link2, Move, MousePointer2, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { getProfileById } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { WhiteboardItem, WhiteboardConnection } from '@/lib/types'

const NOTE_COLORS = ['amber', 'sky', 'emerald', 'rose', 'violet'] as const
type Tool = 'select' | 'connect' | 'pan'
type Anchor = WhiteboardConnection['from_anchor']

function colorClass(color: string): string {
  const map: Record<string, string> = {
    amber: 'bg-amber-400/95 text-amber-950',
    sky: 'bg-sky-400/95 text-sky-950',
    emerald: 'bg-emerald-400/95 text-emerald-950',
    rose: 'bg-rose-400/95 text-rose-950',
    violet: 'bg-violet-400/95 text-violet-950'
  }
  return map[color] ?? map.amber
}

function anchorPoint(
  note: WhiteboardItem,
  anchor: Anchor,
  override?: { x: number; y: number }
): { x: number; y: number } {
  const x = override?.x ?? note.x
  const y = override?.y ?? note.y
  const w = note.width
  const h = note.height
  switch (anchor) {
    case 'top':
      return { x: x + w / 2, y }
    case 'bottom':
      return { x: x + w / 2, y: y + h }
    case 'left':
      return { x, y: y + h / 2 }
    case 'right':
      return { x: x + w, y: y + h / 2 }
  }
}

const ANCHORS: Anchor[] = ['top', 'right', 'bottom', 'left']

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 0.12

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

export function Whiteboard(): JSX.Element {
  const {
    whiteboardItems,
    whiteboardConnections,
    fetchWhiteboard,
    subscribeWhiteboard,
    addWhiteboardNote,
    updateWhiteboardItem,
    deleteWhiteboardItem,
    addWhiteboardConnection,
    deleteWhiteboardConnection,
    profile
  } = useStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [tool, setTool] = useState<Tool>('select')
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ id: string; x: number; y: number } | null>(null)
  const [linkFrom, setLinkFrom] = useState<{ noteId: string; anchor: Anchor } | null>(null)
  const panStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null)

  useEffect(() => {
    void fetchWhiteboard()
    const unsub = subscribeWhiteboard()
    return unsub
  }, [fetchWhiteboard, subscribeWhiteboard])

  const notes = whiteboardItems.filter((i) => i.type === 'note')

  const canvasTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`

  const canvasPoint = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 100, y: 100 }
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    }
  }

  const zoomAtScreenPoint = useCallback(
    (clientX: number, clientY: number, nextZoom: number): void => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const clamped = clampZoom(nextZoom)
      const mouseX = clientX - rect.left
      const mouseY = clientY - rect.top
      const worldX = (mouseX - pan.x) / zoom
      const worldY = (mouseY - pan.y) / zoom

      setZoom(clamped)
      setPan({
        x: mouseX - worldX * clamped,
        y: mouseY - worldY * clamped
      })
    },
    [pan.x, pan.y, zoom]
  )

  const zoomBy = useCallback(
    (delta: number, clientX?: number, clientY?: number): void => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const cx = clientX ?? (rect ? rect.left + rect.width / 2 : 0)
      const cy = clientY ?? (rect ? rect.top + rect.height / 2 : 0)
      zoomAtScreenPoint(cx, cy, zoom + delta)
    },
    [zoom, zoomAtScreenPoint]
  )

  const resetView = useCallback((): void => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          zoomBy(ZOOM_STEP)
        } else if (e.key === '-') {
          e.preventDefault()
          zoomBy(-ZOOM_STEP)
        } else if (e.key === '0') {
          e.preventDefault()
          resetView()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoomBy, resetView])

  const onCanvasMouseDown = (e: React.MouseEvent): void => {
    if (tool !== 'pan' && e.target !== canvasRef.current) return
    if (tool === 'connect') return
    panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
  }

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent): void => {
      if (dragging) {
        const pt = canvasPoint(e.clientX, e.clientY)
        setDragPos({ id: dragging.id, x: pt.x - dragging.ox, y: pt.y - dragging.oy })
        return
      }
      if (panStart.current && (tool === 'pan' || panStart.current)) {
        const dx = e.clientX - panStart.current.x
        const dy = e.clientY - panStart.current.y
        if (tool === 'pan' || Math.abs(dx) + Math.abs(dy) > 4) {
          setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy })
        }
      }
    },
    [dragging, tool, pan.x, pan.y, zoom]
  )

  const onCanvasMouseUp = (): void => {
    if (dragging && dragPos) {
      updateWhiteboardItem(dragPos.id, { x: dragPos.x, y: dragPos.y })
    }
    panStart.current = null
    setDragging(null)
    setDragPos(null)
  }

  const handleAddNote = (): void => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const cx = rect ? (rect.width / 2 - pan.x) / zoom - 110 : 200
    const cy = rect ? (rect.height / 2 - pan.y) / zoom - 70 : 200
    addWhiteboardNote(cx, cy, '')
  }

  const handleAnchorClick = (noteId: string, anchor: Anchor): void => {
    if (tool !== 'connect') return
    if (!linkFrom) {
      setLinkFrom({ noteId, anchor })
      return
    }
    if (linkFrom.noteId !== noteId) {
      addWhiteboardConnection(linkFrom.noteId, noteId, linkFrom.anchor, anchor)
    }
    setLinkFrom(null)
  }

  const getNotePos = (note: WhiteboardItem): { x: number; y: number } =>
    dragPos?.id === note.id ? dragPos : { x: note.x, y: note.y }

  return (
    <div className="relative z-10 flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Whiteboard</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Sticky notes · connect dots · live team sync</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-zinc-800 p-0.5">
            <button
              type="button"
              title="Zoom out"
              onClick={() => zoomBy(-ZOOM_STEP)}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Reset zoom (100%)"
              onClick={resetView}
              className="min-w-[3rem] rounded-md px-1.5 py-1.5 text-[11px] tabular-nums text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              title="Zoom in"
              onClick={() => zoomBy(ZOOM_STEP)}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Fit view"
              onClick={resetView}
              className="rounded-md p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors border-l border-zinc-800 ml-0.5 pl-2"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
          <div className="flex rounded-lg border border-zinc-800 p-0.5">
            {(
              [
                ['select', MousePointer2, 'Select'],
                ['connect', Link2, 'Connect'],
                ['pan', Move, 'Pan']
              ] as const
            ).map(([t, Icon, label]) => (
              <button
                key={t}
                type="button"
                title={label}
                onClick={() => {
                  setTool(t)
                  setLinkFrom(null)
                }}
                className={cn(
                  'rounded-md p-1.5 transition-colors',
                  tool === t ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleAddNote} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Sticky note
          </Button>
          {linkFrom && (
            <Button size="sm" variant="secondary" onClick={() => setLinkFrom(null)}>
              Pick target dot…
            </Button>
          )}
        </div>
      </div>

      {tool === 'connect' && (
        <p className="mb-2 text-xs text-zinc-500">
          Click a dot on one note, then a dot on another to draw a connection line.
        </p>
      )}
      <p className="mb-2 text-xs text-zinc-600">
        Pinch or ⌘/Ctrl + scroll to zoom · scroll or Pan tool to move · ⌘/Ctrl + 0 to reset
      </p>

      <div
        ref={canvasRef}
        className={cn(
          'relative flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30',
          tool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        )}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(113,113,122,0.18) 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
            zoomAtScreenPoint(e.clientX, e.clientY, zoom + delta)
            return
          }
          if (tool === 'pan' || e.shiftKey) {
            e.preventDefault()
            setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
          }
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
        onDoubleClick={(e) => {
          if (e.target !== canvasRef.current) return
          const pt = canvasPoint(e.clientX, e.clientY)
          addWhiteboardNote(pt.x - 110, pt.y - 70, '')
        }}
      >
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          style={{ transform: canvasTransform, transformOrigin: '0 0' }}
        >
          {whiteboardConnections.map((conn) => {
            const from = notes.find((n) => n.id === conn.from_id)
            const to = notes.find((n) => n.id === conn.to_id)
            if (!from || !to) return null
            const fromPos = getNotePos(from)
            const toPos = getNotePos(to)
            const p1 = anchorPoint(from, conn.from_anchor, fromPos)
            const p2 = anchorPoint(to, conn.to_anchor, toPos)
            const mx = (p1.x + p2.x) / 2
            return (
              <g key={conn.id}>
                <path
                  d={`M ${p1.x} ${p1.y} Q ${mx} ${p1.y} ${p2.x} ${p2.y}`}
                  fill="none"
                  stroke="rgba(161,161,170,0.65)"
                  strokeWidth={2}
                />
                <circle cx={p1.x} cy={p1.y} r={4} fill="rgba(161,161,170,0.8)" />
                <circle cx={p2.x} cy={p2.y} r={4} fill="rgba(161,161,170,0.8)" />
              </g>
            )
          })}
        </svg>

        <div
          className="absolute inset-0"
          style={{ transform: canvasTransform, transformOrigin: '0 0' }}
        >
          {notes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-zinc-600">Click “Sticky note” or double-click canvas to add one</p>
            </div>
          )}

          {notes.map((note) => {
            const author = getProfileById(note.user_id)?.name ?? 'Team'
            const isMine = note.user_id === profile?.id
            const pos = getNotePos(note)

            return (
              <div
                key={note.id}
                className={cn(
                  'absolute rounded-lg shadow-xl border border-black/15 select-none',
                  colorClass(note.color),
                  linkFrom?.noteId === note.id && 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900'
                )}
                style={{ left: pos.x, top: pos.y, width: note.width, minHeight: note.height }}
                onMouseDown={(e) => {
                  if (tool === 'connect') return
                  e.stopPropagation()
                  const pt = canvasPoint(e.clientX, e.clientY)
                  setDragging({ id: note.id, ox: pt.x - pos.x, oy: pt.y - pos.y })
                }}
              >
                <div className="flex items-center justify-between px-2 py-1 border-b border-black/10 text-[10px] opacity-80">
                  <span>{author}</span>
                  {isMine && (
                    <button
                      type="button"
                      className="p-0.5 hover:bg-black/10 rounded"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteWhiteboardItem(note.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <textarea
                  defaultValue={note.content}
                  onBlur={(e) => updateWhiteboardItem(note.id, { content: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="Type idea…"
                  className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none min-h-[72px]"
                />

                <div className="flex gap-1 px-2 pb-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-3 w-3 rounded-full ${colorClass(c)} border border-black/20`}
                      onClick={() => updateWhiteboardItem(note.id, { color: c })}
                    />
                  ))}
                </div>

                {ANCHORS.map((anchor) => {
                  const ap = anchorPoint(note, anchor, pos)
                  const relX = ap.x - pos.x
                  const relY = ap.y - pos.y
                  const isActive =
                    linkFrom?.noteId === note.id && linkFrom.anchor === anchor

                  return (
                    <button
                      key={anchor}
                      type="button"
                      title={`Connect ${anchor}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAnchorClick(note.id, anchor)
                      }}
                className={cn(
                  'absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform hover:scale-125',
                  tool === 'connect' ? 'opacity-100' : 'opacity-40 hover:opacity-100',
                  isActive
                    ? 'bg-white border-zinc-900 scale-125'
                    : 'bg-zinc-900/90 border-zinc-200 hover:bg-white hover:border-zinc-900'
                )}
                      style={{ left: relX, top: relY }}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {whiteboardConnections.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {whiteboardConnections.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => deleteWhiteboardConnection(c.id)}
              className="text-[10px] text-zinc-600 hover:text-red-400 underline"
            >
              Remove line
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
