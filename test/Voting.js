const { expect } = require("chai");
const { ethers } = require("hardhat");

let Voting_Factory;
let Voting;

const RegisteringVoters = 0;
const ProposalsRegistrationStarted = 1;
const ProposalsRegistrationEnded = 2;
const VotingSessionStarted = 3;
const VotingSessionEnded = 4;

const winningProposal = 0;
const totalVote = 1;
const winningVote = 2;

describe("Test workflow", function () {
   beforeEach(async function () {
      [owner, voter1] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event at workflow changes", async function () {
      // initially worflow is RegisteringVoters, and no event is emmit
      expect(await Voting.workflowStatus()).to.equal(RegisteringVoters);

      // RegisteringVoters => ProposalsRegistrationStarted
      await expect(await Voting.startProposalsRegistration())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(RegisteringVoters, ProposalsRegistrationStarted);

      // ProposalsRegistrationStarted => ProposalsRegistrationEnded
      await expect(await Voting.endProposalsRegistration())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(ProposalsRegistrationStarted, ProposalsRegistrationEnded);

      // ProposalsRegistrationEnded => VotingSessionStarted
      await expect(await Voting.startVotingSession())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(ProposalsRegistrationEnded, VotingSessionStarted);

      // VotingSessionStarted => VotingSessionEnded
      await expect(await Voting.endVotingSession())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(VotingSessionStarted, VotingSessionEnded);
   });

   it("fails if a voter try to change the workflow", async function () {
      await expect(
         Voting.connect(voter1).startProposalsRegistration()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.startProposalsRegistration();

      await expect(
         Voting.connect(voter1).endProposalsRegistration()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.endProposalsRegistration();

      await expect(
         Voting.connect(voter1).startVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.startVotingSession();

      await expect(
         Voting.connect(voter1).endVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.endVotingSession();
   });
});

describe("Test adding in whitelist", function () {
   beforeEach(async function () {
      [owner, voter1] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event when a voter is added", async function () {
      await expect(await Voting.addVoter(voter1.address))
         .to.emit(Voting, "VoterRegistered")
         .withArgs(voter1.address);
   });

   it("fails if not in a RegisteringVoters session", async function () {
      expect(await Voting.workflowStatus()).to.equal(RegisteringVoters);
      await Voting.addVoter(voter1.address);

      await Voting.startProposalsRegistration();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Not in a registering voters session"
      );

      await Voting.endProposalsRegistration();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Not in a registering voters session"
      );

      await Voting.startVotingSession();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Not in a registering voters session"
      );

      await Voting.endVotingSession();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Not in a registering voters session"
      );
   });

   it("fails if a voter try to add in whitelist", async function () {
      await expect(
         Voting.connect(voter1).addVoter(voter1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
   });

   it("fails if a voter is already in whitelist", async function () {
      await Voting.addVoter(voter1.address);
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Voter already registered"
      );
   });
});

describe("Test register a proposal", function () {
   beforeEach(async function () {
      [owner, voter1, voter2] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event when a proposal is added", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();

      await expect(await Voting.connect(voter1).registerProposal("proposal1"))
         .to.emit(Voting, "ProposalRegistered")
         .withArgs(1);

      await expect(await Voting.connect(voter2).registerProposal("proposal2"))
         .to.emit(Voting, "ProposalRegistered")
         .withArgs(2);
   });

   it("fails if not in a proposal register session", async function () {
      await Voting.addVoter(voter1.address);

      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal0");

      await Voting.endProposalsRegistration();
      await expect(
         Voting.connect(voter1).registerProposal("proposal0")
      ).to.be.revertedWith("Not in a proposal register session");

      await Voting.startVotingSession();
      await expect(
         Voting.connect(voter1).registerProposal("proposal0")
      ).to.be.revertedWith("Not in a proposal register session");

      await Voting.endVotingSession();
      await expect(
         Voting.connect(voter1).registerProposal("proposal0")
      ).to.be.revertedWith("Not in a proposal register session");
   });

   it("fails if a voter is not register", async function () {
      await Voting.startProposalsRegistration();

      await expect(
         Voting.connect(voter1).registerProposal("proposal0")
      ).to.be.revertedWith("Voter not registred");
   });
});

describe("Test adding a vote", function () {
   beforeEach(async function () {
      [owner, voter1, voter2] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event when a vote is added", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await expect(await Voting.connect(voter1).addVote(0))
         .to.emit(Voting, "Voted")
         .withArgs(voter1.address, 0);

      await expect(await Voting.connect(voter2).addVote(1))
         .to.emit(Voting, "Voted")
         .withArgs(voter2.address, 1);
   });

   it("fails if a voter is not register", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await expect(Voting.connect(voter2).addVote(0)).to.be.revertedWith(
         "Voter not registred"
      );
   });

   it("fails if a voter vote twice", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await expect(Voting.connect(voter1).addVote(0)).to.be.revertedWith(
         "Voter already voted"
      );
   });

   it("fails if a voter vote for an unknown proposal", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await expect(Voting.connect(voter1).addVote(2)).to.be.revertedWith(
         "unkown proposalId"
      );

      await expect(Voting.connect(voter1).addVote(3)).to.be.revertedWith(
         "unkown proposalId"
      );
   });

   it("fails if not in a vote session", async function () {
      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
      await Voting.addVoter(voter1.address);
      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
      await Voting.startProposalsRegistration();
      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
      await Voting.startVotingSession();
      await Voting.endVotingSession();

      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
   });
});

