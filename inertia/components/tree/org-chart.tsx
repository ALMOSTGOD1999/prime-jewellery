import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Loading01Icon,
  Maximize02Icon,
  MinusSignIcon,
  PlusSignIcon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import { cn } from '~/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { formatDateWithRelative } from '~/lib/format'
import { formatUserId } from '~/lib/utils'

// Types
export interface OrgChartUser {
  id: number
  name: string
  createdAt: string
  children?: OrgChartUser[]
  collapsed?: boolean
  activatedAt?: string | null
  childrenCount?: number
  avatar?: { url: string } | null
}

interface OrgChartProps {
  rootUser: OrgChartUser
}

/**
 * CONFIGURATION
 */
function getConfig(isMobile: boolean) {
  return {
    nodeWidth: isMobile ? 180 : 260,
    nodeHeight: isMobile ? 95 : 110,
    horizontalGap: isMobile ? 20 : 30,
    verticalGap: isMobile ? 60 : 80,
    paddingTop: 30,
    paddingLeft: 20,
  }
}

export default function OrgChart({ rootUser }: OrgChartProps) {
  // Initialize data with root user, ensuring collapsed state is set
  const [data, setData] = useState<OrgChartUser>({ ...rootUser, collapsed: false })
  const [loadingNodes, setLoadingNodes] = useState<Set<number>>(new Set())
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const CONFIG = useMemo(() => getConfig(isMobile), [isMobile])

  // --- LAYOUT ALGORITHM (VERTICAL) ---
  const layout = useMemo(() => {
    const nodes: any[] = []
    const links: any[] = []
    let currentX = CONFIG.paddingLeft

    const traverse = (node: OrgChartUser, depth: number, parentId: number | null = null) => {
      const y = depth * (CONFIG.nodeHeight + CONFIG.verticalGap) + CONFIG.paddingTop

      if (!node.children || node.children.length === 0 || node.collapsed) {
        // Leaf or collapsed: assign next available X position
        const x = currentX
        currentX += CONFIG.nodeWidth + CONFIG.horizontalGap
        nodes.push({ ...node, x, y, depth, parentId })
        return x
      }

      // First, recursively process all children to get their X positions
      const childrenX = node.children.map((child) => traverse(child, depth + 1, node.id))

      // Parent is centered between first and last child
      const minX = childrenX[0]
      const maxX = childrenX[childrenX.length - 1]
      const x = (minX + maxX) / 2

      nodes.push({ ...node, x, y, depth, parentId })
      return x
    }

    traverse(data, 0)

    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    nodes.forEach((node) => {
      if (node.children && !node.collapsed) {
        node.children.forEach((child: OrgChartUser) => {
          const childNode = nodeMap.get(child.id)
          if (childNode) {
            links.push({ source: node, target: childNode })
          }
        })
      }
    })

    return { nodes, links, width: Math.max(currentX, isMobile ? 600 : 1000) }
  }, [data, CONFIG, isMobile])

  // --- HANDLERS ---

  const fetchChildren = async (userId: number) => {
    if (loadingNodes.has(userId)) return

    setLoadingNodes((prev) => new Set(prev).add(userId))
    try {
      const response = await fetch(`/members/${userId}/children`)
      if (response.ok) {
        const children = await response.json()
        // Add collapsed: true to new children by default
        const childrenWithState = children.map((c: any) => ({ ...c, collapsed: true }))

        // Update data tree with new children
        setData((prevData) => {
          const updateNode = (node: OrgChartUser): OrgChartUser => {
            if (node.id === userId) {
              return { ...node, children: childrenWithState, collapsed: false }
            }
            if (node.children) {
              return { ...node, children: node.children.map(updateNode) }
            }
            return node
          }
          return updateNode(prevData)
        })
      }
    } catch (error) {
      console.error('Failed to fetch children', error)
    } finally {
      setLoadingNodes((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const handleToggle = (nodeId: number) => {
    // Find the node first to check if we need to fetch
    let targetNode: OrgChartUser | undefined
    const findNode = (node: OrgChartUser) => {
      if (node.id === nodeId) targetNode = node
      if (node.children) node.children.forEach(findNode)
    }
    findNode(data)

    if (targetNode) {
      if (targetNode.collapsed) {
        // Expanding
        if (
          (!targetNode.children || targetNode.children.length === 0) &&
          targetNode.childrenCount &&
          targetNode.childrenCount > 0
        ) {
          fetchChildren(nodeId)
          return // fetchChildren will update state
        }
      }
    }
    const toggleNode = (currentNode: OrgChartUser): OrgChartUser => {
      // If the current node contains the target in its children array
      if (currentNode.children && currentNode.children.some((child) => child.id === nodeId)) {
        return {
          ...currentNode,
          children: currentNode.children.map((child) => {
            if (child.id === nodeId) {
              // Toggle the target node
              return { ...child, collapsed: !child.collapsed }
            } else {
              // Accordion: Close all siblings
              return { ...child, collapsed: true }
            }
          }),
        }
      }

      // Recursive step
      if (currentNode.children) {
        return {
          ...currentNode,
          children: currentNode.children.map(toggleNode),
        }
      }

      return currentNode
    }

    if (data.id === nodeId) {
      setData({ ...data, collapsed: !data.collapsed })
    } else {
      setData(toggleNode(data))
    }
  }

  // --- SUB COMPONENTS ---

  const Link = ({ link }: { link: any }) => {
    const s = link.source
    const t = link.target

    const startX = s.x + CONFIG.nodeWidth / 2
    const startY = s.y + CONFIG.nodeHeight

    const endX = t.x + CONFIG.nodeWidth / 2
    const endY = t.y

    const cp1x = startX
    const cp1y = startY + CONFIG.verticalGap / 2
    const cp2x = endX
    const cp2y = endY - CONFIG.verticalGap / 2

    const pathData = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`

    return (
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-border transition-all duration-300"
      />
    )
  }

  const [zoomLevel, setZoomLevel] = useState(80)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col w-full h-full bg-background font-sans text-foreground overflow-hidden border rounded-lg relative bg-grid-pattern"
    >
      <TransformWrapper
        initialScale={isMobile ? 0.5 : 0.8}
        minScale={0.1}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
        onTransformed={(e) => setZoomLevel(Math.round(e.state.scale * 100))}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* CONTROLS */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1 bg-card p-1 rounded-md border border-border shadow-sm">
              <button
                onClick={() => zoomOut()}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground"
              >
                <HugeiconsIcon icon={MinusSignIcon} size={16} />
              </button>
              <span className="text-xs font-mono text-muted-foreground w-12 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => zoomIn()}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={16} />
              </button>
              <div className="w-px h-4 bg-border mx-2"></div>
              <button
                onClick={() => resetTransform()}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground"
                title="Reset View"
              >
                <HugeiconsIcon icon={Maximize02Icon} size={16} />
              </button>
              <button
                onClick={toggleFullScreen}
                className="p-2 hover:bg-accent rounded-md transition-colors text-muted-foreground"
                title="Full Screen"
              >
                <HugeiconsIcon icon={Maximize02Icon} size={16} className="rotate-45" />
              </button>
            </div>

            <TransformComponent
              wrapperClass="w-full h-full cursor-grab active:cursor-grabbing"
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentClass="w-full h-full"
            >
              <div
                style={{
                  width: Math.max(layout.width, 1000), // Ensure enough width
                  height: Math.max(
                    layout.nodes.reduce((max, n) => Math.max(max, n.y), 0) + 500,
                    1000
                  ), // Ensure enough height
                  position: 'relative',
                }}
              >
                {/* SVG LAYER */}
                <svg
                  className="absolute top-0 left-0 pointer-events-none overflow-visible"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  {layout.links.map((link) => (
                    <Link key={`${link.source.id}-${link.target.id}`} link={link} />
                  ))}
                </svg>

                {/* NODES LAYER */}
                {layout.nodes.map((node) => (
                  <div
                    key={node.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggle(node.id)
                    }}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: CONFIG.nodeWidth,
                      height: CONFIG.nodeHeight,
                    }}
                    className={cn(
                      'group flex flex-col justify-start bg-card border rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden cursor-pointer',
                      node.id === rootUser.id
                        ? 'border-primary/50 ring-2 ring-primary/10'
                        : 'border-border'
                    )}
                  >
                    {/* Top Accent Line */}
                    <div
                      className={cn(
                        'h-1 w-full',
                        node.id === rootUser.id ? 'bg-primary' : 'bg-muted'
                      )}
                    ></div>

                    {/* CONTENT AREA */}
                    <div className="p-4 flex gap-3 items-start h-full">
                      {/* Avatar Column */}
                      <div className="relative">
                        <Avatar
                          className={cn(
                            'w-10 h-10 border border-border shadow-sm',
                            node.id === rootUser.id ? 'ring-2 ring-primary/20' : ''
                          )}
                        >
                          <AvatarImage src={node.avatar?.url} alt={node.name} />
                          <AvatarFallback
                            className={cn(
                              node.id === rootUser.id
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <HugeiconsIcon icon={UserIcon} size={20} />
                          </AvatarFallback>
                        </Avatar>

                        {/* Children Count Badge */}
                        {node.childrenCount !== undefined && node.childrenCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-background z-10">
                            {node.childrenCount}
                          </div>
                        )}
                      </div>

                      {/* Text Info Column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full pb-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground truncate leading-tight">
                            {node.name}
                          </h3>
                          {node.activatedAt && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <p className="text-[10px] text-muted-foreground font-mono">
                            ID: {formatUserId(node.id)}
                          </p>

                          {/* Metadata Row */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                            <div className="flex items-center gap-1">
                              <HugeiconsIcon
                                icon={Calendar01Icon}
                                size={10}
                                className="opacity-70"
                              />
                              <span>
                                {(() => {
                                  const { formatted, relative } = formatDateWithRelative(
                                    node.createdAt
                                  )
                                  return `${formatted} (${relative})`
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* EXPAND/COLLAPSE INDICATOR (Visual Only or Loading) */}
                    {((node.children && node.children.length > 0) ||
                      (node.childrenCount && node.childrenCount > 0) ||
                      loadingNodes.has(node.id)) && (
                      <div
                        className={cn(
                          'absolute left-1/2 -bottom-2.5 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm z-10 transition-colors',
                          node.collapsed ? 'bg-muted/50' : 'text-primary border-primary/30'
                        )}
                      >
                        {loadingNodes.has(node.id) ? (
                          <HugeiconsIcon
                            icon={Loading01Icon}
                            size={12}
                            className="animate-spin text-primary"
                          />
                        ) : node.collapsed ? (
                          <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
                        ) : (
                          <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>

      {/* STYLES FOR GRID PATTERN */}
      <style>
        {' '}
        {`
        .bg-grid-pattern {
            background-size: 40px 40px;
            background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
        }
        @media (prefers-color-scheme: dark) {
            .bg-grid-pattern {
                background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                                  linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
            }
        }
      `}
      </style>
    </div>
  )
}
