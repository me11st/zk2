"use client";

import { useState, useEffect } from "react";
import { buildPoseidon } from "circomlibjs";
import type { BigNumberish } from "circomlibjs";
import { connect } from "@argent/get-starknet";
import ProgressIndicator from "./components/ProgressIndicator";
import InstanceSelector from "./components/InstanceSelector";

export default function Home() {
  const [step, setStep] = useState<"welcome" | "connected" | "zk1" | "zk2" | "zk3" | "submitted">("welcome");
  const [wallet, setWallet] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null); // for real wallet account
  const [currentInstance, setCurrentInstance] = useState("zk2"); // Default to zk2 (submission phase)
  const [instances, setInstances] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    feasibility: "",
    budget: "",
    innovation: "",
    attachment: null as File | null,
    attachmentUrl: "",
    // New project fields
    projectTitle: "",
    location: "",
    plannedStartDate: "",
    plannedEndDate: "",
    materialPlan: "",
    materialPlanFile: null as File | null,
    constructionPlan: "",
    sustainabilityMeasures: "",
    communityEngagement: "",
    pastProjects: "",
  });
  const [loading, setLoading] = useState(false);
  const [poseidon, setPoseidon] = useState<((inputs: BigNumberish[]) => bigint) | null>(null);

  // Add state for proposal visibility and submission deadline
  const [proposalsVisible, setProposalsVisible] = useState(false);
  const SUBMISSION_DEADLINE = new Date('2025-07-01T00:00:00Z'); // Example deadline

  // Load available instances
  useEffect(() => {
    const loadPoseidon = async () => {
      const poseidonInstance = await buildPoseidon();
      const poseidonHash = (inputs: BigNumberish[]) => {
        if (!Array.isArray(inputs) || inputs.length === 0) {
          throw new Error("Poseidon inputs must be a non-empty array.");
        }

        try {
          const result = poseidonInstance(inputs);
          return poseidonInstance.F.toObject(result) as bigint;
        } catch (err) {
          console.error("Poseidon hash failed:", err);
          return BigInt(0); // fallback
        }
      };

      setPoseidon(() => poseidonHash);
    };
    loadPoseidon();
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const connection = await connect({ modalMode: "alwaysAsk" });

      if (!connection) {
        throw new Error("No wallet connection returned");
      }

      await connection.enable(); // Prompt Braavos to connect (important!)

      const address = connection.selectedAddress;
      const account = connection.account;

      if (!connection.isConnected || !account || !address) {
        throw new Error("Wallet is not fully connected");
      }

      setWallet(address);
      setAccount(account);
      setStep("connected");
    } catch (err) {
      console.error("Wallet connect error:", err);
      if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message.includes('cancelled')) {
        alert("Connection was cancelled. Please try again.");
      } else {
        alert("Wallet connection failed or was cancelled.");
      }
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as any;
    if (name === "attachment" && files && files[0]) {
      setForm((f) => ({ ...f, attachment: files[0] }));
    } else if (name === "materialPlanFile" && files && files[0]) {
      setForm((f) => ({ ...f, materialPlanFile: files[0] }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate all required fields
      if (!form.name || isNaN(Number(form.feasibility)) || isNaN(Number(form.budget)) || isNaN(Number(form.innovation)) ||
          !form.projectTitle || !form.location || !form.plannedStartDate || !form.plannedEndDate ||
          !form.materialPlan || !form.constructionPlan || !form.sustainabilityMeasures ||
          !form.communityEngagement || !form.pastProjects) {
        alert("Please fill in all required fields correctly.");
        setLoading(false);
        return;
      }

      if (!poseidon) {
        alert("Poseidon hash function is still loading. Try again in a second.");
        setLoading(false);
        return;
      }

      // Create commitment hash of ALL proposal data for ZK privacy
      const proposalData = {
        name: form.name,
        projectTitle: form.projectTitle,
        location: form.location,
        budget: Number(form.budget),
        feasibility: Number(form.feasibility),
        innovation: Number(form.innovation),
        plannedStartDate: form.plannedStartDate,
        plannedEndDate: form.plannedEndDate,
        materialPlan: form.materialPlan,
        constructionPlan: form.constructionPlan,
        sustainabilityMeasures: form.sustainabilityMeasures,
        communityEngagement: form.communityEngagement,
        pastProjects: form.pastProjects,
        timestamp: new Date().toISOString()
      };

      // Generate ZK commitment hash
      const commitmentHash = poseidon([
        form.name.length,
        form.projectTitle.length,
        Number(form.feasibility),
        Number(form.budget),
        Number(form.innovation),
        form.location.length
      ]).toString();

      // Generate nullifier to prevent double submission
      const nullifierHash = poseidon([
        wallet?.length || 0,
        Date.now() % 1000000,
        commitmentHash.length
      ]).toString();

      // Encrypt proposal data (simplified - in real implementation would use proper encryption)
      const encryptedData = JSON.stringify(proposalData);

      // Generate mock ZK proof (in real implementation, this would be a proper ZK-SNARK proof)
      const zkProof = JSON.stringify({
        proof: "mock_zk_proof_" + commitmentHash.substring(0, 16),
        public_signals: [commitmentHash, nullifierHash],
        verification_key: "mock_vk",
        timestamp: Date.now()
      });

      // Submit ONLY commitment hash - NO SENSITIVE DATA
      const response = await fetch(`http://localhost:3003/api/instances/${currentInstance}/proposals/commit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          commitment_hash: commitmentHash,
          nullifier_hash: nullifierHash,
          wallet_address: wallet || 'mock_wallet',
          encrypted_proposal_data: encryptedData,
          zk_proof: zkProof
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Proposal commitment failed');
      }

      console.log('✅ ZK Proposal commitment submitted:', result);
      alert(`✅ Proposal committed successfully!\n\nCommitment ID: ${result.submission_id}\nCommitment Hash: ${result.commitment_hash}\n\nYour proposal data remains private until the reveal phase.`);
      setStep("submitted");

    } catch (err: any) {
      console.error("Error during ZK commitment:", err);
      alert(`Submission failed: ${err.message || 'Unknown error'}`);
    }
    setLoading(false);
  };

  // const checkBalanceAndSubmit = async () => {
  //   try {
  //     if (!account) {
  //       alert("Wallet not connected.");
  //       return;
  //     }
  //     // Mock functionality - transaction logic would go here
  //   } catch (err: any) {
  //     console.error("Error checking balance or submitting transaction:", err);
  //     alert("Something went wrong. Check the console for details.");
  //   }
  // };

  // Replace the real balance check with a mock
  async function fetchMockERC20Balance(walletAddress: string) {
    console.log("Mock balance check for:", walletAddress);
    // Always return 1000 tokens for demo
    return 1000;
  }

  useEffect(() => {
    const checkBalance = async () => {
      if (!account) return;
      try {
        // const ETH_ADDRESS = "0x049d36570d4e46e6dd3a78d6e21b2c6b6c38c2c0a0c47e4fc1c7aab5d5c0b8f8";
        // const call = {
        //   contractAddress: ETH_ADDRESS,
        //   entrypoint: "balanceOf",
        //   calldata: [account.address],
        // };
        // const result = await sepoliaProvider.callContract(call);
        // const balance = BigInt(result[0]);
        // if (balance === BigInt(0)) {
        //   alert("⚠️ You don't have any Sepolia ETH. Please top up your StarkNet wallet before submitting a proposal.");
        // }
      } catch (err) {
        console.error("Error checking balance after wallet connect:", err);
      }
    };
    checkBalance();
  }, [account]);

  // Mock balance state
  // const [balance, setBalance] = useState(0);
  const [balanceWarning, setBalanceWarning] = useState(false);

  useEffect(() => {
    if (wallet) {
      fetchMockERC20Balance(wallet).then((bal) => {
        // setBalance(bal);
        setBalanceWarning(bal === 0);
      });
    }
  }, [wallet]);

  // MOCK: Remove all real provider/sepoliaProvider/callContract logic for balance
  // Instead, always set a mock balance and skip any contract call
  useEffect(() => {
    if (wallet) {
      // Always set a mock balance for demo
      // setBalance(1000);
      setBalanceWarning(false); // No warning, always has balance
    }
  }, [wallet]);

  // On mount or interval, check if deadline has passed
  useEffect(() => {
    const checkDeadline = () => {
      if (new Date() >= SUBMISSION_DEADLINE) {
        setProposalsVisible(true);
      } else {
        setProposalsVisible(false);
      }
    };
    checkDeadline();
    const interval = setInterval(checkDeadline, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [SUBMISSION_DEADLINE]);

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      {/* Progress Indicator */}
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator 
          currentPhase="submit" 
          deadline={SUBMISSION_DEADLINE}
        />
      </div>

      {/* Instance Selector */}
      <div className="w-full max-w-4xl px-4 mb-6">
        <InstanceSelector 
          currentInstance={currentInstance}
          onInstanceChange={setCurrentInstance}
          showDescription={true}
        />
      </div>
      
      {/* Main Content */}
      <div className="w-full max-w-3xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-8 flex flex-col gap-6">
          {step === "welcome" && (
            <>
              <h1 className="text-2xl font-bold text-center mb-2" style={{ color: "#4D4D4D" }}>
                Welcome to the zkTender!
              </h1>
              <p className="text-center mb-4" style={{ color: "#4D4D4D" }}>
                You are about to start your proposal. Please be sure you have a Braavos or Argent wallet.
              </p>
              <button
                className="w-full py-2 px-4 font-semibold transition"
                style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            </>
          )}
          {step === "connected" && (
            <>
              <div className="font-semibold text-center mb-2" style={{ color: "#4D4D4D" }}>
                Success! Wallet connected.
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  className="py-2 px-4 transition"
                  style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                  onClick={() => setStep("zk2")}
                >
                  zk2
                </button>
                <button
                  className="py-2 px-4 transition"
                  style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                  onClick={() => setStep("zk3")}
                >
                  zk3
                </button>
              </div>
            </>
          )}
          {(step === "zk1" || step === "zk2" || step === "zk3") && (
            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#4D4D4D" }}>
                Submit Proposal ({step.toUpperCase()})
              </h2>
              
              {/* Project Basic Info */}
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="name"
                placeholder="Company/Organization Name *"
                value={form.name}
                onChange={handleChange}
                required
              />
              
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="projectTitle"
                placeholder="Project Title *"
                value={form.projectTitle}
                onChange={handleChange}
                required
              />
              
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="location"
                placeholder="Project Location *"
                value={form.location}
                onChange={handleChange}
                required
              />

              {/* Project Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                    Planned Start Date *
                  </label>
                  <input
                    className="border px-3 py-2 w-full"
                    style={{ borderRadius: 8, color: "#4D4D4D" }}
                    name="plannedStartDate"
                    type="date"
                    value={form.plannedStartDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                    Planned End Date *
                  </label>
                  <input
                    className="border px-3 py-2 w-full"
                    style={{ borderRadius: 8, color: "#4D4D4D" }}
                    name="plannedEndDate"
                    type="date"
                    value={form.plannedEndDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Budget and Scoring */}
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="budget"
                placeholder="Budget Estimate (USD) *"
                type="number"
                min="0"
                max="99999999"
                value={form.budget}
                onChange={handleChange}
                required
              />

              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="feasibility"
                placeholder="Feasibility Score (0-99) *"
                type="number"
                min="0"
                max="99"
                value={form.feasibility}
                onChange={handleChange}
                required
              />

              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="innovation"
                placeholder="Innovation Rating (0-99) *"
                type="number"
                min="0"
                max="99"
                value={form.innovation}
                onChange={handleChange}
                required
              />

              {/* Material Plan */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                  Material Plan *
                </label>
                <textarea
                  className="border px-3 py-2 w-full"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="materialPlan"
                  placeholder="Describe your material requirements and sourcing plan"
                  value={form.materialPlan}
                  onChange={handleChange}
                  rows={3}
                  required
                />
                <input
                  className="border px-3 py-2 mt-2 w-full text-sm"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="materialPlanFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleChange}
                />
                <p className="text-xs mt-1" style={{ color: "#666" }}>Optional: Upload detailed material plan</p>
              </div>

              {/* Construction Plan */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                  Construction Plan Timeline *
                </label>
                <textarea
                  className="border px-3 py-2 w-full"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="constructionPlan"
                  placeholder="Outline your construction timeline and key milestones"
                  value={form.constructionPlan}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>

              {/* Sustainability Measures */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                  Sustainability Measures *
                </label>
                <textarea
                  className="border px-3 py-2 w-full"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="sustainabilityMeasures"
                  placeholder="Describe your environmental and sustainability initiatives"
                  value={form.sustainabilityMeasures}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>

              {/* Community Engagement */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                  Community Engagement Strategy *
                </label>
                <textarea
                  className="border px-3 py-2 w-full"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="communityEngagement"
                  placeholder="How will you engage with and benefit the local community?"
                  value={form.communityEngagement}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>

              {/* Past Projects */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#4D4D4D" }}>
                  Past Similar Projects *
                </label>
                <textarea
                  className="border px-3 py-2 w-full"
                  style={{ borderRadius: 8, color: "#4D4D4D" }}
                  name="pastProjects"
                  placeholder="Provide links or brief summaries of similar projects you've completed"
                  value={form.pastProjects}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>

              {/* General Attachments */}
              <input
                className="border px-3 py-2"
                style={{ borderRadius: 8, color: "#4D4D4D" }}
                name="attachment"
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={handleChange}
              />
              <button
                className="w-full py-2 px-4 font-semibold transition mt-2"
                style={{ background: "#4D4D4D", color: "#fff", borderRadius: 8 }}
                type="submit"
                disabled={loading || !poseidon}
              >
                {loading ? "Submitting..." : "Submit Proposal"}
              </button>
            </form>
          )}
          {step === "submitted" && (
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl text-center" style={{ color: "#4D4D4D" }}>
                ✅ Proposal Submitted!
              </div>
              <p className="text-sm text-center" style={{ color: "#666" }}>
                Thank you for participating in zkTender. Your submission has been recorded.
              </p>
            </div>
          )}
          {balanceWarning && (
            <div className="text-red-500 text-sm text-center">
              ⚠️ Your balance is low. Please ensure you have enough tokens for the transaction.
            </div>
          )}
          {!proposalsVisible ? (
            <div className="text-center" style={{ color: "#666", marginTop: 32 }}>
              Proposals are hidden until the submission deadline for privacy. Please check back after {SUBMISSION_DEADLINE.toLocaleString()}.
            </div>
          ) : (
            <div className="text-center" style={{ color: "#4D4D4D", marginTop: 32 }}>
              {/* Example: After the deadline, proposals would be listed here. */}
              <div className="font-bold">Proposals Revealed!</div>
              <div className="italic">(This is a placeholder. Integrate your proposal list here.)</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation Container */}
      <div className="w-full max-w-3xl mt-6" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-6">
          <div className="flex justify-center gap-4">
            <a
              href="/submissions"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              📊 View Submissions
            </a>
            <a
              href="/public-vote"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🗳️ Public Voting
            </a>
            <a
              href="/final-evaluations"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🏆 Final Results
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