describe("Test count votes", function () {
   beforeEach(async function () {
      [owner, voter1, voter2, voter3, voter4, voter5] =
         await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("fails if not called by owner", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.endVotingSession();
      await expect(Voting.connect(voter1).countVotes()).to.be.revertedWith(
         "Ownable: caller is not the owner"
      );
   });

   it("fails if vote session not ended", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);

      await expect(Voting.countVotes()).to.be.revertedWith(
         "Voting session not ended"
      );
   });

   it("fails if nobody voted", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal0");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();
      await Voting.endVotingSession();

      await expect(Voting.countVotes()).to.be.revertedWith("Nobody voted");
   });

   it("count vote, 1 vote for proposal1", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("proposal1");
      expect(result[totalVote]).to.be.equal(1);
      expect(result[winningVote]).to.be.equal(1);
   });

   it("count vote, 1 vote for proposal1, 2 vote for proposal2", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.connect(voter2).registerProposal("proposal2");
      await Voting.connect(voter3).registerProposal("proposal3");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.connect(voter2).addVote(2);
      await Voting.connect(voter3).addVote(2);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("proposal2");
      expect(result[totalVote]).to.be.equal(3);
      expect(result[winningVote]).to.be.equal(2);
   });

   it("count vote, 2 vote for proposal1, 1 vote for proposal2", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.connect(voter2).registerProposal("proposal2");
      await Voting.connect(voter3).registerProposal("proposal3");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.connect(voter2).addVote(1);
      await Voting.connect(voter3).addVote(2);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("proposal1");
      expect(result[totalVote]).to.be.equal(3);
      expect(result[winningVote]).to.be.equal(2);
   });

   it("count vote, 1 vote for proposal1, 2 vote for proposal2, 1 vote for proposal3", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.addVoter(voter4.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.connect(voter2).registerProposal("proposal2");
      await Voting.connect(voter3).registerProposal("proposal3");
      await Voting.connect(voter4).registerProposal("proposal4");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.connect(voter2).addVote(2);
      await Voting.connect(voter3).addVote(2);
      await Voting.connect(voter4).addVote(3);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("proposal2");
      expect(result[totalVote]).to.be.equal(4);
      expect(result[winningVote]).to.be.equal(2);
   });

   it("count vote, 1 vote for proposal1, 2 vote for proposal2, 1 vote for proposal3, 1 blank vote", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.addVoter(voter4.address);
      await Voting.addVoter(voter5.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.connect(voter2).registerProposal("proposal2");
      await Voting.connect(voter3).registerProposal("proposal3");
      await Voting.connect(voter4).registerProposal("proposal4");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.connect(voter2).addVote(2);
      await Voting.connect(voter3).addVote(2);
      await Voting.connect(voter4).addVote(3);
      await Voting.connect(voter5).addVote(0);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("proposal2");
      expect(result[totalVote]).to.be.equal(5);
      expect(result[winningVote]).to.be.equal(2);
   });

   it("count vote, 1 vote for proposal1, 2 vote for blank", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("proposal1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.connect(voter2).addVote(0);
      await Voting.connect(voter3).addVote(0);
      await Voting.endVotingSession();

      await Voting.countVotes();
      const result = await Voting.getWinningProposal();
      expect(result[winningProposal]).to.be.equal("Blank vote");
      expect(result[totalVote]).to.be.equal(3);
      expect(result[winningVote]).to.be.equal(2);
   });
});

describe("Test get winning proposal", function () {
   beforeEach(async function () {
      [owner, voter1] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("can be call by anyone", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(1);
      await Voting.endVotingSession();
      await Voting.countVotes();
      await Voting.connect(voter1).getWinningProposal();
   });

   it("fails if vote not tallied", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.endVotingSession();
      await expect(Voting.getWinningProposal()).to.be.revertedWith(
         "Vote not tallied"
      );
   });
});
