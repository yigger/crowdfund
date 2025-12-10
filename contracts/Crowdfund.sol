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
    event Donation(uint256 id, address donor, uint256 amount);

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

    function donateToCampaign(uint256 _id) public payable {
        Campaign storage c = campaigns[_id];
        require(c.owner != address(0), "Campaign not found");
        require(block.timestamp <= c.deadline, "Campaign has ended");
        require(msg.value > 0, "Donation must be greater than 0");

        c.donators.push(msg.sender);
        c.donations.push(msg.value);
        c.amountCollected += msg.value;

        for (uint256 i = 0; i < allCampaigns.length; i++) {
            if (allCampaigns[i].id == _id) {
                allCampaigns[i].donators.push(msg.sender);
                allCampaigns[i].donations.push(msg.value);
                allCampaigns[i].amountCollected = c.amountCollected;
                break;
            }
        }

        emit Donation(_id, msg.sender, msg.value);
    }
}
