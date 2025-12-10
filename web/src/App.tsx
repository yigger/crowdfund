import { useState } from 'react';
import { ethers } from 'ethers';
import { CrowdfundABI } from './utils/contract';
import { Button } from '@/components/ui/button';
import './App.css';

// 重要：请将此处替换为你本地部署的合约地址
const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 

function App() {
  const [account, setAccount] = useState<string>('');
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // 连接钱包
  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        initializeContract();
      } catch (error) {
        console.error("连接失败:", error);
      }
    } else {
      alert("请安装 MetaMask!");
    }
  };

  // 初始化合约实例
  const initializeContract = async () => {
    if ((window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const crowdfundContract = new ethers.Contract(CONTRACT_ADDRESS, CrowdfundABI, signer);
      setContract(crowdfundContract);
      
      // 初始化后立即获取项目列表
      fetchCampaigns(crowdfundContract);
    }
  };

  // 获取所有项目
  const fetchCampaigns = async (crowdfundContract: ethers.Contract) => {
    try {
      const data = await crowdfundContract.getCampaigns();
      console.log("获取到的项目:", data);
      setCampaigns(data);
    } catch (error) {
      console.error("获取项目失败:", error);
    }
  };

  // 示例：创建一个新的众筹项目
  const createCampaign = async () => {
    if (!contract) return;
    try {
      console.log("正在创建项目...");
      const deadline = Math.floor(Date.now() / 1000) + 3600 * 24; // 1天后
      
      const tx = await contract.createCampaign(
        account,
        "我的第一个网页项目",
        "这是通过 React 前端创建的测试项目",
        ethers.parseEther("1.0"), // 1 ETH
        deadline
      );
      
      console.log("交易发送成功:", tx.hash);
      await tx.wait();
      alert("项目创建成功！");
      
      // 创建成功后刷新列表
      fetchCampaigns(contract);
      
    } catch (error) {
      console.error("创建失败:", error);
      alert("创建失败，请检查控制台");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">众筹 DApp</h1>
      
      {!account ? (
        <Button onClick={connectWallet}>连接钱包</Button>
      ) : (
        <div>
          <p className="mb-4">当前账户: {account}</p>
          <Button onClick={createCampaign}>创建测试项目</Button>
          
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4">所有项目 ({campaigns.length})</h2>
            <div className="grid gap-5">
              {campaigns.map((campaign, index) => (
                <div key={index} className="border p-4 rounded-lg shadow-sm">
                  <h3 className="text-xl font-medium">{campaign.title}</h3>
                  <p className="text-gray-600">{campaign.description}</p>
                  <p className="mt-2">目标: {ethers.formatEther(campaign.target)} ETH</p>
                  <p>已筹: {ethers.formatEther(campaign.amountCollected)} ETH</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-5 text-sm text-gray-500">
        <p>提示：请确保本地 Hardhat 节点正在运行，并且 MetaMask 连接到了 Localhost 8545</p>
      </div>
    </div>
  );
}

export default App;
