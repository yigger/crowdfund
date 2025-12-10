import { useState } from 'react'
import { ethers } from 'ethers'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

type Props = {
  account: string
  contract: ethers.Contract | null
  onCreated?: () => void
}

export default function CreateProject({ account, contract, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async () => {
    if (!account || !contract) return
    if (!title || !target || !deadline) return
    setLoading(true)
    try {
      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000)
      const tx = await contract.createCampaign(
        account,
        title,
        description,
        ethers.parseEther(target),
        deadlineTs
      )
      await tx.wait()
      if (onCreated) onCreated()
      navigate('/')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">创建项目</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">项目名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-md h-9 px-3 bg-background"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">项目描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md px-3 py-2 bg-background min-h-24"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">众筹金额(ETH)</label>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="例如 1"
              className="w-full border rounded-md h-9 px-3 bg-background"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">截止日期</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border rounded-md h-9 px-3 bg-background"
            />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={submit} disabled={loading || !account || !contract}>{loading ? '提交中...' : '创建项目'}</Button>
        </div>
      </div>
    </div>
  )
}
