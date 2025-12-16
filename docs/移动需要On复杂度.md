## Question
如果删除项目的话，那也是 O(n) 的复杂度吧？需要每个往前移动一位

## Ask
- 如果用“顺序删除并整体前移”，复杂度是 O(n)。
- 用 idToIndex 搭配 swap‑and‑pop 可以做到 O(1) 删除，不需要整体前移。

### O(1) 删除方法
- 定位索引： idx = idToIndex[id]
- 取最后一个： lastId = allCampaignIds[allCampaignIds.length - 1]
- 用最后一个覆盖要删除的位置： allCampaignIds[idx] = lastId
- 更新索引映射： idToIndex[lastId] = idx
- 弹出尾部： allCampaignIds.pop()
- 清理映射： delete idToIndex[id] 、 delete campaigns[id]
- 如果需要，清零投票计数： yesVotes[id] = 0 、 noVotes[id] = 0
示例实现（无稳定顺序要求）

- 放到 contracts/Crowdfund.sol 中，按需加访问控制

```sol
function deleteCampaign(uint256 _id) public {
    Campaign storage c = campaigns[_id];
    require(c.owner == msg.sender, "Only owner");
    require(c.owner != address(0), "Not found");

    uint256 idx = idToIndex[_id];
    uint256 lastIdx = allCampaignIds.length - 1;
    uint256 lastId = allCampaignIds[lastIdx];

    allCampaignIds[idx] = lastId;
    idToIndex[lastId] = idx;
    allCampaignIds.pop();

    delete idToIndex[_id];
    delete campaigns[_id];

    yesVotes[_id] = 0;
    noVotes[_id] = 0;
}
```
Gas 与折衷

- O(1) 删除涉及少量 SSTORE （覆盖一个数组位、 pop 、 delete 两个映射），显著优于 O(n) 的整体搬移。
- 如果必须保持列表顺序稳定，确实需要 O(n) 搬移；多数链上列表不要求稳定顺序，优先使用 swap‑and‑pop 。
- 嵌套映射如 voted[_id][addr] 无法遍历清理，可以接受遗留；因为 id 已从 allCampaignIds 移除，前端不会再取到它。需要彻底清理只能依赖离链索引或在设计上避免此需求。