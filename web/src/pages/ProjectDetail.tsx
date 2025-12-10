import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import type { Campaign } from '@/types'

type Props = {
  account: string
  contract: ethers.Contract | null
}

export default function ProjectDetail({ account, contract }: Props) {
  const params = useParams()
  const id = Number(params.id)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!contract || !id) return
      const list: Campaign[] = await contract.getCampaigns()
      const found = list.find((c) => Number(c.id) === id) || null
      setCampaign(found)
    }
    run()
  }, [contract, id])

  const progress = useMemo(() => {
    if (!campaign) return 0
    const t = Number(ethers.formatEther(campaign.target))
    const a = Number(ethers.formatEther(campaign.amountCollected))
    if (t <= 0) return 0
    return Math.min(100, Math.round((a / t) * 100))
  }, [campaign])

  const donate = async () => {
    if (!campaign) return
    setLoading(true)
    try {
      if (contract && 'donateToCampaign' in (contract as object)) {
        const c = contract as unknown as { donateToCampaign: (id: number, opts: { value: bigint }) => Promise<unknown> }
        const tx = await c.donateToCampaign(id, { value: ethers.parseEther(amount) })
        await tx.wait()
      } else {
        const ethereum = (window as unknown as { ethereum?: unknown }).ethereum
        const provider = new ethers.BrowserProvider(ethereum as unknown)
        const signer = await provider.getSigner()
        const tx = await signer.sendTransaction({ to: campaign.owner, value: ethers.parseEther(amount) })
        await tx.wait()
      }
      if (contract) {
        const list: Campaign[] = await contract.getCampaigns()
        const found = list.find((c) => Number(c.id) === id) || null
        setCampaign(found)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (!campaign) return <div>加载中...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2">{String(campaign.title)}</h2>
      <p className="text-gray-600 mb-4">{String(campaign.description)}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-md p-3">
          <div className="text-sm">目标</div>
          <div className="text-lg font-medium">{ethers.formatEther(campaign.target)} ETH</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm">已筹</div>
          <div className="text-lg font-medium">{ethers.formatEther(campaign.amountCollected)} ETH</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm">截止</div>
          <div className="text-lg font-medium">{new Date(Number(campaign.deadline) * 1000).toLocaleDateString()}</div>
        </div>
      </div>
      <div className="mb-6">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-sm">进度 {progress}%</div>
      </div>
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-sm mb-1">捐款金额(ETH)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="例如 0.1"
            className="w-40 border rounded-md h-9 px-3 bg-background"
          />
        </div>
        <Button onClick={donate} disabled={loading || !amount || !account}>{loading ? '捐款中...' : '捐款'}</Button>
      </div>
    </div>
  )
}
