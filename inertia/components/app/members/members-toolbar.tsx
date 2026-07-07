'use client'

import { router } from '@inertiajs/react'
import type { Table } from '@tanstack/react-table'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import * as React from 'react'

import { AddMemberDialog } from './add-member-dialog'
import { DataTableViewOptions } from '~/components/data-table/data-table-view-options'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import useSearchParams from '~/hooks/use-search-params'
import { useDebounce } from '~/hooks/use-debounce'
import type { Member } from './schema'

interface MembersToolbarProps {
  table: Table<Member>
  counts: { direct: number; team: number }
  maxDepth: number
}

export function MembersToolbar({ table, counts, maxDepth }: MembersToolbarProps) {
  const searchParams = useSearchParams()
  const currentTab = searchParams['tab']

  const [search, setSearch] = React.useState(searchParams['search'] || '')
  const [status, setStatus] = React.useState(searchParams['status'] || '')
  const [scope, setScope] = React.useState(searchParams['scope'] || 'team')
  const debouncedSearch = useDebounce(search, 500)

  const updateFilters = React.useCallback(
    (updates: { search?: string; status?: string; scope?: string }) => {
      const params = new URLSearchParams()
      if (currentTab) {
        params.set('tab', currentTab)
      }

      const newSearch = updates.search !== undefined ? updates.search : debouncedSearch
      const newStatus = updates.status !== undefined ? updates.status : status
      const newScope = updates.scope !== undefined ? updates.scope : scope

      if (newSearch) params.set('search', newSearch)
      if (newStatus) params.set('status', newStatus)
      if (newScope) params.set('scope', newScope)

      router.get(`/members?${params.toString()}`, {}, { preserveState: true })
    },
    [currentTab, debouncedSearch, status, scope]
  )

  React.useEffect(() => {
    if (debouncedSearch !== (searchParams['search'] || '')) {
      updateFilters({ search: debouncedSearch })
    }
  }, [debouncedSearch])

  const handleSearchChange = (value: string) => {
    setSearch(value)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    updateFilters({ status: value })
  }

  const handleScopeChange = (value: string) => {
    setScope(value)
    updateFilters({ scope: value })
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('')
    setScope('team')
    const tabParam = currentTab ? `?tab=${currentTab}` : ''
    router.get(`/members${tabParam}`, {}, { preserveState: true })
  }

  const hasActiveFilters =
    Boolean(searchParams['search']) ||
    Boolean(searchParams['status']) ||
    Boolean(searchParams['scope'])

  const isLevelScope = scope.startsWith('level_')
  const currentLevel = isLevelScope ? scope.replace('level_', '') : '1'
  const currentLabel = isLevelScope ? `Level ${currentLevel}` : 'Direct'
  const currentCount = isLevelScope ? table.getFilteredRowModel().rows.length : counts.direct

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-1">
      <div className="flex gap-4 text-sm text-muted-foreground order-1 md:order-none">
        <div>
          {currentLabel}: <span className="font-medium text-foreground">{currentCount}</span>
        </div>
        <div>
          Team: <span className="font-medium text-foreground">{counts.team}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center order-2 md:order-none">
        <div className="flex flex-wrap items-center gap-2">
          <AddMemberDialog />
          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-dashed px-2"
              onClick={handleClearFilters}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
            </Button>
          )}

          {/* Search Filter */}
          <div className="flex items-center gap-1">
            <Input
              placeholder="Search ID, name, email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 w-64"
            />
          </div>

          {/* Scope Filter */}
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Team</SelectItem>
              {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => (
                <SelectItem key={level} value={`level_${level}`}>
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Options */}
        <DataTableViewOptions table={table} align="end" />
      </div>
    </div>
  )
}
