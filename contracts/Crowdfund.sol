// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Crowdfund {
    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant CHALLENGE_PERIOD = 1 days;
    address public treasury;
    enum CampaignStatus {
        Pending,
        Active,
        Failed,
        Successful
    }

    struct Campaign {
        uint256 id;
        address owner;
        string title;
        string description;
        uint256 target;
        uint256 deadline;
        uint256 amountCollected;
        CampaignStatus status;
        uint256 stake;
        uint256 createdAt;
        uint256 challengeEnd;
        address[] donators;
        uint256[] donations;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256[] public allCampaignIds;
    // 冗余一份数据，方便根据 id 快速查找索引，避免遍历 allCampaignIds 查找
    mapping(uint256 => uint256) public idToIndex;

    event CampaignCreated(uint256 id, address owner, string title);
    event Donation(uint256 id, address donor, uint256 amount);
    event Voted(uint256 id, address voter, bool approve);
    event Finalized(uint256 id, CampaignStatus status);

    mapping(uint256 => mapping(address => bool)) public voted;
    mapping(uint256 => uint256) public yesVotes;
    mapping(uint256 => uint256) public noVotes;

    // Treasury address is set to the contract address
    constructor() {
        treasury = address(this);
    }

    receive() external payable {}

    function createCampaign(
        address _owner,
        string memory _title,
        string memory _description,
        uint256 _target,
        uint256 _deadline
    ) public payable returns (uint256) {
        require(msg.value >= MIN_STAKE, "Stake below minimum");
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
            status: CampaignStatus.Pending,
            stake: msg.value,
            createdAt: block.timestamp,
            challengeEnd: block.timestamp + CHALLENGE_PERIOD,
            donators: new address[](0),
            donations: new uint256[](0)
        });

        campaigns[compaignId] = newCampaign;
        allCampaignIds.push(compaignId);
        idToIndex[compaignId] = allCampaignIds.length - 1;
        emit CampaignCreated(compaignId, _owner, _title);
        return compaignId;
    }

    function activateCampaign(uint256 _id) public {
        Campaign storage c = campaigns[_id];
        require(c.owner == msg.sender, "Only the owner can activate the campaign");
        require(c.status == CampaignStatus.Pending, "Campaign is not pending");
        // require(block.timestamp > c.challengeEnd, "Challenge period ongoing");
        require(yesVotes[_id] >= noVotes[_id], "Not approved by vote");
        c.status = CampaignStatus.Active;
        // refund stake on activation
        uint256 s = c.stake;
        c.stake = 0;
        (bool ok, ) = payable(c.owner).call{value: s}("");
        require(ok, "Stake refund failed");
    }

    function getCampaigns() public view returns (Campaign[] memory) {
        uint256 len = allCampaignIds.length;
        Campaign[] memory list = new Campaign[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 id = allCampaignIds[i];
            Campaign memory cm = campaigns[id];
            list[i] = cm;
        }
        return list;
    }

    function donateToCampaign(uint256 _id) public payable {
        Campaign storage c = campaigns[_id];
        require(msg.sender != c.owner, "Owner cannot donate to themselves");
        require(c.owner != address(0), "Campaign not found");
        require(c.status == CampaignStatus.Active, "Campaign not active");
        require(block.timestamp <= c.deadline, "Campaign has ended");
        require(msg.value > 0, "Donation must be greater than 0");

        c.donators.push(msg.sender);
        c.donations.push(msg.value);
        c.amountCollected += msg.value;
        emit Donation(_id, msg.sender, msg.value);
    }

    function voteCampaign(uint256 _id, bool approve) public {
        Campaign storage c = campaigns[_id];
        require(c.owner != address(0), "Campaign not found");
        require(block.timestamp <= c.challengeEnd, "Challenge period ended");
        require(msg.sender != c.owner, "Owner cannot vote");
        require(!voted[_id][msg.sender], "Already voted");
        voted[_id][msg.sender] = true;
        if (approve) {
            yesVotes[_id] += 1;
        } else {
            noVotes[_id] += 1;
        }
        emit Voted(_id, msg.sender, approve);
    }

    // 结项
    function finalizeCampaign(uint256 _id) public {
        Campaign storage c = campaigns[_id];
        require(c.owner != address(0), "Campaign not found");
        require(c.status == CampaignStatus.Active, "Campaign not active");
        require(c.amountCollected >= c.target || block.timestamp >= c.deadline, "Not ready to finalize");
        if (c.amountCollected >= c.target) {
            c.status = CampaignStatus.Successful;
        } else {
            c.status = CampaignStatus.Failed;
        }
        emit Finalized(_id, c.status);
    }

    function withdraw(uint256 _id) public {
        Campaign storage c = campaigns[_id];
        require(msg.sender == c.owner, "Only the owner can withdraw");
        require(c.status == CampaignStatus.Successful, "Campaign not successful");
        uint256 amount = c.amountCollected;
        require(amount > 0, "No funds");
        c.amountCollected = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdrawal failed");
    }
}
