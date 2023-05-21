// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Voting is Ownable {
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    struct Proposal {
        string description;
        uint voteCount;
    }

    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    WorkflowStatus workflowStatus;
    mapping(address => Voter) voters;
    mapping(uint => Proposal) proposals;
    uint proposalId;

    constructor() {
        workflowStatus = WorkflowStatus.RegisteringVoters;
        proposalId = 0;
    }

    function getWinner() external returns (uint) {}

    /* 
        Workflow functions 
    */
    modifier emitWorkflowChange() {
        WorkflowStatus previousWorkflow = workflowStatus;
        _;
        emit WorkflowStatusChange(previousWorkflow, workflowStatus);
    }

    function startProposalsRegistration()
        external
        onlyOwner
        emitWorkflowChange
    {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Current workflow should be RegisteringVoters"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
    }

    function endProposalsRegistration() external onlyOwner emitWorkflowChange {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Current workflow should be ProposalsRegistrationStarted"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
    }

    function startVotingSession() external onlyOwner emitWorkflowChange {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnded,
            "Current workflow should be ProposalsRegistrationEnded"
        );
        workflowStatus = WorkflowStatus.VotingSessionStarted;
    }

    function endVotingSession() external onlyOwner emitWorkflowChange {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Current workflow should be VotingSessionStarted"
        );
        workflowStatus = WorkflowStatus.VotingSessionEnded;
    }

    function tallyVote() external onlyOwner emitWorkflowChange {
        require(
            workflowStatus == WorkflowStatus.VotingSessionEnded,
            "Current workflow should be VotingSessionEnded"
        );
        workflowStatus = WorkflowStatus.VotesTallied;
    }

    /*
        Voting functions
    */
    function addVoter(address _voter) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Not in a registering voters session"
        );
        Voter memory voter;
        voter.isRegistered = false;
        voter.hasVoted = false;
        voter.votedProposalId = 0;
        voters[_voter] = voter;
        emit VoterRegistered(_voter);
    }

    function registerProposal(string memory _description) external {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Not in a proposal register session"
        );
        require(voters[msg.sender].isRegistered, "Voter not registred");
        require(
            voters[msg.sender].votedProposalId != 0,
            "Voter already proposed"
        );

        proposalId++;
        Proposal memory proposal;
        proposal.description = _description;
        proposal.voteCount = 0;
        proposals[proposalId] = proposal;

        voters[msg.sender].votedProposalId = proposalId;
        emit ProposalRegistered(proposalId);
    }

    function addVote(uint _proposalId) external {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Not in a vote session"
        );
        require(voters[msg.sender].isRegistered, "Voter not registred");
        require(_proposalId <= proposalId, "proposalId not valid");

        proposals[_proposalId].voteCount += 1;
        emit Voted(msg.sender, _proposalId);
    }
}
