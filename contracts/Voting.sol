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

    constructor() {
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    function getWinner() external returns (uint) {}

    /* Workflow functions */
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
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
    }

    function endProposalsRegistration() external onlyOwner emitWorkflowChange {
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
    }

    function startVotingSession() external onlyOwner emitWorkflowChange {
        workflowStatus = WorkflowStatus.VotingSessionStarted;
    }

    function tallyVote() external onlyOwner emitWorkflowChange {
        workflowStatus = WorkflowStatus.VotesTallied;
    }
}
