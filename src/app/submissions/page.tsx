"use client";

import { useEffect, useState } from "react";
import ProgressIndicator from "../components/ProgressIndicator";
import InstanceSelector from "../components/InstanceSelector";

interface SystemState {
  current_phase: string;
  submission_deadline: string;
  reveal_deadline: string;
  voting_deadline: string;
  total_submissions: number;
  anonymous_commitments: Array<{
    id: string;
    commitment_preview: string;
    timestamp: string;
    status: string;
  }>;
  message: string;
}

interface RevealedProposal {
  submission_id: string;
  company_name: string;
  project_title: string;
  location: string;
  budget: number;
  feasibility_score: number;
  innovation_score: number;
  planned_start_date: string;
  planned_end_date: string;
  material_plan: string;
  construction_plan: string;
  sustainability_measures: string;
  community_engagement: string;
  past_projects: string;
  reveal_timestamp: string;
}

export default function SubmissionsPage() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [revealedProposals, setRevealedProposals] = useState<RevealedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentInstance, setCurrentInstance] = useState('zk1');

  useEffect(() => {
    // Fetch instance-specific public state
    fetch(`http://localhost:3003/api/instances/${currentInstance}/public-state`)
      .then((res) => res.json())
      .then((data) => {
        setSystemState(data);
        
        // If in reveal phase or later, also fetch revealed proposals
        if (data.current_phase === 'reveal' || data.current_phase === 'final') {
          return fetch(`http://localhost:3003/api/instances/${currentInstance}/revealed`).then(res => res.json());
        }
        return Promise.resolve({ revealed_proposals: [] });
      })
      .then((revealData) => {
        if (revealData.revealed_proposals) {
          setRevealedProposals(revealData.revealed_proposals);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load submission data:", err);
        setLoading(false);
      });
  }, [currentInstance]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#4D4D4D" }}>
        <div className="text-white text-xl">Loading zkTender system state...</div>
      </div>
    );
  }

  if (!systemState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#4D4D4D" }}>
        <div className="text-white text-xl">❌ Failed to load system state</div>
      </div>
    );
  }

  const isRevealPhase = systemState.current_phase === 'reveal' || systemState.current_phase === 'final';

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-4xl px-4 mb-4">
        <InstanceSelector 
          currentInstance={currentInstance}
          onInstanceChange={setCurrentInstance}
        />
      </div>
      
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="submit" />
      </div>
      
      <div className="w-full max-w-7xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-8">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>
            🔒 zkTender {currentInstance.toUpperCase()} - Zero Knowledge Privacy Mode
          </h1>
          
          <div className="mb-8 p-4 rounded-lg" style={{ background: "#f8f9fa", border: "2px solid #e9ecef" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Current Phase</div>
                <div className="text-lg font-bold" style={{ color: "#4D4D4D" }}>
                  {systemState.current_phase.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Submissions</div>
                <div className="text-lg font-bold" style={{ color: "#4D4D4D" }}>
                  {systemState.total_submissions}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Submission Deadline</div>
                <div className="text-sm font-medium" style={{ color: "#4D4D4D" }}>
                  {new Date(systemState.submission_deadline).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Reveal Deadline</div>
                <div className="text-sm font-medium" style={{ color: "#4D4D4D" }}>
                  {new Date(systemState.reveal_deadline).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 text-center p-4 rounded-lg" style={{ background: "#e8f5e8", color: "#2d5a2d" }}>
            <div className="text-lg font-semibold mb-2">🔐 Privacy Protection Active</div>
            <div className="text-sm">{systemState.message}</div>
          </div>

          {!isRevealPhase ? (
            // PRIVACY PHASE - Only show commitment hashes
            <div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: "#4D4D4D" }}>
                📋 Anonymous Proposal Commitments
              </h2>
              
              <div className="mb-4 text-sm" style={{ color: "#666" }}>
                Only commitment hashes are visible until the reveal phase. All proposal details remain private.
              </div>

              {systemState.anonymous_commitments.length === 0 ? (
                <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
                  <div className="text-6xl mb-4">🔒</div>
                  <div className="text-xl font-bold mb-2">No commitments yet</div>
                  <div className="text-sm">Waiting for zero-knowledge proposal commitments</div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {systemState.anonymous_commitments.map((commitment, index) => (
                    <div 
                      key={commitment.id} 
                      className="p-4 border rounded-lg" 
                      style={{ background: "#f8f9fa", borderColor: "#e9ecef" }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-mono text-sm" style={{ color: "#4D4D4D" }}>
                            ID: {commitment.id}
                          </div>
                          <div className="font-mono text-xs text-gray-600">
                            Hash: {commitment.commitment_preview}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Committed: {new Date(commitment.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {commitment.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // REVEAL PHASE - Show revealed proposal details
            <div>
              <h2 className="text-2xl font-bold mb-4" style={{ color: "#4D4D4D" }}>
                📊 Revealed Project Proposals
              </h2>
              
              <div className="mb-4 text-sm" style={{ color: "#666" }}>
                Proposals have been revealed with zero-knowledge proofs after the submission deadline.
              </div>

              {revealedProposals.length === 0 ? (
                <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
                  <div className="text-6xl mb-4">⏳</div>
                  <div className="text-xl font-bold mb-2">No proposals revealed yet</div>
                  <div className="text-sm">Waiting for submitters to reveal their proposals with ZK proofs</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead style={{ background: "#f8f9fa" }}>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget (USD)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scores</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {revealedProposals.map((proposal, index) => (
                        <tr key={proposal.submission_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{proposal.company_name}</div>
                            <div className="text-xs text-gray-500">{proposal.submission_id}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={proposal.project_title}>
                              {proposal.project_title}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {proposal.location}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${proposal.budget.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{proposal.planned_start_date}</div>
                            <div className="text-xs text-gray-500">to {proposal.planned_end_date}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>F: {proposal.feasibility_score}/100</div>
                            <div>I: {proposal.innovation_score}/100</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              REVEALED ✔️
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => window.location.href = "/"}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              ← Submit New Proposal
            </button>
            <button
              onClick={() => window.location.href = "/public-vote"}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🗳️ Anonymous Voting
            </button>
            <button
              onClick={() => window.location.href = "/final-evaluations"}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🏆 Final Results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
