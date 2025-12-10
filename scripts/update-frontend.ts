import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("正在更新前端 ABI...");

  // ABI 文件路径
  const abiFilePath = path.resolve(
    __dirname,
    "../artifacts/contracts/Crowdfund.sol/Crowdfund.json"
  );
  // 前端 contract.ts 文件路径
  const frontendContractFilePath = path.resolve(
    __dirname,
    "../web/src/utils/contract.ts"
  );

  // 检查 ABI 文件是否存在
  if (!fs.existsSync(abiFilePath)) {
    console.error(`错误：在 ${abiFilePath} 未找到 ABI 文件。`);
    console.error("请先运行 'npx hardhat compile' 来编译合约。");
    process.exit(1);
  }

  // 读取 ABI 文件
  const abiFileContent = fs.readFileSync(abiFilePath, "utf-8");
  const artifact = JSON.parse(abiFileContent);
  const crowdfundABI = artifact.abi;

  // 读取前端 contract.ts 文件
  const frontendContractFileContent = fs.readFileSync(
    frontendContractFilePath,
    "utf-8"
  );

  // 准备要写入的新内容
  const newFrontendContractFileContent = `export const CrowdfundABI = ${JSON.stringify(
    crowdfundABI,
    null,
    2
  )};\n`;

  // 检查文件内容是否已经是最新的
  if (frontendContractFileContent.includes(JSON.stringify(crowdfundABI, null, 2))) {
    console.log("前端 ABI 已是最新，无需更新。");
    return;
  }

  // 使用正则表达式替换旧的 ABI
  const updatedContent = frontendContractFileContent.replace(
    /export const CrowdfundABI = \[[\s\S]*?\];/,
    `export const CrowdfundABI = ${JSON.stringify(crowdfundABI, null, 2)};`
  );


  // 将更新后的内容写回文件
  fs.writeFileSync(frontendContractFilePath, updatedContent, "utf-8");

  console.log(`成功将 ABI 更新到 ${frontendContractFilePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
