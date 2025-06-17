"use client";

import { useEffect, useState } from "react";
import ProgressIndicator from "../components/ProgressIndicator";

interface Submission {
  submission_id: string;
  name: string;
  project_title?: string;
  location?: string;
  budget: number;
  planned_start_date?: string;
  planned_end_date?: string;
  material_plan?: string;
  construction_plan?: string;
  sustainability_measures?: string;
  community_engagement?: string;
  past_projects?: string;
  feasibility: number;
  innovation: number;
  timestamp: string;
  status?: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3003/api/proposals")
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load submissions:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#4D4D4D" }}>
        <div className="text-white text-xl">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-8" style={{ background: "#4D4D4D" }}>
      <div className="w-full max-w-4xl px-4 mb-8">
        <ProgressIndicator currentPhase="submit" />
      </div>
      
      <div className="w-full max-w-7xl" style={{ background: "#fff", borderRadius: 8, border: "2px solid #fff", boxShadow: "0 4px 16px rgba(0,0,0,0.10)" }}>
        <div className="p-8">
          <h1 className="text-3xl font-extrabold mb-6 text-center" style={{ color: "#4D4D4D" }}>
            📊 Project Submissions - zkTender
          </h1>
          
          <div className="mb-6 text-center" style={{ color: "#4D4D4D" }}>
            <p>Comprehensive view of all submitted project proposals</p>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12" style={{ color: "#4D4D4D" }}>
              <div className="text-6xl mb-4">📭</div>
              <div className="text-xl font-bold mb-2">No submissions yet</div>
              <div className="text-sm">Waiting for project proposals to be submitted</div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Construction Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sustainability</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Community Engagement</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Past Projects</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scores</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((submission, index) => (
                    <tr key={submission.submission_id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{submission.name}</div>
                        <div className="text-xs text-gray-500">{submission.submission_id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.project_title || "N/A"}>
                          {submission.project_title || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.location || "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${submission.budget?.toLocaleString() || "N/A"}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.planned_start_date && submission.planned_end_date ? (
                          <div>
                            <div>{submission.planned_start_date}</div>
                            <div className="text-xs text-gray-500">to {submission.planned_end_date}</div>
                          </div>
                        ) : "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.material_plan || "N/A"}>
                          {submission.material_plan || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.construction_plan || "N/A"}>
                          {submission.construction_plan || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.sustainability_measures || "N/A"}>
                          {submission.sustainability_measures || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.community_engagement || "N/A"}>
                          {submission.community_engagement || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate" title={submission.past_projects || "N/A"}>
                          {submission.past_projects || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>F: {submission.feasibility}/100</div>
                        <div>I: {submission.innovation}/100</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {submission.status || "Submitted"} ✔️
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              🗳️ Public Voting
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
