// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Voting is Ownable {
    // STRUCTS
    struct Voter {
        bool isRegistered;
        bool hasVoted;
        uint votedProposalId;
    }
    struct Proposal {
        string description;
        uint voteCount;
    }
    struct VoteDetail {
        uint winningProposalId;
        uint totalVotes;
        uint numberVotes;
    }

    // ENUMS
    enum WorkflowStatus {
        RegisteringVoters,
        ProposalsRegistrationStarted,
        ProposalsRegistrationEnded,
        VotingSessionStarted,
        VotingSessionEnded,
        VotesTallied
    }

    // EVENTS
    event VoterRegistered(address voterAddress);
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    );
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);

    // VARIABLES
    // Les variables sont en public pour être consultables par tous
    // et ainsi inspirer la confiance des votants
    VoteDetail public voteDetail;
    WorkflowStatus public workflowStatus;
    // Un mapping de votants permet d'acceder à un votant rapidement
    // et à moindre frais, à partir de son adresse
    mapping(address => Voter) public voters;
    // Un tableau de propositions est necessaire pour le parcours
    // des propositions lors du décompte
    Proposal[] public proposals;

    constructor() {
        workflowStatus = WorkflowStatus.RegisteringVoters;

        // Ajout du de la proposition "vote blanc"
        Proposal memory proposal;
        proposal.description = "Blank vote";
        proposal.voteCount = 0;
        proposals.push(proposal);
    }

    /* 
        Workflow functions 
    */
    function startProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Current workflow should be RegisteringVoters"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.RegisteringVoters,
            workflowStatus
        );
    }

    function endProposalsRegistration() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Current workflow should be ProposalsRegistrationStarted"
        );
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            workflowStatus
        );
    }

    function startVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnded,
            "Current workflow should be ProposalsRegistrationEnded"
        );
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            workflowStatus
        );
    }

    function endVotingSession() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Current workflow should be VotingSessionStarted"
        );
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            workflowStatus
        );
    }

    /*
        Voting functions
    */
    function addVoter(address _voter) external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Not in a registering voters session"
        );
        require(!voters[_voter].isRegistered, "Voter already registered");
        Voter memory voter;
        voter.isRegistered = true;
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

        Proposal memory proposal;
        proposal.description = _description;
        proposal.voteCount = 0;
        proposals.push(proposal);

        emit ProposalRegistered(proposals.length - 1);
    }

    function addVote(uint _proposalId) external {
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Not in a vote session"
        );
        require(voters[msg.sender].isRegistered, "Voter not registred");
        require(voters[msg.sender].hasVoted == false, "Voter already voted");
        require(_proposalId < proposals.length, "unkown proposalId");

        proposals[_proposalId].voteCount += 1;
        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = _proposalId;
        emit Voted(msg.sender, _proposalId);
    }

    function countVotes() external onlyOwner {
        require(
            workflowStatus == WorkflowStatus.VotingSessionEnded,
            "Voting session not ended"
        );
        uint _winningProposalId;
        uint _totalVotes;
        uint _numberVotes;

        for (uint i = 0; i < proposals.length; i++) {
            _totalVotes += proposals[i].voteCount;
            if (proposals[i].voteCount >= _numberVotes) {
                _winningProposalId = i;
                _numberVotes = proposals[i].voteCount;
            }
        }

        // si personne n'a voté, le vote est nul
        // car sinon la dernière proposition aurait été désigné gagnante
        require(_totalVotes != 0, "Nobody voted");

        voteDetail.winningProposalId = _winningProposalId;
        voteDetail.totalVotes = _totalVotes;
        voteDetail.numberVotes = _numberVotes;
        workflowStatus = WorkflowStatus.VotesTallied;
    }

    function getWinningProposal()
        external
        view
        returns (string memory, uint, uint)
    {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            "Vote not tallied"
        );
        return (
            proposals[voteDetail.winningProposalId].description,
            voteDetail.totalVotes,
            voteDetail.numberVotes
        );
    }
}
