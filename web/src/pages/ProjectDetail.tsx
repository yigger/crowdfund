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
  const [error, setError] = useState('')
  const [yes, setYes] = useState<number>(0)
  const [no, setNo] = useState<number>(0)
  const [hasVoted, setHasVoted] = useState<boolean>(false)

  useEffect(() => {
    const run = async () => {
      if (!contract || !id) return
      const list: Campaign[] = await contract.getCampaigns()
      const found = list.find((c) => Number(c.id) === id) || null
      setCampaign(found)
      const cf = contract as unknown as {
        yesVotes: (id: number) => Promise<bigint>
        noVotes: (id: number) => Promise<bigint>
        voted: (id: number, addr: string) => Promise<boolean>
      }
      const y: bigint = await cf.yesVotes(id)
      const n: bigint = await cf.noVotes(id)
      setYes(Number(y))
      setNo(Number(n))
      if (account) {
        const votedFlag: boolean = await cf.voted(id, account)
        setHasVoted(Boolean(votedFlag))
      } else {
        setHasVoted(false)
      }
    }
    run()
  }, [contract, id, account])

  const progress = useMemo(() => {
    if (!campaign) return 0
    const t = Number(ethers.formatEther(campaign.target))
    const a = Number(ethers.formatEther(campaign.amountCollected))
    if (t <= 0) return 0
    return Math.min(100, Math.round((a / t) * 100))
  }, [campaign])

  const statusText = useMemo(() => {
    if (!campaign) return ''
    const s = Number(campaign.status)
    return s === 0 ? 'Pending' : s === 1 ? 'Active' : s === 2 ? 'Failed' : s === 3 ? 'Successful' : 'Unknown'
  }, [campaign])

  const challengeEndDate = useMemo(() => {
    if (!campaign) return ''
    return new Date(Number(campaign.challengeEnd) * 1000).toLocaleString()
  }, [campaign])

  const canVote = useMemo(() => {
    if (!campaign || !account) return false
    const now = Date.now()
    const end = Number(campaign.challengeEnd) * 1000
    const isOwner = account.toLowerCase() === String(campaign.owner).toLowerCase()
    return Number(campaign.status) === 0 && now <= end && !isOwner && !hasVoted
  }, [campaign, account, hasVoted])

  const canFinalize = useMemo(() => {
    if (!campaign) return false
    const now = Date.now()
    const end = Number(campaign.challengeEnd) * 1000
    return Number(campaign.status) === 0 && now > end
  }, [campaign])

  const vote = async (approve: boolean) => {
    if (!contract || !campaign) return
    setError('')
    setLoading(true)
    try {
      const cf = contract as unknown as {
        voteCampaign: (id: number, approve: boolean) => Promise<unknown>
        yesVotes: (id: number) => Promise<bigint>
        noVotes: (id: number) => Promise<bigint>
        voted: (id: number, addr: string) => Promise<boolean>
      }
      const tx = await cf.voteCampaign(id, approve)
      await tx.wait()
      const y: bigint = await cf.yesVotes(id)
      const n: bigint = await cf.noVotes(id)
      setYes(Number(y))
      setNo(Number(n))
      const votedFlag: boolean = await cf.voted(id, account)
      setHasVoted(Boolean(votedFlag))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const finalize = async () => {
    if (!contract || !campaign) return
    setError('')
    setLoading(true)
    try {
      const cf = contract as unknown as { finalizeCampaign: (id: number) => Promise<unknown> }
      const tx = await cf.finalizeCampaign(id)
      await tx.wait()
      const list: Campaign[] = await contract.getCampaigns()
      const found = list.find((c) => Number(c.id) === id) || null
      setCampaign(found)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const donate = async () => {
    if (!campaign) return
    setError('')
    if (!amount || Number(amount) <= 0 || Number.isNaN(Number(amount))) {
      setError('请输入有效的捐款金额')
      return
    }
    if (account && campaign && account.toLowerCase() === campaign.owner.toLowerCase()) {
      setError('发起者不能给自己捐款')
      return
    }
    if (campaign && Number(campaign.deadline) * 1000 < Date.now()) {
      setError('项目已截止，无法捐款')
      return
    }
    setLoading(true)
    try {
      if (contract && 'donateToCampaign' in (contract as object)) {
        const c = contract as unknown as {
          donateToCampaign: (id: number, opts: { value: bigint }) => Promise<unknown>
          donateToCampaign: { staticCall: (id: number, opts: { value: bigint }) => Promise<void> }
        }
        try {
          await c.donateToCampaign.staticCall(id, { value: ethers.parseEther(amount) })
        } catch (simErr) {
          const msg = simErr instanceof Error ? simErr.message : String(simErr)
          setError(msg.includes('execution reverted') ? msg.replace('execution reverted: ', '') : msg)
          return
        }
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
      const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e)
      setError(msg.includes('missing revert data') ? '交易估算失败，可能由于捐款条件不满足' : msg)
    } finally {
      setLoading(false)
    }
  }

  if (!campaign) return <div>加载中...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2">{String(campaign.title)}</h2>
      <p className="text-gray-600 mb-4">{String(campaign.description)}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="border rounded-md p-3">
          <div className="text-sm">状态</div>
          <div className="text-lg font-medium">{statusText}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm">押金</div>
          <div className="text-lg font-medium">{ethers.formatEther(campaign.stake ?? 0n)} ETH</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm">挑战截止</div>
          <div className="text-lg font-medium">{challengeEndDate}</div>
        </div>
        <div className="border rounded-md p-3">
          <div className="text-sm">投票</div>
          <div className="text-lg font-medium">👍 {yes} / 👎 {no}</div>
        </div>
      </div>
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
      {Number(campaign.status) === 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Button onClick={() => vote(true)} disabled={loading || !canVote}>赞成</Button>
          <Button onClick={() => vote(false)} disabled={loading || !canVote} variant="secondary">反对</Button>
          <Button onClick={finalize} disabled={loading || !canFinalize}>结束投票并裁决</Button>
        </div>
      )}
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
        <Button onClick={donate} disabled={loading || !amount || !account || Number(campaign.status) !== 1}>{loading ? '捐款中...' : '捐款'}</Button>
      </div>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
    </div>
  )
}
