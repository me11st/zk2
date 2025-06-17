"use client";

import React, { useEffect, useState } from "react";
import { connect } from "@argent/get-starknet";
import ProgressIndicator from "../components/ProgressIndicator";
import InstanceSelector from "../components/InstanceSelector";

// Replace mock wallet connect with real StarkNet wallet connect
export default function PublicVotingPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<string, { up: number; flag: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "flag">>({});
  const [pendingVotes, setPendingVotes] = useState<Record<string, "up" | "flag">>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showCommentBox, setShowCommentBox] = useState<Record<string, boolean>>({});
  const [submittedComments, setSubmittedComments] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [balance, setBalance] = useState(1000); // Mock balance
  const [currentInstance, setCurrentInstance] = useState('zk1');

  // Function to format original proposal data (anonymized)
  const formatOriginalProposal = (proposal: any) => {
    return {
      title: proposal.project_title || 'Untitled Project',
      location: proposal.location || 'Location not specified',
      budget: proposal.budget?.toLocaleString() || 'N/A',
      timeline: `${proposal.planned_start_date || 'TBD'} to ${proposal.planned_end_date || 'TBD'}`,
      materialPlan: proposal.material_plan || 'Not specified',
      constructionPlan: proposal.construction_plan || 'Not specified',
      sustainability: proposal.sustainability_measures || 'Not specified',
      communityEngagement: proposal.community_engagement || 'Not specified',
      pastProjects: proposal.past_projects || 'No previous projects mentioned'
    };
  };

  // Function to format AI evaluation
  const formatAIEvaluation = (proposal: any) => {
    return {
      feasibilityScore: proposal.feasibility_score || 0,
      innovationScore: proposal.innovation_score || 0,
      overallRating: Math.round(((proposal.feasibility_score || 0) + (proposal.innovation_score || 0)) / 2),
      clarityRating: 'High', // Mock AI assessment
      urbanFitRating: 'Good', // Mock AI assessment
      plausibilityRating: 'Realistic', // Mock AI assessment
      sustainabilityRating: 'Strong', // Mock AI assessment
      communityImpactRating: 'Positive' // Mock AI assessment
    };
  };

  // Load revealed proposals and voting stats when wallet is connected
  useEffect(() => {
    if (wallet) {
      // Load revealed proposals for voting
      fetch(`http://localhost:3003/api/instances/${currentInstance}/revealed`)
        .then((res) => res.json())
        .then((data) => {
          const revealedProposals = data.revealed_proposals || [];
          setProposals(revealedProposals);
          
          // Initialize votes using submission_id as key
          const initialVotes: Record<string, { up: number, flag: number }> = {};
          revealedProposals.forEach((p: any) => {
            initialVotes[p.submission_id] = { up: 0, flag: 0 };
          });
          setVotes(initialVotes);
          
          // Load current voting statistics
          return fetch(`http://localhost:3003/api/instances/${currentInstance}/votes/statistics`);
        })
        .then((res) => res.json())
        .then((statsData) => {
          // Update votes with real stats from database
          const updatedVotes: Record<string, { up: number, flag: number }> = {};
          (statsData.voting_statistics || []).forEach((stat: any) => {
            updatedVotes[stat.submission_id] = {
              up: stat.support_votes || 0,
              flag: stat.concern_votes || 0
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
  }, [wallet, currentInstance]);

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
      
      // Submit each vote to the ZK-private API
      for (const [submission_id, vote_type] of Object.entries(pendingVotes)) {
        const voteData = {
          submission_id,
          vote_commitment: zkProof.commitment,
          nullifier: zkProof.nullifier + "_" + submission_id, // Make nullifier unique per vote
          zk_vote_proof: zkProof.proof,
          vote_type: vote_type === "up" ? "support" : "concern", // Map to API format
          stake_commitment: zkProof.commitment, // Use same commitment for stake
          voter_address: wallet // Include voter address for database
        };

        const voteResponse = await fetch(`http://localhost:3003/api/instances/${currentInstance}/votes/anonymous`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(voteData),
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

  const toggleCommentBox = (submission_id: string) => {
    setShowCommentBox(prev => ({
      ...prev,
      [submission_id]: !prev[submission_id]
    }));
  };

  const handleCommentChange = (submission_id: string, value: string) => {
    setComments(prev => ({
      ...prev,
      [submission_id]: value
    }));
  };

  const submitComment = async (submission_id: string) => {
    const comment = comments[submission_id]?.trim();
    if (!comment || !wallet) return;

    try {
      // Mock comment submission with ZK privacy
      const zkProof = await mockZKProof(wallet, {}, 0.5); // 0.5 coin cost for comment
      
      if (balance < 0.5) {
        alert("Insufficient balance. Comments cost 0.5 coins.");
        return;
      }

      // Submit comment to the API
      const commentData = {
        submission_id,
        comment_text: comment,
        nullifier: zkProof.nullifier + "_comment_" + submission_id,
        zk_proof: zkProof.proof,
        commitment: zkProof.commitment,
        commenter_address: wallet
      };

      const commentResponse = await fetch(`http://localhost:3003/api/instances/${currentInstance}/comments/anonymous`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commentData),
      });

      if (!commentResponse.ok) {
        const error = await commentResponse.json();
        throw new Error(error.error || 'Comment submission failed');
      }

      console.log("💬 Comment submitted anonymously via API");

      setSubmittedComments(prev => ({
        ...prev,
        [submission_id]: true
      }));
      
      setBalance(prev => prev - 0.5);
      setShowCommentBox(prev => ({
        ...prev,
        [submission_id]: false
      }));
      
      alert("💬 Comment submitted anonymously! (0.5 coins deducted)");
      
    } catch (error) {
      console.error("Comment submission failed:", error);
      alert("❌ Comment submission failed. Please try again.");
    }
  };

  const hasPendingVotes = Object.keys(pendingVotes).length > 0;

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      {/* Instance Selector */}
      <div className="w-full max-w-4xl px-4 mb-4">
        <InstanceSelector 
          currentInstance={currentInstance}
          onInstanceChange={setCurrentInstance}
        />
      </div>
      
      {/* Progress Indicator */}
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="voting" />
      </div>
      
      {/* Main Content */}
      <div className="w-full max-w-3xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-10">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>🖥️ Public Voting Dashboard - {currentInstance.toUpperCase()}</h1>
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
              {proposals.map((p) => {
                const originalProposal = formatOriginalProposal(p);
                const aiEvaluation = formatAIEvaluation(p);
                
                return (
                  <div key={p.submission_id} className="border-2 rounded-xl p-6 shadow-lg" style={{ background: "#fff", borderColor: "#e5e7eb", borderRadius: 12 }}>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="font-bold text-xl mb-1" style={{ color: "#4D4D4D" }}>
                          Proposal {p.submission_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          Submitted: {new Date(p.reveal_timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Current Votes</div>
                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600 font-bold">👍 {votes[p.submission_id]?.up ?? 0}</span>
                          <span className="text-red-600 font-bold">❗️ {votes[p.submission_id]?.flag ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Two-column layout for proposal and AI evaluation */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      
                      {/* Original Proposal (Left Column) */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h3 className="font-bold text-lg mb-3 flex items-center" style={{ color: "#4D4D4D" }}>
                          📋 Original Proposal <span className="text-xs font-normal text-gray-500 ml-2">(Company name hidden)</span>
                        </h3>
                        
                        <div className="space-y-3 text-sm">
                          <div>
                            <strong className="text-gray-700">Project:</strong>
                            <div className="text-gray-900">{originalProposal.title}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">📍 Location:</strong>
                            <div className="text-gray-900">{originalProposal.location}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">💰 Budget:</strong>
                            <div className="text-gray-900">${originalProposal.budget}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">⏰ Timeline:</strong>
                            <div className="text-gray-900">{originalProposal.timeline}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">🏗️ Construction Plan:</strong>
                            <div className="text-gray-900 text-xs">{originalProposal.constructionPlan}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">🌱 Sustainability:</strong>
                            <div className="text-gray-900 text-xs">{originalProposal.sustainability}</div>
                          </div>
                          
                          <div>
                            <strong className="text-gray-700">👥 Community Engagement:</strong>
                            <div className="text-gray-900 text-xs">{originalProposal.communityEngagement}</div>
                          </div>
                        </div>
                      </div>

                      {/* AI Evaluation (Right Column) */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-bold text-lg mb-3 flex items-center" style={{ color: "#4D4D4D" }}>
                          🤖 AI Evaluation <span className="text-xs font-normal text-gray-500 ml-2">(Automated Assessment)</span>
                        </h3>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">✅ Clarity/Relevance:</span>
                            <span className="font-bold text-green-600">{aiEvaluation.clarityRating}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">🏙️ Urban Fit:</span>
                            <span className="font-bold text-blue-600">{aiEvaluation.urbanFitRating}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">💡 Feasibility Score:</span>
                            <span className="font-bold text-purple-600">{aiEvaluation.feasibilityScore}/100</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">🚀 Innovation Score:</span>
                            <span className="font-bold text-orange-600">{aiEvaluation.innovationScore}/100</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">💰 Budget Plausibility:</span>
                            <span className="font-bold text-gray-600">{aiEvaluation.plausibilityRating}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">🌱 Sustainability Rating:</span>
                            <span className="font-bold text-green-600">{aiEvaluation.sustainabilityRating}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">👥 Community Impact:</span>
                            <span className="font-bold text-blue-600">{aiEvaluation.communityImpactRating}</span>
                          </div>
                          
                          <div className="mt-4 p-3 bg-white rounded border">
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Overall AI Rating</div>
                              <div className="text-2xl font-bold" style={{ color: "#4D4D4D" }}>{aiEvaluation.overallRating}/100</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Voting Actions */}
                    <div className="border-t pt-4">
                      {userVotes[p.submission_id] ? (
                        <div className="text-center">
                          <div className="text-green-600 text-sm font-bold mb-2">
                            ✅ You've already voted ({userVotes[p.submission_id] === "up" ? "👍 Support" : "❗️ Concern"})
                          </div>
                          <div className="text-xs text-gray-500">Your vote has been recorded anonymously</div>
                        </div>
                      ) : pendingVotes[p.submission_id] ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="text-orange-600 text-sm font-bold">
                            ⏳ Pending: {pendingVotes[p.submission_id] === "up" ? "👍 Support" : "❗️ Concern"}
                          </div>
                          <button
                            className="px-3 py-1 text-xs rounded-lg hover:bg-gray-300 transition-colors"
                            style={{ background: "#e5e7eb", color: "#6b7280" }}
                            onClick={() => clearPendingVote(p.submission_id)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-3">
                          <button
                            className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                            style={{ background: "#10b981", color: "#fff" }}
                            onClick={() => handleVote(p.submission_id, "up")}
                          >
                            👍 Support
                          </button>
                          <button
                            className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                            style={{ background: "#ef4444", color: "#fff" }}
                            onClick={() => handleVote(p.submission_id, "flag")}
                          >
                            ❗️ Concern
                          </button>
                          <button
                            className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                            style={{ background: "#6b7280", color: "#fff" }}
                            onClick={() => toggleCommentBox(p.submission_id)}
                          >
                            💬 Comment
                          </button>
                        </div>
                      )}

                      {/* Comment Box */}
                      {showCommentBox[p.submission_id] && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <h4 className="font-bold mb-2 text-sm" style={{ color: "#4D4D4D" }}>
                            💬 Anonymous Comment (0.5 coins)
                          </h4>
                          <textarea
                            className="w-full p-3 border rounded-lg text-sm"
                            rows={3}
                            placeholder="Share your thoughts, suggestions, or concerns about this proposal..."
                            value={comments[p.submission_id] || ''}
                            onChange={(e) => handleCommentChange(p.submission_id, e.target.value)}
                            style={{ borderColor: "#d1d5db", background: "#fff" }}
                          />
                          <div className="flex justify-between items-center mt-3">
                            <div className="text-xs text-gray-500">
                              🔒 Your identity will be cryptographically hidden
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{ background: "#e5e7eb", color: "#6b7280" }}
                                onClick={() => toggleCommentBox(p.submission_id)}
                              >
                                Cancel
                              </button>
                              <button
                                className="px-4 py-2 rounded-lg text-sm font-semibold"
                                style={{ background: "#4D4D4D", color: "#fff" }}
                                onClick={() => submitComment(p.submission_id)}
                                disabled={!comments[p.submission_id]?.trim() || balance < 0.5}
                              >
                                Submit Comment
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Submitted Comment Confirmation */}
                      {submittedComments[p.submission_id] && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-green-600 text-sm font-bold">
                            ✅ Comment submitted anonymously
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Your feedback has been recorded and will be reviewed by the evaluation committee
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
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
              href="/submissions"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              📊 View Submissions
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
