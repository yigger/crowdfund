import { useState } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

type Props = {
  account: string
  contract: ethers.Contract | null
  onCreated?: () => void
  onConnect?: () => void | Promise<void>
}

export default function CreateProject({ account, contract, onCreated, onConnect }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async () => {
    if (!account || !contract) return
    if (!title || !target || !deadline) return
    setError('')
    setLoading(true)
    try {
      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000)
      if (deadlineTs <= Math.floor(Date.now() / 1000)) {
        setError('截止日期必须晚于当前时间')
        return
      }
      const envStakeStr = (import.meta.env.VITE_MIN_STAKE as string) || ''
      let stake = envStakeStr ? ethers.parseEther(envStakeStr) : ethers.parseEther('0.01')
      try {
        const hasMinStake = Boolean((contract as unknown as { interface?: { fragments?: Array<{ name?: string }> } }).interface?.fragments?.some((f) => f?.name === 'MIN_STAKE'))
        if (hasMinStake) {
          const onchainStake = await (contract as unknown as { MIN_STAKE: () => Promise<bigint> }).MIN_STAKE()
          stake = onchainStake
        }
      } catch {}

      try {
        const createFn = (contract as unknown as { createCampaign: { staticCall: (owner: string, title: string, description: string, target: bigint, deadline: number, overrides?: { value: bigint }) => Promise<void> } }).createCampaign
        await createFn.staticCall(account, title, description, ethers.parseEther(target), deadlineTs, { value: stake })
      } catch (simErr) {
        const msg = simErr instanceof Error ? simErr.message : String(simErr)
        setError(msg.includes('execution reverted') ? msg.replace('execution reverted: ', '') : msg)
        return
      }

      const tx = await contract.createCampaign(
        account,
        title,
        description,
        ethers.parseEther(target),
        deadlineTs,
        { value: stake }
      )
      await tx.wait()
      if (onCreated) onCreated()
      navigate('/')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('missing revert data') ? '交易估算失败，可能由于创建条件不满足或地址/网络错误' : msg)
    } finally {
      setLoading(false)
    }
  }

  if (!account || !contract) {
    return (
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-2">创建项目</h2>
        <p className="text-gray-600 mb-6">请先连接钱包以创建众筹项目</p>
        <Button onClick={onConnect}>连接钱包</Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-semibold mb-6">创建项目</h2>
      <div className="space-y-5">
        <div>
          <label className="block text-sm mb-1">项目名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：开源数据可视化平台"
            className="w-full border rounded-md h-11 px-3 bg-background"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">项目描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="用一两句话说明项目价值与用途"
            className="w-full border rounded-md px-3 py-3 bg-background min-h-28"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm mb-1">众筹金额(ETH)</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="例如 1"
              className="w-full border rounded-md h-11 px-3 bg-background"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">截止日期</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border rounded-md h-11 px-3 bg-background"
            />
          </div>
        </div>
        <div className="pt-3 flex justify-end">
          <Button onClick={submit} disabled={loading || !title || !target || !deadline}>{loading ? '提交中...' : '创建项目（押金）'}</Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  )
}
