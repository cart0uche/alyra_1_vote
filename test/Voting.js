const { expect } = require("chai");
const { ethers } = require("hardhat");

let Voting_Factory;
let Voting;

const RegisteringVoters = 0;
const ProposalsRegistrationStarted = 1;
const ProposalsRegistrationEnded = 2;
const VotingSessionStarted = 3;
const VotingSessionEnded = 4;
const VotesTallie = 5;

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

      // VotingSessionEnded => VotesTallie
      await expect(await Voting.tallyVote())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(VotingSessionEnded, VotesTallie);
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

      await expect(Voting.connect(voter1).tallyVote()).to.be.revertedWith(
         "Ownable: caller is not the owner"
      );
      Voting.tallyVote();
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

      await Voting.tallyVote();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Not in a registering voters session"
      );
   });

   it("fails if a voter try to add in whitelist", async function () {
      await expect(
         Voting.connect(voter1).addVoter(voter1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
   });
});

describe("Test adding a proposal", function () {
   beforeEach(async function () {
      [owner, voter1, voter2] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event when a proposal is added", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();

      await expect(
         await Voting.connect(voter1).registerProposal("description1")
      )
         .to.emit(Voting, "ProposalRegistered")
         .withArgs(1);

      await expect(
         await Voting.connect(voter2).registerProposal("description2")
      )
         .to.emit(Voting, "ProposalRegistered")
         .withArgs(2);
   });

   it("fails if a voter is not register", async function () {
      await Voting.startProposalsRegistration();

      await expect(
         Voting.connect(voter1).registerProposal("description0")
      ).to.be.revertedWith("Voter not registred");
   });

   it("fails if a voter propose twice", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();

      await Voting.connect(voter1).registerProposal("description0");
      await expect(
         Voting.connect(voter1).registerProposal("description0")
      ).to.be.revertedWith("Voter already proposed");
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

      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "proposalId not valid"
      );

      await expect(Voting.connect(voter1).addVote(2)).to.be.revertedWith(
         "proposalId not valid"
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

      await Voting.tallyVote();
      await expect(Voting.connect(voter1).addVote(1)).to.be.revertedWith(
         "Not in a vote session"
      );
   });
});

describe("Test getting a winner", function () {
   beforeEach(async function () {
      [owner, voter1, voter2, voter3, voter4] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("fail if not called by owner", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await expect(Voting.connect(voter1).getWinner()).to.be.revertedWith(
         "Ownable: caller is not the owner"
      );
   });

   it("fail if vote session not ended", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);

      await expect(Voting.getWinner()).to.be.revertedWith(
         "Voting session not ended"
      );
   });

   it("get winner, 1 vote for proposal 0", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.endVotingSession();

      const result = await Voting.getWinner();
      expect(result).to.equal(0);
   });

   it("get winner, 1 vote for proposal 0, 2 vote for proposal1", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.connect(voter3).registerProposal("description3");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.connect(voter2).addVote(1);
      await Voting.connect(voter3).addVote(1);
      await Voting.endVotingSession();

      const result = await Voting.getWinner();
      expect(result).to.equal(1);
   });

   it("get winner, 2 vote for proposal 0, 1 vote for proposal1", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.connect(voter3).registerProposal("description3");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.connect(voter2).addVote(0);
      await Voting.connect(voter3).addVote(1);
      await Voting.endVotingSession();

      const result = await Voting.getWinner();
      expect(result).to.equal(0);
   });

   it("get winner, 1 vote for proposal0, 2 vote for proposal1, 1 vote for proposal2", async function () {
      await Voting.addVoter(voter1.address);
      await Voting.addVoter(voter2.address);
      await Voting.addVoter(voter3.address);
      await Voting.addVoter(voter4.address);
      await Voting.startProposalsRegistration();
      await Voting.connect(voter1).registerProposal("description1");
      await Voting.connect(voter2).registerProposal("description2");
      await Voting.connect(voter3).registerProposal("description3");
      await Voting.connect(voter4).registerProposal("description4");
      await Voting.endProposalsRegistration();
      await Voting.startVotingSession();

      await Voting.connect(voter1).addVote(0);
      await Voting.connect(voter2).addVote(1);
      await Voting.connect(voter3).addVote(1);
      await Voting.connect(voter4).addVote(2);
      await Voting.endVotingSession();

      const result = await Voting.getWinner();
      expect(result).to.equal(1);
   });
});
