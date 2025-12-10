import { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import type { Campaign } from '@/types'

type Props = {
  campaigns: Campaign[]
  account: string
  contract: ethers.Contract | null
  onSelect: (id: number) => void
}

export default function Home({ campaigns, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [minTarget, setMinTarget] = useState('')
  const [maxTarget, setMaxTarget] = useState('')
  const [sortBy, setSortBy] = useState<'time' | 'amount' | 'none'>('none')

  const filtered = useMemo(() => {
    let list: Campaign[] = campaigns
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((c) =>
        String(c.title).toLowerCase().includes(q) || String(c.description).toLowerCase().includes(q)
      )
    }
    if (minTarget) {
      const min = ethers.parseEther(minTarget)
      list = list.filter((c) => BigInt(c.target) >= min)
    }
    if (maxTarget) {
      const max = ethers.parseEther(maxTarget)
      list = list.filter((c) => BigInt(c.target) <= max)
    }
    if (sortBy === 'time') {
      list = [...list].sort((a, b) => Number(a.deadline) - Number(b.deadline))
    } else if (sortBy === 'amount') {
      list = [...list].sort((a, b) => Number(b.amountCollected) - Number(a.amountCollected))
    }
    return list
  }, [campaigns, query, minTarget, maxTarget, sortBy])

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end mb-6">
        <div className="flex-1 min-w-52">
          <label className="block text-sm mb-1">搜索</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="按标题或描述"
            className="w-full border rounded-md h-9 px-3 bg-background"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">最小目标(ETH)</label>
          <input
            value={minTarget}
            onChange={(e) => setMinTarget(e.target.value)}
            placeholder="例如 0.1"
            className="w-40 border rounded-md h-9 px-3 bg-background"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">最大目标(ETH)</label>
          <input
            value={maxTarget}
            onChange={(e) => setMaxTarget(e.target.value)}
            placeholder="例如 10"
            className="w-40 border rounded-md h-9 px-3 bg-background"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">排序</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'time' | 'amount' | 'none')}
            className="w-40 border rounded-md h-9 px-3 bg-background"
          >
            <option value="none">默认</option>
            <option value="time">按截止时间</option>
            <option value="amount">按已筹金额</option>
          </select>
        </div>
      </div>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
        {filtered.map((c) => (
          <div
            key={String(c.id)}
            className="break-inside-avoid mb-6 border rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md"
            onClick={() => onSelect(Number(c.id))}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-medium">{String(c.title)}</h3>
              <span className="text-xs px-2 py-1 rounded bg-secondary">
                {new Date(Number(c.deadline) * 1000).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{String(c.description)}</p>
            <div className="mt-3 text-sm">
              <div>目标: {ethers.formatEther(c.target)} ETH</div>
              <div>已筹: {ethers.formatEther(c.amountCollected)} ETH</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
