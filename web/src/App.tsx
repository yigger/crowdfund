import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { CrowdfundABI } from './utils/contract'
import { Button } from '@/components/ui/button'
import { Link, Routes, Route, useNavigate } from 'react-router-dom'
import Home from '@/pages/Home'
import CreateProject from '@/pages/CreateProject'
import ProjectDetail from '@/pages/ProjectDetail'
import type { Campaign } from '@/types'
import './App.css'

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string

function App() {
  const [account, setAccount] = useState<string>('')
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const navigate = useNavigate()

  // 连接钱包
  type EthereumProvider = { request: (args: { method: string }) => Promise<string[]> }
  type Eip1193Provider = unknown
  const ethereum = (window as unknown as { ethereum?: unknown }).ethereum as EthereumProvider | undefined

  const connectWallet = async () => {
    if (ethereum) {
      try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
        setAccount(accounts[0])
        await initializeContract()
      } catch (error) {
        console.error('连接失败:', error)
      }
    } else {
      alert('请安装 MetaMask!')
    }
  }

  // 初始化合约实例
  const initializeContract = async () => {
    if (ethereum) {
      const provider = new ethers.BrowserProvider(ethereum as Eip1193Provider)
      const signer = await provider.getSigner()
      const crowdfundContract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundABI, signer)
      setContract(crowdfundContract)
      try {
        const data: Campaign[] = await crowdfundContract.getCampaigns()
        setCampaigns(data)
      } catch (error) {
        console.error('获取项目失败:', error)
      }
    }
  }

  // 获取所有项目
  const fetchCampaigns = async (crowdfundContract: ethers.Contract) => {
    try {
      const data: Campaign[] = await crowdfundContract.getCampaigns()
      setCampaigns(data)
    } catch (error) {
      console.error('获取项目失败:', error)
    }
  }

  useEffect(() => {
    if (ethereum && account && !contract) {
      initializeContract()
    }
  }, [account, ethereum, contract])

  useEffect(() => {
    ;(async () => {
      try {
        const provider = ethereum
          ? new ethers.BrowserProvider(ethereum as Eip1193Provider)
          : new ethers.JsonRpcProvider((import.meta.env.VITE_RPC_URL as string) ?? 'http://localhost:8545')
        const readContract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundABI, provider)
        const data: Campaign[] = await readContract.getCampaigns()
        setCampaigns(data)
      } catch (error) {
        console.error('获取项目失败:', error)
      }
    })()
  }, [ethereum])

  const shortAddress = useMemo(() => {
    if (!account) return ''
    return `${account.slice(0, 6)}...${account.slice(-4)}`
  }, [account])

  const handleCreateClick = () => {
    navigate('/create')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b bg-gradient-to-r from-primary/5 to-secondary/5 backdrop-blur">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-semibold">众筹 DApp</Link>
          {!account ? (
            <Button onClick={connectWallet}>连接钱包</Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm">{shortAddress}</span>
              <Button onClick={handleCreateClick}>创建项目</Button>
            </div>
          )}
        </div>
      </div>
      <div className="container max-w-6xl mx-auto px-6 py-10">
        <Routes>
          <Route path="/" element={<Home campaigns={campaigns} account={account} contract={contract} onSelect={(id) => navigate(`/project/${id}`)} />} />
          <Route path="/create" element={<CreateProject account={account} contract={contract} onCreated={() => contract && fetchCampaigns(contract)} onConnect={connectWallet} />} />
          <Route path="/project/:id" element={<ProjectDetail account={account} contract={contract} />} />
        </Routes>
      </div>
    </div>
  )
}

export default App;
