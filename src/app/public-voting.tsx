"use client";

import React, { useEffect, useState } from "react";

// Mock wallet connect (replace with Wagmi/Ethers for real integration)
function useMockWallet() {
  const [address, setAddress] = useState<string | null>(null);
  return {
    address,
    connect: () => setAddress("0x1234...abcd"),
    disconnect: () => setAddress(null),
  };
}

export default function PublicVoting() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [votes, setVotes] = useState<Record<number, { up: number; flag: number }>>({});
  const [userVotes, setUserVotes] = useState<Record<number, "up" | "flag">>({});
  const wallet = useMockWallet();

  useEffect(() => {
    fetch("/src/app/ai_results.json")
      .then((res) => res.json())
      .then((data) => {
        setProposals(data);
        // Initialize votes if not present
        const initialVotes: Record<number, { up: number; flag: number }> = {};
        data.forEach((p: any) => {
          initialVotes[p.id] = { up: 0, flag: 0 };
        });
        setVotes(initialVotes);
      });
  }, []);

  const handleVote = (id: number, type: "up" | "flag") => {
    if (!wallet.address) return;
    if (userVotes[id]) return; // Already voted
    setVotes((v) => ({
      ...v,
      [id]: {
        up: v[id].up + (type === "up" ? 1 : 0),
        flag: v[id].flag + (type === "flag" ? 1 : 0),
      },
    }));
    setUserVotes((uv) => ({ ...uv, [id]: type }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-2xl bg-white shadow-lg p-8" style={{ borderRadius: 4, border: '2px solid #eee' }}>
        <h1 className="text-2xl font-bold mb-4 text-center" style={{ color: "#4D4D4D" }}>🖥️ Public Voting - zkTender</h1>
        <div className="mb-4 flex justify-center">
          {wallet.address ? (
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={wallet.disconnect}>
              Disconnect ({wallet.address.slice(0, 6)}...)
            </button>
          ) : (
            <button className="px-4 py-2 bg-black text-white rounded" onClick={wallet.connect}>
              Connect Wallet
            </button>
          )}
        </div>
        {/* Only show proposals if wallet is connected */}
        {wallet.address ? (
          <div className="space-y-6">
            {proposals.map((p) => (
              <div key={p.id} className="border p-4 bg-gray-100" style={{ borderRadius: 2, border: '1.5px solid #ddd' }}>
                <div className="font-semibold text-lg mb-1" style={{ color: "#4D4D4D" }}>{p.proposal_title}</div>
                <div className="text-sm mb-2 whitespace-pre-line" style={{ color: "#4D4D4D" }}>
                  {p.ai_evaluation}
                </div>
                <div className="flex gap-4 items-center mb-2">
                  <span className="text-xs" style={{ color: "#4D4D4D" }}>Upvotes: {votes[p.id]?.up ?? 0}</span>
                  <span className="text-xs" style={{ color: "#4D4D4D" }}>Flags: {votes[p.id]?.flag ?? 0}</span>
                </div>
                {userVotes[p.id] ? (
                  <div className="text-green-600 text-xs font-semibold">You've already voted ({userVotes[p.id] === "up" ? "Upvoted" : "Flagged"})</div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded"
                      onClick={() => handleVote(p.id, "up")}
                    >
                      Upvote
                    </button>
                    <button
                      className="px-3 py-1 bg-red-500 text-white rounded"
                      onClick={() => handleVote(p.id, "flag")}
                    >
                      Flag
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-center mt-8" style={{ color: "#666" }}>Connect wallet to view and vote on proposals</div>
        )}
      </div>
    </div>
  );
}
