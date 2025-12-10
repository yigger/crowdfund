// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Crowdfund {
    struct Campaign {
        uint256 id;
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        string image;
        address[] donators;
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;
    Campaign[]public allCampaigns;

    event CampaignCreated(uint256 id, address owner, string title);

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline
    ) public returns (uint256) {
        require(
            _deadline > block.timestamp,
            "The deadline should be a date in the future."
        );

        uint256 compaignId = uint256(keccak256(abi.encodePacked(block.timestamp, _owner, _title))) % 1000000000000;
        
        Campaign memory newCampaign = Campaign({
            id: compaignId,
            owner: _owner,
            title: _title,
            description: _description,
            target: _target,
            deadline: _deadline,
            amountCollected: 0,
            image: "",
            donators: new address[](0),
            donations: new uint256[](0)
        });

        campaigns[compaignId] = newCampaign;
        allCampaigns.push(newCampaign);

        emit CampaignCreated(compaignId, _owner, _title);
        return compaignId;
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        return allCampaigns;
    }
}
