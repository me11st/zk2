#!/bin/bash

echo "🏗️ zkTender Multi-Instance Demo"
echo "================================"
echo ""

echo "📊 Available Tender Instances:"
curl -s http://localhost:3003/api/instances | jq '.instances[] | {id: .id, phase: .phase, status: .status}'
echo ""

echo "🔍 Detailed Instance Information:"
echo ""

for instance in zk1 zk2 zk3 zk4; do
  echo "📋 Instance: $instance"
  echo "--------------------"
  
  # Get instance details
  curl -s http://localhost:3003/api/instances/$instance | jq '{phase: .phase, name: .name, status: .status, total_submissions: .total_submissions}'
  
  # Get public state
  echo "🔒 Public State:"
  curl -s http://localhost:3003/api/instances/$instance/public-state | jq '{current_phase: .current_phase, total_submissions: .total_submissions, message: .message}'
  
  # Get revealed proposals (if available)
  echo "📝 Revealed Proposals:"
  revealed=$(curl -s http://localhost:3003/api/instances/$instance/revealed)
  proposal_count=$(echo "$revealed" | jq '.revealed_proposals | length')
  
  if [ "$proposal_count" -gt 0 ]; then
    echo "$revealed" | jq '.revealed_proposals[] | {company: .company_name, project: .project_title, budget: .budget}'
  else
    echo "$revealed" | jq '.message'
  fi
  
  # Get voting statistics (if available)
  echo "🗳️ Voting Statistics:"
  voting=$(curl -s http://localhost:3003/api/instances/$instance/votes/statistics)
  vote_count=$(echo "$voting" | jq '.voting_statistics | length')
  
  if [ "$vote_count" -gt 0 ]; then
    echo "$voting" | jq '.voting_statistics[]'
  else
    echo "$voting" | jq '.message'
  fi
  
  echo ""
  echo "----------------------------------------"
  echo ""
done

echo "🌐 Frontend Access:"
echo "==================="
echo "• Main App: http://localhost:3002"
echo "• Public Voting: http://localhost:3002/public-vote"
echo "• Final Results: http://localhost:3002/final-evaluations"
echo "• Submissions: http://localhost:3002/submissions"
echo ""

echo "🎯 Demo Workflow:"
echo "================="
echo "1. zk1 (FINAL): View complete results and rankings"
echo "2. zk2 (SUBMISSION): Submit new proposals"
echo "3. zk3 (SUBMISSION): Submit new proposals"
echo "4. zk4 (VOTING): Vote on revealed proposals"
echo ""

echo "🔧 Phase Management:"
echo "==================="
echo "To advance an instance phase (admin only):"
echo "curl -X POST http://localhost:3003/api/instances/zk2/advance-phase -H 'Content-Type: application/json' -d '{\"new_phase\": \"voting\"}'"
