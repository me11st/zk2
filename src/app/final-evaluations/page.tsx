"use client";

import React, { useEffect, useState } from "react";
import ProgressIndicator from "../components/ProgressIndicator";
import InstanceSelector from "../components/InstanceSelector";

interface SystemState {
  current_phase: string;
  submission_deadline: string;
  reveal_deadline: string;
  voting_deadline: string;
  total_submissions: number;
}

interface VotingStats {
  submission_id: string;
  total_votes: number;
  support_votes: number;
  concern_votes: number;
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

export default function FinalEvaluationsPage() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [revealedProposals, setRevealedProposals] = useState<RevealedProposal[]>([]);
  const [votingStats, setVotingStats] = useState<VotingStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentInstance, setCurrentInstance] = useState('zk1');

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:3003/api/instances/${currentInstance}/public-state`).then(res => res.json()),
      fetch(`http://localhost:3003/api/instances/${currentInstance}/revealed`).then(res => res.json()),
      fetch(`http://localhost:3003/api/instances/${currentInstance}/votes/statistics`).then(res => res.json())
    ])
    .then(([systemData, revealedData, votingData]) => {
      setSystemState(systemData);
      setRevealedProposals(revealedData.revealed_proposals || []);
      setVotingStats(votingData.voting_statistics || []);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to load final results data:", err);
      setLoading(false);
    });
  }, [currentInstance]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#4D4D4D" }}>
        <div className="text-white text-xl">Loading final results...</div>
      </div>
    );
  }

  const isFinalPhase = systemState?.current_phase === 'final' || systemState?.current_phase === 'reveal';
  
  // Calculate final scores and rankings
  const proposalsWithScores = revealedProposals.map(proposal => {
    const voting = votingStats.find(v => v.submission_id === proposal.submission_id);
    const supportRate = voting ? (voting.support_votes / Math.max(voting.total_votes, 1)) * 100 : 0;
    const concernRate = voting ? (voting.concern_votes / Math.max(voting.total_votes, 1)) * 100 : 0;
    
    // Calculate comprehensive score
    const technicalScore = (proposal.feasibility_score + proposal.innovation_score) / 2;
    const publicScore = Math.max(0, supportRate - concernRate);
    const finalScore = Math.round(technicalScore * 0.7 + publicScore * 0.3);
    
    // Determine recommendation
    let recommendation = 'reject';
    let recommendationColor = 'bg-red-600';
    if (finalScore >= 80 && concernRate < 20) {
      recommendation = 'approve';
      recommendationColor = 'bg-green-600';
    } else if (finalScore >= 65 && concernRate < 30) {
      recommendation = 'conditional';
      recommendationColor = 'bg-orange-600';
    }

    return {
      ...proposal,
      voting: voting || { total_votes: 0, support_votes: 0, concern_votes: 0 },
      supportRate,
      concernRate,
      technicalScore,
      publicScore,
      finalScore,
      recommendation,
      recommendationColor
    };
  }).sort((a, b) => b.finalScore - a.finalScore); // Sort by final score descending

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-4xl px-4 mb-4">
        <InstanceSelector 
          currentInstance={currentInstance}
          onInstanceChange={setCurrentInstance}
        />
      </div>
      
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="results" />
      </div>
      
      <div className="w-full max-w-7xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-8">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>
            🏆 Final Results for {currentInstance.toUpperCase()} - Complete Evaluation
          </h1>
          
          <div className="mb-8 p-4 rounded-lg" style={{ background: "#f8f9fa", border: "2px solid #e9ecef" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Current Phase</div>
                <div className="text-lg font-bold" style={{ color: "#4D4D4D" }}>
                  {systemState?.current_phase?.toUpperCase() || 'LOADING...'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Proposals</div>
                <div className="text-lg font-bold" style={{ color: "#4D4D4D" }}>
                  {revealedProposals.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Approved</div>
                <div className="text-lg font-bold text-green-600">
                  {proposalsWithScores.filter(p => p.recommendation === 'approve').length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Rejected</div>
                <div className="text-lg font-bold text-red-600">
                  {proposalsWithScores.filter(p => p.recommendation === 'reject').length}
                </div>
              </div>
            </div>
          </div>

          {!isFinalPhase ? (
            <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
              <div className="text-6xl mb-4">⏳</div>
              <div className="text-xl font-bold mb-2">Final Results Not Yet Available</div>
              <div className="text-sm">Results will be published after the reveal and voting phases are complete</div>
              <div className="text-xs mt-2" style={{ color: "#666" }}>
                Current Phase: {systemState?.current_phase || 'Unknown'}
              </div>
            </div>
          ) : proposalsWithScores.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
              <div className="text-6xl mb-4">📋</div>
              <div className="text-xl font-bold mb-2">No Proposals Revealed</div>
              <div className="text-sm">No proposals have been revealed with ZK proofs yet</div>
            </div>
          ) : (
            <div className="space-y-6">
              {proposalsWithScores.map((proposal, index) => (
                <div 
                  key={proposal.submission_id} 
                  className={`border-2 rounded-xl p-6 shadow-lg ${
                    index === 0 ? 'border-yellow-400 bg-yellow-50' : 
                    proposal.recommendation === 'approve' ? 'border-green-200 bg-green-50' :
                    proposal.recommendation === 'conditional' ? 'border-orange-200 bg-orange-50' :
                    'border-red-200 bg-red-50'
                  }`}
                >
                  {/* Ranking Badge */}
                  {index === 0 && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-yellow-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                        🥇 TOP RANKED PROPOSAL
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: "#4D4D4D" }}>
                        {proposal.company_name}
                      </h2>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {proposal.project_title}
                      </h3>
                      <div className="text-sm text-gray-600">
                        📍 {proposal.location} • 💰 ${proposal.budget.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {proposal.submission_id} • Rank: #{index + 1}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-white ${proposal.recommendationColor}`}>
                      {proposal.recommendation.toUpperCase()}
                    </div>
                  </div>

                  {/* Scoring Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-white shadow">
                      <div className="text-2xl font-bold" style={{ color: "#4D4D4D" }}>
                        {proposal.finalScore}
                      </div>
                      <div className="text-xs text-gray-600">Final Score</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white shadow">
                      <div className="text-xl font-bold text-blue-600">
                        {proposal.feasibility_score}
                      </div>
                      <div className="text-xs text-gray-600">Feasibility</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white shadow">
                      <div className="text-xl font-bold text-purple-600">
                        {proposal.innovation_score}
                      </div>
                      <div className="text-xs text-gray-600">Innovation</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white shadow">
                      <div className="text-xl font-bold text-green-600">
                        {proposal.supportRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600">Support Rate</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-white shadow">
                      <div className="text-xl font-bold text-red-600">
                        {proposal.concernRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-600">Concern Rate</div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: "#4D4D4D" }}>📋 Project Information</h4>
                      <div className="space-y-2 text-sm bg-white p-4 rounded-lg shadow">
                        <div><strong>Timeline:</strong> {proposal.planned_start_date} → {proposal.planned_end_date}</div>
                        <div><strong>Material Plan:</strong> {proposal.material_plan}</div>
                        <div><strong>Construction:</strong> {proposal.construction_plan}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold mb-3" style={{ color: "#4D4D4D" }}>🌱 Sustainability & Community</h4>
                      <div className="space-y-2 text-sm bg-white p-4 rounded-lg shadow">
                        <div><strong>Environmental:</strong> {proposal.sustainability_measures}</div>
                        <div><strong>Community:</strong> {proposal.community_engagement}</div>
                        <div><strong>Experience:</strong> {proposal.past_projects}</div>
                      </div>
                    </div>
                  </div>

                  {/* Voting Results */}
                  <div className="mb-4">
                    <h4 className="font-bold mb-3" style={{ color: "#4D4D4D" }}>🗳️ Anonymous Voting Results</h4>
                    <div className="bg-white p-4 rounded-lg shadow">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">Total Votes: {proposal.voting.total_votes}</span>
                        <span className="text-sm">Support: {proposal.voting.support_votes} | Concerns: {proposal.voting.concern_votes}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-green-500 h-4 rounded-l-full flex items-center justify-center text-xs text-white font-bold"
                          style={{ width: `${proposal.supportRate}%` }}
                        >
                          {proposal.supportRate > 15 ? `${proposal.supportRate.toFixed(0)}%` : ''}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Assessment */}
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h4 className="font-bold mb-2" style={{ color: "#4D4D4D" }}>🎯 Final Assessment</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Technical Excellence:</strong> {proposal.technicalScore.toFixed(1)}/100 
                      (Feasibility: {proposal.feasibility_score}, Innovation: {proposal.innovation_score})
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Public Confidence:</strong> {proposal.publicScore.toFixed(1)}/100 
                      (Support rate minus concern rate)
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Recommendation:</strong> 
                      {proposal.recommendation === 'approve' && ' This proposal meets all technical and public confidence criteria for approval.'}
                      {proposal.recommendation === 'conditional' && ' This proposal shows merit but requires additional review or conditions.'}
                      {proposal.recommendation === 'reject' && ' This proposal does not meet the minimum criteria for approval.'}
                    </p>
                  </div>

                  <div className="text-xs text-gray-500 mt-4">
                    Revealed: {new Date(proposal.reveal_timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
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
              onClick={() => window.location.href = "/submissions"}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              📊 View Submissions
            </button>
            <button
              onClick={() => window.location.href = "/public-vote"}
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🗳️ Anonymous Voting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
