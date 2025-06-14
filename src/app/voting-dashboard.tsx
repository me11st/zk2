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

export default function VotingDashboard() {
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
    <div className="min-h-screen bg-blue-50 flex flex-col items-center py-8">
      <div className="w-full max-w-3xl bg-white shadow-2xl p-10 rounded-2xl border-2 border-blue-200">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-blue-900">🖥️ Public Voting Dashboard - zkTender</h1>
        <div className="mb-6 flex justify-center">
          {wallet.address ? (
            <button className="px-5 py-2 bg-blue-100 rounded-lg text-blue-900 font-semibold" onClick={wallet.disconnect}>
              Disconnect ({wallet.address.slice(0, 6)}...)
            </button>
          ) : (
            <button className="px-5 py-2 bg-blue-700 text-white rounded-lg font-semibold" onClick={wallet.connect}>
              Connect Wallet
            </button>
          )}
        </div>
        <div className="space-y-8">
          {proposals.map((p) => (
            <div key={p.id} className="border-2 border-blue-100 rounded-xl p-6 bg-blue-50 shadow">
              <div className="font-bold text-xl mb-2 text-blue-800">{p.proposal_title}</div>
              <div className="text-base text-gray-800 mb-3 whitespace-pre-line">
                {p.ai_evaluation}
              </div>
              <div className="flex gap-6 items-center mb-3">
                <span className="text-sm text-blue-700">Upvotes: {votes[p.id]?.up ?? 0}</span>
                <span className="text-sm text-red-600">Flags: {votes[p.id]?.flag ?? 0}</span>
              </div>
              {wallet.address ? (
                userVotes[p.id] ? (
                  <div className="text-green-700 text-sm font-bold">You've already voted ({userVotes[p.id] === "up" ? "Upvoted" : "Flagged"})</div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      className="px-4 py-1 bg-green-600 text-white rounded-lg font-semibold"
                      onClick={() => handleVote(p.id, "up")}
                    >
                      Upvote
                    </button>
                    <button
                      className="px-4 py-1 bg-red-600 text-white rounded-lg font-semibold"
                      onClick={() => handleVote(p.id, "flag")}
                    >
                      Flag
                    </button>
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-500">Connect wallet to vote</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
