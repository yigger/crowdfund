import { network } from "hardhat";

async function main() {
  // 连接到默认的 hardhat 网络
  const { ethers } = await network.connect();

  console.log("正在部署 Crowdfund 合约...");
  
  // 部署合约
  // ethers.deployContract 是 hardhat-ethers 提供的便捷方法
  const crowdfund = await ethers.deployContract("Crowdfund");
  await crowdfund.waitForDeployment();
  
  const address = await crowdfund.getAddress();
  console.log(`Crowdfund 合约已部署到: ${address}`);
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});