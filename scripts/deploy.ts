import { network } from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "../web/.env.local");

  let content = `VITE_CONTRACT_ADDRESS=${address}\n`;
  if (fs.existsSync(envPath)) {
    const prev = fs.readFileSync(envPath, "utf-8");
    const lines = prev.split(/\r?\n/).filter(Boolean);
    const updated = [] as string[];
    let replaced = false;
    for (const line of lines) {
      if (line.startsWith("VITE_CONTRACT_ADDRESS=")) {
        updated.push(content.trim());
        replaced = true;
      } else {
        updated.push(line);
      }
    }
    if (!replaced) updated.unshift(content.trim());
    content = updated.join("\n") + "\n";
  }
  fs.writeFileSync(envPath, content, "utf-8");
  console.log(`已更新前端环境变量: ${envPath}`);

  const abiFilePath = path.resolve(__dirname, "../artifacts/contracts/Crowdfund.sol/Crowdfund.json");
  const frontendContractFilePath = path.resolve(__dirname, "../web/src/utils/contract.ts");
  if (!fs.existsSync(abiFilePath)) {
    console.error(`错误：未找到 ABI 文件 ${abiFilePath}`);
  } else {
    const abiFileContent = fs.readFileSync(abiFilePath, "utf-8");
    const artifact = JSON.parse(abiFileContent);
    const crowdfundABI = artifact.abi;

    if (!fs.existsSync(frontendContractFilePath)) {
      fs.writeFileSync(
        frontendContractFilePath,
        `export const CrowdfundABI = ${JSON.stringify(crowdfundABI, null, 2)};\n`,
        "utf-8"
      );
      console.log(`已创建并写入前端 ABI: ${frontendContractFilePath}`);
    } else {
      const frontendContractFileContent = fs.readFileSync(frontendContractFilePath, "utf-8");
      const updatedContent = frontendContractFileContent.replace(
        /export const CrowdfundABI = \[[\s\S]*?\];/,
        `export const CrowdfundABI = ${JSON.stringify(crowdfundABI, null, 2)};`
      );
      fs.writeFileSync(frontendContractFilePath, updatedContent, "utf-8");
      console.log(`已更新前端 ABI: ${frontendContractFilePath}`);
    }
  }

  // seed 10 campaigns
  // const campaignFactory = await ethers.getContractFactory("Campaign");
  // for (let i = 0; i < 10; i++) {
  //   const campaign = await campaignFactory.deploy(
  //     `Campaign ${i}`,
  //     `Description for Campaign ${i}`,
  //     ethers.parseEther("100"),
  //     ethers.parseEther("1000"),
  //     1000000000 + i
  //   );
  //   await campaign.waitForDeployment();
  //   console.log(`Campaign ${i} deployed to: ${await campaign.getAddress()}`);
  // }
  
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
