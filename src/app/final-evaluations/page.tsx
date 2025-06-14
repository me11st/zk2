"use client";

import React, { useEffect, useState } from "react";
import ProgressIndicator from "../components/ProgressIndicator";

export default function FinalEvaluationsPage() {
  const [finalEvaluations, setFinalEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3003/api/final-evaluations")
      .then((res) => res.json())
      .then((data) => {
        setFinalEvaluations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load final evaluations:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#4D4D4D" }}>
        <div className="text-white text-xl">Loading final evaluations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      {/* Progress Indicator */}
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="results" />
      </div>
      
      {/* Main Content */}
      <div className="w-full max-w-3xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-10">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>
            🏆 Final AI Evaluations - Full Disclosure
          </h1>
          
          <div className="mb-6 text-center" style={{ color: "#4D4D4D" }}>
            <p>Post-voting evaluations with complete company disclosure and bias detection</p>
          </div>

          {finalEvaluations.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
              <div className="text-xl mb-4">No final evaluations yet</div>
              <div className="text-sm">Final evaluations are generated after the voting period closes</div>
            </div>
          ) : (
            <div className="space-y-8">
              {finalEvaluations.map((evaluation) => (
                <div key={evaluation.id} className="border-2 rounded-xl p-6 shadow" style={{ background: "#f9f9f9", borderColor: "#ddd", borderRadius: 8 }}>
                  
                  {/* Header with company name and recommendation */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: "#4D4D4D" }}>
                        {evaluation.company_name}
                      </h2>
                      <div className="text-sm" style={{ color: "#4D4D4D" }}>
                        Submission ID: {evaluation.submission_id}
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-bold text-white ${
                      evaluation.recommendation === 'approve' ? 'bg-green-600' :
                      evaluation.recommendation === 'reject' ? 'bg-red-600' : 'bg-orange-600'
                    }`}>
                      {evaluation.recommendation.toUpperCase().replace('_', ' ')}
                    </div>
                  </div>

                  {/* Score and confidence */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-lg" style={{ background: "#fff" }}>
                      <div className="text-3xl font-bold" style={{ color: "#4D4D4D" }}>
                        {evaluation.final_score}/100
                      </div>
                      <div className="text-sm" style={{ color: "#4D4D4D" }}>Final Score</div>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: "#fff" }}>
                      <div className="text-3xl font-bold" style={{ color: "#4D4D4D" }}>
                        {(evaluation.ai_confidence_level * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm" style={{ color: "#4D4D4D" }}>AI Confidence</div>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ background: "#fff" }}>
                      <div className={`text-3xl font-bold ${evaluation.audit_trigger ? 'text-red-600' : 'text-green-600'}`}>
                        {evaluation.audit_trigger ? 'YES' : 'NO'}
                      </div>
                      <div className="text-sm" style={{ color: "#4D4D4D" }}>Audit Required</div>
                    </div>
                  </div>

                  {/* Company details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-bold mb-2" style={{ color: "#4D4D4D" }}>Company Information</h3>
                      <div className="space-y-2 text-sm" style={{ color: "#4D4D4D" }}>
                        <div><strong>Ownership:</strong> {evaluation.ownership_structure}</div>
                        <div><strong>Past Performance:</strong> {evaluation.past_performance}</div>
                        <div><strong>Legal Status:</strong> {evaluation.legal_compliance_status}</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold mb-2" style={{ color: "#4D4D4D" }}>Risk Assessment</h3>
                      <div className="space-y-2 text-sm" style={{ color: "#4D4D4D" }}>
                        <div><strong>Risk Level:</strong> {evaluation.risk_assessment}</div>
                        <div><strong>Bias Check:</strong> {evaluation.bias_detection_results}</div>
                        <div><strong>Insider Connections:</strong> {evaluation.insider_connection_check}</div>
                      </div>
                    </div>
                  </div>

                  {/* Public voting impact */}
                  <div className="mb-6">
                    <h3 className="font-bold mb-2" style={{ color: "#4D4D4D" }}>Public Voting Impact</h3>
                    <div className="p-4 rounded-lg" style={{ background: "#fff" }}>
                      <div className="text-sm mb-2" style={{ color: "#4D4D4D" }}><strong>Voting Results:</strong> {evaluation.public_vote_impact}</div>
                      <div className="text-sm" style={{ color: "#4D4D4D" }}><strong>Flag Analysis:</strong> {evaluation.flag_analysis}</div>
                    </div>
                  </div>

                  {/* Final summary */}
                  <div className="mb-4">
                    <h3 className="font-bold mb-2" style={{ color: "#4D4D4D" }}>Final Assessment</h3>
                    <div className="p-4 rounded-lg" style={{ background: "#fff" }}>
                      <p className="text-sm" style={{ color: "#4D4D4D" }}>{evaluation.final_summary}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs" style={{ color: "#4D4D4D" }}>
                    Evaluated: {new Date(evaluation.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
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
              href="/public-vote"
              className="px-6 py-3 rounded-lg font-semibold"
              style={{ background: "#4D4D4D", color: "#fff" }}
            >
              🗳️ Public Voting
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
