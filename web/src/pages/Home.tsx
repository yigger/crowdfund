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
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    let list: Campaign[] = campaigns
    if (!showAll) {
      list = list.filter((c) => Number(c.status) === 1)
    }
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
  }, [campaigns, query, minTarget, maxTarget, sortBy, showAll])

  return (
    <div>
      <section className="mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold">探索与支持优秀项目</h1>
        <p className="text-gray-600 mt-2">筛选、搜索并捐助，助力早期创意与开源创新</p>
      </section>
      <div className="flex flex-wrap gap-3 items-end justify-center mb-8">
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
        <div className="flex items-center gap-2">
          <input id="showAll" type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          <label htmlFor="showAll" className="text-sm">显示全部（含未激活）</label>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((c) => (
          <div
            key={String(c.id)}
            className="border rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelect(Number(c.id))}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">{String(c.title)}</h3>
              <span className="text-xs px-2 py-1 rounded bg-secondary">
                {new Date(Number(c.deadline) * 1000).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{String(c.description)}</p>
            <div className="mt-4 text-sm grid grid-cols-2 gap-2">
              <div>目标: {ethers.formatEther(c.target)} ETH</div>
              <div className="text-right">已筹: {ethers.formatEther(c.amountCollected)} ETH</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
