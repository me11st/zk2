"use client";

import React, { useEffect, useState } from "react";
import { connect } from "@argent/get-starknet";

// Replace mock wallet connect with real StarkNet wallet connect
export default function PublicVotingPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, { up: number; flag: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "flag">>({});
  const [loading, setLoading] = useState(false);

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
  // TODO: Replace with Supabase fetch when ready
  useEffect(() => {
    if (wallet) {
      fetch("/ai_results.json")
        .then((res) => res.json())
        .then((data) => {
          setProposals(data);
          // Initialize votes using submission_id as key
          const initialVotes: Record<string, { up: number, flag: number }> = {};
          data.forEach((p: any) => {
            initialVotes[p.submission_id] = { up: 0, flag: 0 };
          });
          setVotes(initialVotes);
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
    if (userVotes[submission_id]) return; // Already voted
    setVotes((v) => ({
      ...v,
      [submission_id]: {
        up: v[submission_id].up + (type === "up" ? 1 : 0),
        flag: v[submission_id].flag + (type === "flag" ? 1 : 0),
      },
    }));
    setUserVotes((uv) => ({ ...uv, [submission_id]: type }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-3xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-10">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>🖥️ Public Voting Dashboard - zkTender</h1>
          <div className="mb-6 flex justify-center">
            {wallet ? (
              <button 
                className="px-5 py-2 rounded-lg font-semibold" 
                style={{ background: "#4D4D4D", color: "#fff" }} 
                onClick={disconnectWallet}
                disabled={loading}
              >
                Disconnect ({wallet.slice(0, 6)}...)
              </button>
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
            <div className="text-center" style={{ color: "#4D4D4D", opacity: 0.7, marginTop: 32 }}>
              Please connect your wallet to view and vote on proposals.
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center" style={{ color: "#4D4D4D", opacity: 0.7, marginTop: 32 }}>
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
                  <div className="text-xs mb-3" style={{ color: "#4D4D4D", opacity: 0.6 }}>
                    Evaluated: {new Date(p.timestamp).toLocaleString()}
                  </div>
                  {userVotes[p.submission_id] ? (
                    <div className="text-green-600 text-sm font-bold">You've already voted ({userVotes[p.submission_id] === "up" ? "Upvoted" : "Flagged"})</div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
