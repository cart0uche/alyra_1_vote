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

    WorkflowStatus workFloStatus;

    constructor() {
        workFloStatus = WorkflowStatus.RegisteringVoters;
    }

    function getWinner() external returns (uint) {}

    /* WorkFlow functions */
    function startProposalsRegistration() external onlyOwner {
        workFloStatus = WorkflowStatus.ProposalsRegistrationStarted;
    }

    function endProposalsRegistration() external onlyOwner {
        workFloStatus = WorkflowStatus.ProposalsRegistrationEnded;
    }

    function startVotingSession() external onlyOwner {
        workFloStatus = WorkflowStatus.VotingSessionStarted;
    }

    function tallyVote() external onlyOwner {
        workFloStatus = WorkflowStatus.VotesTallied;
    }
}
