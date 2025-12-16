import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import type { Campaign } from '@/types'

type Props = {
  account: string
  contract: ethers.Contract | null
}

export default function MyProjects({ account, contract }: Props) {
  const [list, setList] = useState<Campaign[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [votes, setVotes] = useState<Record<number, { yes: number; no: number }>>({})

  const myList = useMemo(() => {
    return list.filter((c) => String(c.owner).toLowerCase() === account.toLowerCase())
  }, [list, account])

  useEffect(() => {
    ;(async () => {
      try {
        if (!contract) return
        const data: Campaign[] = await contract.getCampaigns()
        setList(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    })()
  }, [contract])

  useEffect(() => {
    ;(async () => {
      try {
        if (!contract) return
        const cf = contract as unknown as {
          yesVotes: (id: number) => Promise<bigint>
          noVotes: (id: number) => Promise<bigint>
        }
        const pending = myList.filter((c) => Number(c.status) === 0)
        const ent: Record<number, { yes: number; no: number }> = {}
        for (const c of pending) {
          const y = await cf.yesVotes(Number(c.id))
          const n = await cf.noVotes(Number(c.id))
          ent[Number(c.id)] = { yes: Number(y), no: Number(n) }
        }
        setVotes(ent)
      } catch {}
    })()
  }, [myList, contract])

  const refresh = async () => {
    if (!contract) return
    const data: Campaign[] = await contract.getCampaigns()
    setList(data)
  }

  const activate = async (id: number) => {
    if (!contract) return
    setError('')
    setLoading(true)
    try {
      const cf = contract as unknown as {
        activateCampaign: (id: number) => Promise<unknown>
        activateCampaign: { staticCall: (id: number) => Promise<void> }
      }
      try {
        await cf.activateCampaign.staticCall(id)
      } catch (simErr) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr)
        setError(msg.includes('execution reverted') ? msg.replace('execution reverted: ', '') : msg)
        return
      }
      const tx = await cf.activateCampaign(id)
      await tx.wait()
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('missing revert data') ? '交易估算失败，可能不满足激活条件' : msg)
    } finally {
      setLoading(false)
    }
  }

  const finalize = async (id: number) => {
    if (!contract) return
    setError('')
    setLoading(true)
    try {
      const cf = contract as unknown as {
        finalizeCampaign: (id: number) => Promise<unknown>
        finalizeCampaign: { staticCall: (id: number) => Promise<void> }
      }
      try {
        await cf.finalizeCampaign.staticCall(id)
      } catch (simErr) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr)
        setError(msg.includes('execution reverted') ? msg.replace('execution reverted: ', '') : msg)
        return
      }
      const tx = await cf.finalizeCampaign(id)
      await tx.wait()
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('missing revert data') ? '交易估算失败，可能不满足结项条件' : msg)
    } finally {
      setLoading(false)
    }
  }

  const withdraw = async (id: number) => {
    if (!contract) return
    setError('')
    setLoading(true)
    try {
      const cf = contract as unknown as {
        withdraw: (id: number) => Promise<unknown>
        withdraw: { staticCall: (id: number) => Promise<void> }
      }
      try {
        await cf.withdraw.staticCall(id)
      } catch (simErr) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr)
        setError(msg.includes('execution reverted') ? msg.replace('execution reverted: ', '') : msg)
        return
      }
      const tx = await cf.withdraw(id)
      await tx.wait()
      await refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('missing revert data') ? '交易估算失败，可能不满足提现条件' : msg)
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    return myList.map((c) => {
      const id = Number(c.id)
      const s = Number(c.status)
      const yes = votes[id]?.yes ?? 0
      const no = votes[id]?.no ?? 0
      const now = Date.now()
      const canActivate = s === 0 && now > Number(c.challengeEnd) * 1000 && yes >= no
      const canFinalize = s === 1 && (BigInt(c.amountCollected ?? 0n) >= BigInt(c.target ?? 0n) || now >= Number(c.deadline) * 1000)
      const canWithdraw = s === 3 && BigInt(c.amountCollected ?? 0n) > 0n
      return { c, canActivate, canFinalize, canWithdraw, yes, no }
    })
  }, [myList, votes])

  if (!account || !contract) return <div className="container max-w-6xl mx-auto px-6 py-10">请先连接钱包</div>

  return (
    <div className="container max-w-6xl mx-auto px-6 py-10">
      <h2 className="text-2xl font-semibold mb-4">我的项目</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {rows.map(({ c, canActivate, canFinalize, canWithdraw, yes, no }) => (
          <div key={String(c.id)} className="border rounded-md p-4">
            <div className="flex items-start justify-between">
              <div className="font-medium">{String(c.title)}</div>
              <span className="text-xs px-2 py-1 rounded bg-secondary">{new Date(Number(c.deadline) * 1000).toLocaleDateString()}</span>
            </div>
            <div className="text-sm text-gray-600 mt-1">{String(c.description)}</div>
            <div className="mt-3 text-sm grid grid-cols-2 gap-2">
              <div>目标: {ethers.formatEther(c.target)} ETH</div>
              <div className="text-right">已筹: {ethers.formatEther(c.amountCollected)} ETH</div>
            </div>
            {Number(c.status) === 0 && (
              <div className="mt-3 text-sm">赞成 {yes} / 反对 {no}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {canActivate && <Button onClick={() => activate(Number(c.id))} disabled={loading}>开始项目</Button>}
              {canFinalize && <Button onClick={() => finalize(Number(c.id))} disabled={loading} variant="secondary">结项</Button>}
              {canWithdraw && <Button onClick={() => withdraw(Number(c.id))} disabled={loading} variant="destructive">提现</Button>}
            </div>
          </div>
        ))}
      </div>
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
    </div>
  )
}
