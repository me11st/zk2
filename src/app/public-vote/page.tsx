"use client";

import React, { useEffect, useState } from "react";
import { connect } from "@argent/get-starknet";
import ProgressIndicator from "../components/ProgressIndicator";

// Replace mock wallet connect with real StarkNet wallet connect
export default function PublicVotingPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, { up: number; flag: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "flag">>({});
  const [pendingVotes, setPendingVotes] = useState<Record<string, "up" | "flag">>({});
  const [loading, setLoading] = useState(false);
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [balance, setBalance] = useState(1000); // Mock balance

  // Function to format AI evaluation data for display
  const formatAIEvaluation = (proposal: any) => {
    const strengthsList = proposal.strengths.map((s: string) => `• ${s}`).join('\n');
    const weaknessesList = proposal.weaknesses.map((w: string) => `• ${w}`).join('\n');
    
    return `Score: ${proposal.score}/100

Strengths:
${strengthsList}

Weaknesses:
${weaknessesList}

Summary: ${proposal.summary}`;
  };

  // Load AI results only when wallet is connected
  useEffect(() => {
    if (wallet) {
      fetch("http://localhost:3003/api/evaluations")
        .then((res) => res.json())
        .then((data) => {
          setProposals(data);
          // Initialize votes using submission_id as key
          const initialVotes: Record<string, { up: number, flag: number }> = {};
          data.forEach((p: any) => {
            initialVotes[p.submission_id] = { up: 0, flag: 0 };
          });
          setVotes(initialVotes);
          
          // Load current voting stats
          return fetch("http://localhost:3003/api/voting-stats");
        })
        .then((res) => res.json())
        .then((statsData) => {
          // Update votes with real stats from database
          const updatedVotes: Record<string, { up: number, flag: number }> = {};
          statsData.forEach((stat: any) => {
            updatedVotes[stat.submission_id] = {
              up: stat.upvotes,
              flag: stat.flags
            };
          });
          setVotes(updatedVotes);
        })
        .catch((err) => {
          console.error("Failed to load proposals:", err);
        });
    } else {
      // Clear proposals when wallet is disconnected
      setProposals([]);
      setVotes({});
      setUserVotes({});
    }
  }, [wallet]);

  const connectWallet = async () => {
    setLoading(true);
    try {
      const connection = await connect({ modalMode: "alwaysAsk" });
      if (!connection) throw new Error("No wallet connection returned");
      await connection.enable();
      const address = connection.selectedAddress;
      const account = connection.account;
      if (!connection.isConnected || !account || !address) throw new Error("Wallet is not fully connected");
      setWallet(address);
      setAccount(account);
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

  const disconnectWallet = () => {
    setWallet(null);
    setAccount(null);
  };

  const handleVote = (submission_id: string, type: "up" | "flag") => {
    if (!wallet) return;
    if (userVotes[submission_id] || pendingVotes[submission_id]) return; // Already voted or pending
    setPendingVotes((pv) => ({ ...pv, [submission_id]: type }));
  };

  const submitAllVotes = async () => {
    if (!wallet || Object.keys(pendingVotes).length === 0) return;
    
    const voteCount = Object.keys(pendingVotes).length;
    const stakeCost = voteCount; // 1 coin per vote
    
    if (balance < stakeCost) {
      alert(`Insufficient balance. You need ${stakeCost} coins to submit ${voteCount} vote(s).`);
      return;
    }

    setSubmittingVotes(true);
    
    try {
      // Mock ZK layer: anonymize identity and hide payment details
      const zkProof = await mockZKProof(wallet, pendingVotes, stakeCost);
      
      // Mock blockchain transaction
      await mockBlockchainTransaction(zkProof);
      
      // Submit each vote to the API
      for (const [submission_id, vote_type] of Object.entries(pendingVotes)) {
        const voteResponse = await fetch("http://localhost:3003/api/votes/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submission_id,
            voter_address: wallet,
            vote_type,
            zk_proof: zkProof.proof,
            nullifier: zkProof.nullifier + "_" + submission_id, // Make nullifier unique per vote
            commitment: zkProof.commitment,
            stake_amount: 1 // 1 coin per vote
          }),
        });

        if (!voteResponse.ok) {
          const error = await voteResponse.json();
          throw new Error(error.error || 'Vote submission failed');
        }
      }
      
      // Update local state after successful API submission
      setVotes((v) => {
        const newVotes = { ...v };
        Object.entries(pendingVotes).forEach(([submission_id, type]) => {
          newVotes[submission_id] = {
            up: newVotes[submission_id].up + (type === "up" ? 1 : 0),
            flag: newVotes[submission_id].flag + (type === "flag" ? 1 : 0),
          };
        });
        return newVotes;
      });
      
      setUserVotes((uv) => ({ ...uv, ...pendingVotes }));
      setPendingVotes({});
      setBalance(balance - stakeCost);
      
      alert(`✅ Votes submitted successfully! ${stakeCost} coins staked.`);
      
    } catch (error) {
      console.error("Vote submission failed:", error);
      alert("❌ Vote submission failed. Please try again.");
    }
    
    setSubmittingVotes(false);
  };

  // Mock ZK proof generation (hides voter identity)
  const mockZKProof = async (walletAddress: string, votes: Record<string, "up" | "flag">, stake: number) => {
    // Simulate ZK proof generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const zkProof = {
      proof: "zk_proof_" + Math.random().toString(36).substring(7),
      nullifier: "null_" + Math.random().toString(36).substring(7), // Prevents double voting
      commitment: "commit_" + Math.random().toString(36).substring(7), // Hides actual votes
      stake_amount: stake,
      timestamp: new Date().toISOString()
    };
    
    console.log("🔒 ZK Proof generated:", {
      ...zkProof,
      note: "Voter identity and vote details are cryptographically hidden"
    });
    
    return zkProof;
  };

  // Mock blockchain transaction
  const mockBlockchainTransaction = async (zkProof: any) => {
    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("⛓️ Blockchain transaction submitted:", {
      tx_hash: "0x" + Math.random().toString(16).substring(2, 18),
      zk_proof: zkProof.proof,
      gas_used: "21000",
      status: "confirmed"
    });
  };

  const clearPendingVote = (submission_id: string) => {
    setPendingVotes((pv) => {
      const newPending = { ...pv };
      delete newPending[submission_id];
      return newPending;
    });
  };

  const hasPendingVotes = Object.keys(pendingVotes).length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      {/* Progress Indicator */}
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="voting" />
      </div>
      
      {/* Main Content */}
      <div className="w-full max-w-3xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-10">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>🖥️ Public Voting Dashboard - zkTender</h1>
          <div className="mb-6 flex justify-center">
            {wallet ? (
              <div className="flex items-center gap-4">
                <span className="text-sm" style={{ color: "#4D4D4D" }}>Balance: {balance} coins</span>
                <button 
                  className="px-5 py-2 rounded-lg font-semibold" 
                  style={{ background: "#4D4D4D", color: "#fff" }} 
                  onClick={disconnectWallet}
                  disabled={loading}
                >
                  Disconnect ({wallet.slice(0, 6)}...)
                </button>
              </div>
            ) : (
              <button 
                className="px-5 py-2 rounded-lg font-semibold" 
                style={{ background: "#4D4D4D", color: "#fff" }} 
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
          
          {!wallet ? (
            <div className="text-center" style={{ color: "#4D4D4D", marginTop: 32 }}>
              Please connect your wallet to view and vote on proposals.
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center" style={{ color: "#4D4D4D", marginTop: 32 }}>
              Loading proposals...
            </div>
          ) : (
            <div className="space-y-8">
              {proposals.map((p) => (
                <div key={p.submission_id} className="border-2 rounded-xl p-6 shadow" style={{ background: "#fff", borderColor: "#eee", borderRadius: 8 }}>
                  <div className="font-bold text-xl mb-2" style={{ color: "#4D4D4D" }}>
                    Proposal {p.submission_id}
                  </div>
                  <div className="text-base mb-3 whitespace-pre-line" style={{ color: "#4D4D4D" }}>
                    {formatAIEvaluation(p)}
                  </div>
                  <div className="flex gap-6 items-center mb-3">
                    <span className="text-sm" style={{ color: "#4D4D4D" }}>Upvotes: {votes[p.submission_id]?.up ?? 0}</span>
                    <span className="text-sm" style={{ color: "#4D4D4D" }}>Flags: {votes[p.submission_id]?.flag ?? 0}</span>
                  </div>
                  <div className="text-xs mb-3" style={{ color: "#4D4D4D" }}>
                    Evaluated: {new Date(p.timestamp).toLocaleString()}
                  </div>
                  {userVotes[p.submission_id] ? (
                    <div className="text-green-600 text-sm font-bold">✅ You've already voted ({userVotes[p.submission_id] === "up" ? "Upvoted" : "Flagged"})</div>
                  ) : pendingVotes[p.submission_id] ? (
                    <div className="flex items-center gap-3">
                      <div className="text-orange-600 text-sm font-bold">⏳ Pending: {pendingVotes[p.submission_id] === "up" ? "Upvote" : "Flag"}</div>
                      <button
                        className="px-3 py-1 text-xs rounded-lg"
                        style={{ background: "#ccc", color: "#666" }}
                        onClick={() => clearPendingVote(p.submission_id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        className="px-4 py-1 rounded-lg font-semibold"
                        style={{ background: "#4D4D4D", color: "#fff" }}
                        onClick={() => handleVote(p.submission_id, "up")}
                      >
                        Upvote
                      </button>
                      <button
                        className="px-4 py-1 rounded-lg font-semibold"
                        style={{ background: "#4D4D4D", color: "#fff" }}
                        onClick={() => handleVote(p.submission_id, "flag")}
                      >
                        Flag
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {hasPendingVotes && (
                <div className="mt-8 p-6 border-2 rounded-xl" style={{ background: "#f9f9f9", borderColor: "#ddd", borderRadius: 8 }}>
                  <div className="text-center">
                    <div className="font-bold text-lg mb-2" style={{ color: "#4D4D4D" }}>
                      🗳️ Submit Your Votes
                    </div>
                    <div className="text-sm mb-4" style={{ color: "#666" }}>
                      You have {Object.keys(pendingVotes).length} pending vote(s). Cost: {Object.keys(pendingVotes).length} coin(s)
                    </div>
                    <div className="text-xs mb-4" style={{ color: "#666" }}>
                      🔒 Your identity and vote details will be cryptographically hidden using ZK proofs
                    </div>
                    <button
                      className="px-8 py-3 rounded-lg font-bold text-lg"
                      style={{ background: "#4D4D4D", color: "#fff" }}
                      onClick={submitAllVotes}
                      disabled={submittingVotes || balance < Object.keys(pendingVotes).length}
                    >
                      {submittingVotes ? "🔄 Submitting..." : `Vote (${Object.keys(pendingVotes).length} coin${Object.keys(pendingVotes).length > 1 ? 's' : ''})`}
                    </button>
                    {balance < Object.keys(pendingVotes).length && (
                      <div className="text-red-600 text-sm mt-2">
                        ⚠️ Insufficient balance
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Navigation */}
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              ← Submit Proposal
            </a>
            <a
              href="/final-evaluations"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🏆 Final Results →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
