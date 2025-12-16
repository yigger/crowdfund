import { expect } from "chai";
import { network } from "hardhat";

describe("Crowdfund", function () {
  let owner: any;
  let user1: any;
  let user2: any;
  let cf: any;
  let ethersRef: any;

  const days = (n: number) => n * 24 * 60 * 60;
  const mineAfter = async (sec: number) => {
    await ethersRef.provider.send("evm_increaseTime", [sec]);
    await ethersRef.provider.send("evm_mine", []);
  };

  beforeEach(async () => {
    const { ethers } = await network.connect();
    ethersRef = ethers;
    const signers = await ethersRef.getSigners();
    owner = signers[0];
    user1 = signers[1];
    user2 = signers[2];
    cf = await ethersRef.deployContract("Crowdfund");
    await cf.waitForDeployment();
  });

  it("createCampaign requires stake and future deadline", async () => {
    const minStake: bigint = await cf.MIN_STAKE();
    const deadline = Math.floor(Date.now() / 1000) + days(3);
    await expect(
      cf.createCampaign(owner.address, "A", "desc", ethersRef.parseEther("1"), deadline, { value: minStake - 1n })
    ).to.be.revertedWith("Stake below minimum");
    const tx = await cf.createCampaign(owner.address, "A", "desc", ethersRef.parseEther("1"), deadline, { value: minStake });
    await tx.wait();
    const list = await cf.getCampaigns();
    expect(list.length).eq(1);
    expect(Number(list[0].status)).eq(0);
    expect(list[0].stake).eq(minStake);
  });

  it("vote and finalize to Active refunds stake", async () => {
    // 创建项目
    const minStake: bigint = await cf.MIN_STAKE();
    const deadline = Math.floor(Date.now() / 1000) + days(3);
    await (await cf.createCampaign(owner.address, "B", "", ethersRef.parseEther("1"), deadline, { value: minStake })).wait();

    const id = Number((await cf.getCampaigns())[0].id);
    await expect(cf.connect(owner).voteCampaign(id, true)).to.be.revertedWith("Owner cannot vote");

    // - cf.finalizeCampaign(id) 返回一个交易对象（ TransactionResponse ）。
    // - tx.wait() 等待区块确认并返回交易回执（ TransactionReceipt ），如果交易失败或回滚，会抛出错误。
    await (await cf.connect(user1).voteCampaign(id, true)).wait();

    const balBefore = await ethersRef.provider.getBalance(await cf.getAddress());
    const end = Number((await cf.getCampaigns())[0].challengeEnd);
    const now = Math.floor(Date.now() / 1000);
    await mineAfter(Math.max(0, end - now + 1));
    await (await cf.finalizeCampaign(id)).wait();

    const list = await cf.getCampaigns();
    expect(Number(list[0].status)).eq(1);
    expect(list[0].stake).eq(0n);
    const balAfter = await ethersRef.provider.getBalance(await cf.getAddress());
    expect(balAfter).lt(balBefore);
  });

  it("finalize to Failed sends stake to treasury", async () => {
    const minStake: bigint = await cf.MIN_STAKE();
    const deadline = Math.floor(Date.now() / 1000) + days(3);
    await (await cf.createCampaign(owner.address, "C", "", ethersRef.parseEther("1"), deadline, { value: minStake })).wait();
    const id = Number((await cf.getCampaigns())[0].id);
    await (await cf.connect(user1).voteCampaign(id, false)).wait();
    const balBefore = await ethersRef.provider.getBalance(await cf.getAddress());
    const end = Number((await cf.getCampaigns())[0].challengeEnd);
    const now = Math.floor(Date.now() / 1000);
    await mineAfter(Math.max(0, end - now + 1));
    await (await cf.finalizeCampaign(id)).wait();
    const list = await cf.getCampaigns();
    expect(Number(list[0].status)).eq(2);
    expect(list[0].stake).eq(0n);
    const balAfter = await ethersRef.provider.getBalance(await cf.getAddress());
    expect(balAfter).eq(balBefore);
  });

  it("only Active can receive donations and updates amounts", async () => {
    const minStake: bigint = await cf.MIN_STAKE();
    const deadline = Math.floor(Date.now() / 1000) + days(3);
    await (await cf.createCampaign(owner.address, "D", "", ethersRef.parseEther("1"), deadline, { value: minStake })).wait();
    const id = Number((await cf.getCampaigns())[0].id);
    await expect(cf.connect(user1).donateToCampaign(id, { value: ethersRef.parseEther("0.1") })).to.be.revertedWith("Campaign not active");
    const end = Number((await cf.getCampaigns())[0].challengeEnd);
    const now = Math.floor(Date.now() / 1000);
    await (await cf.connect(user1).voteCampaign(id, true)).wait();
    await mineAfter(Math.max(0, end - now + 1));
    await (await cf.activateCampaign(id)).wait();
    await expect(cf.connect(owner).donateToCampaign(id, { value: ethersRef.parseEther("0.1") })).to.be.revertedWith(
      "Owner cannot donate to themselves"
    );
    await (await cf.connect(user2).donateToCampaign(id, { value: ethersRef.parseEther("0.2") })).wait();
    const list = await cf.getCampaigns();
    expect(ethersRef.formatEther(list[0].amountCollected)).eq("0.2");
  });
});
