pragma solidity ^0.8.28;
import "./Crowdfund.sol";

// 为众筹项目进行捐赠
contract Donate is Crowdfund {
    
    // 向指定众筹项目捐赠资金
    function donateToCampaign(uint256 _campaignId, uint256 _amount) public {
        Campaign storage campaign = campaigns[_campaignId];
        require(block.timestamp < campaign.deadline, "The campaign has ended.");
        require(_amount > 0, "Donation amount must be greater than zero.");
        campaign.donators.push(msg.sender);
        campaign.donations.push(_amount);
        campaign.amountCollected += _amount;
    }
}