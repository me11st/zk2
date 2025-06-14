#!/bin/bash

# zkTender Demo Workflow Script
# This script demonstrates the complete tender lifecycle

echo "🚀 zkTender Complete Demo Workflow"
echo "=================================="
echo "📊 Features:"
echo "   • Real StarkNet wallet integration"
echo "   • Privacy-preserving ZK voting"
echo "   • AI evaluation system"
echo "   • Progress tracking timeline"
echo "   • Complete navigation circuit"
echo "=================================="

API_BASE="http://localhost:3003/api"
FRONTEND_URL="http://localhost:3005"

# Check if API server is running
echo "1. Checking API server..."
if curl -s "$API_BASE/health" > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server is not running. Please start it with: npm run server"
    exit 1
fi

# Check if frontend is running
echo "2. Checking frontend server..."
if curl -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend server is running"
else
    echo "❌ Frontend server is not running. Please start it with: npm run dev"
    exit 1
fi

echo ""
echo "🎯 Demo Workflow Steps:"
echo ""

# Submit a test proposal
echo "3. Submitting test proposal..."
PROPOSAL_RESPONSE=$(curl -s -X POST "$API_BASE/proposals/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart City Infrastructure Upgrade",
    "feasibility": 88,
    "budget": 2500000,
    "innovation": 92,
    "attachmentUrl": "ipfs://smart-city-proposal.pdf",
    "hash": "0xabcdef123456789",
    "wallet": "0xdemo_wallet_address",
    "step": "zk3",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  }')

SUBMISSION_ID=$(echo $PROPOSAL_RESPONSE | grep -o '"submission_id":"[^"]*"' | cut -d'"' -f4)
echo "✅ Proposal submitted with ID: $SUBMISSION_ID"

# Generate initial AI evaluation
echo "4. Generating initial AI evaluation (anonymized)..."
curl -s -X POST "$API_BASE/evaluations/generate" \
  -H "Content-Type: application/json" \
  -d '{"submission_id": "'$SUBMISSION_ID'"}' > /dev/null
echo "✅ Initial AI evaluation completed"

# Simulate public voting
echo "5. Simulating public voting..."
curl -s -X POST "$API_BASE/votes/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "'$SUBMISSION_ID'",
    "voter_address": "0xvoter1_demo",
    "vote_type": "up",
    "zk_proof": "zk_proof_demo1",
    "nullifier": "null_demo1_'$(date +%s)'",
    "commitment": "commit_demo1",
    "stake_amount": 1
  }' > /dev/null

curl -s -X POST "$API_BASE/votes/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "'$SUBMISSION_ID'",
    "voter_address": "0xvoter2_demo",
    "vote_type": "up",
    "zk_proof": "zk_proof_demo2",
    "nullifier": "null_demo2_'$(date +%s)'",
    "commitment": "commit_demo2",
    "stake_amount": 1
  }' > /dev/null

curl -s -X POST "$API_BASE/votes/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "'$SUBMISSION_ID'",
    "voter_address": "0xvoter3_demo",
    "vote_type": "flag",
    "zk_proof": "zk_proof_demo3",
    "nullifier": "null_demo3_'$(date +%s)'",
    "commitment": "commit_demo3",
    "stake_amount": 1
  }' > /dev/null

echo "✅ Simulated 3 votes (2 upvotes, 1 flag)"

# Generate final evaluation
echo "6. Generating final AI evaluation (with full disclosure)..."
FINAL_EVAL_RESPONSE=$(curl -s -X POST "$API_BASE/final-evaluations/generate" \
  -H "Content-Type: application/json" \
  -d '{"submission_id": "'$SUBMISSION_ID'"}')

echo "✅ Final evaluation completed"

# Display results
echo ""
echo "🎉 Demo Complete! Results Summary:"
echo "================================="

# Get voting stats
STATS=$(curl -s "$API_BASE/voting-stats")
echo "📊 Voting Statistics:"
echo "$STATS" | python3 -m json.tool 2>/dev/null || echo "$STATS"

echo ""
echo "🏆 Final Evaluation:"
FINAL_EVAL=$(curl -s "$API_BASE/final-evaluations")
echo "$FINAL_EVAL" | python3 -m json.tool 2>/dev/null || echo "$FINAL_EVAL"

echo ""
echo "🌐 Frontend URLs:"
echo "Main App: $FRONTEND_URL"
echo "Public Voting: $FRONTEND_URL/public-vote"
echo ""
echo "🔧 API Health: $API_BASE/health"
echo ""
echo "✨ The complete zkTender workflow has been demonstrated!"
echo "   You can now interact with the frontend to see the full system in action."
