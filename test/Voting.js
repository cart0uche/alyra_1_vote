const { expect } = require("chai");
const { ethers } = require("hardhat");

let Voting_Factory;
let Voting;
let owner;

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

   it("emit event at workflow changes", async function () {
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

   it("change workflow is only allowed for owner", async function () {
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

   it("add in whitelist only allowed in step RegisteringVoters", async function () {
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

   it("change workflow is only allowed for owner", async function () {
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
});
