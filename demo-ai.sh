#!/bin/bash

echo "🚀 zkTender AI Evaluation Demo"
echo "=============================="
echo ""

# Check if OpenAI key is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "📋 Running in FALLBACK MODE (no OpenAI API key)"
    echo "   • Intelligent mock evaluations"
    echo "   • All functionality maintained"
    echo "   • Ready for real AI upgrade"
else
    echo "🤖 Running with REAL AI POWER (OpenAI GPT-4)"
    echo "   • Actual GPT-4 proposal analysis"
    echo "   • Context-aware evaluations"
    echo "   • Bias detection and risk assessment"
fi

echo ""
echo "🧪 Testing AI evaluation capabilities..."
echo ""

API_BASE="http://localhost:3003/api"

# Submit a test proposal
echo "1. Submitting test proposal..."
PROPOSAL_RESPONSE=$(curl -s -X POST "$API_BASE/proposals/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart City Traffic Optimization System",
    "feasibility": 88,
    "budget": 750000,
    "innovation": 92,
    "attachmentUrl": "ipfs://QmTestDocument123",
    "hash": "0xabcdef123456789",
    "wallet": "0xtest_demo_wallet_address",
    "step": "zk3",
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
  }')

SUBMISSION_ID=$(echo "$PROPOSAL_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['submission_id'])" 2>/dev/null || echo "test-submission")

echo "✅ Proposal submitted: $SUBMISSION_ID"

# Generate AI evaluation
echo ""
echo "2. 🤖 Generating AI evaluation (anonymized)..."
EVAL_RESPONSE=$(curl -s -X POST "$API_BASE/evaluations/generate" \
  -H "Content-Type: application/json" \
  -d '{"submission_id": "'$SUBMISSION_ID'"}')

echo "$EVAL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$EVAL_RESPONSE"

# Simulate some voting
echo ""
echo "3. 🗳️ Simulating public voting..."
curl -s -X POST "$API_BASE/votes/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_id": "'$SUBMISSION_ID'",
    "voter_address": "0xvoter1_demo",
    "vote_type": "up",
    "zk_proof": "zk_proof_demo1",
    "nullifier": "null_demo1_'$(date +%s)'",
    "commitment": "commit_demo1",
    "stake_amount": 2
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

echo "✅ Public votes submitted"

# Generate final evaluation
echo ""
echo "4. 🎯 Generating final AI evaluation (with full disclosure)..."
FINAL_EVAL_RESPONSE=$(curl -s -X POST "$API_BASE/final-evaluations/generate" \
  -H "Content-Type: application/json" \
  -d '{"submission_id": "'$SUBMISSION_ID'"}')

echo "$FINAL_EVAL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$FINAL_EVAL_RESPONSE"

echo ""
echo "🎉 AI Evaluation Demo Complete!"
echo ""
echo "🔗 View the full system at:"
echo "   • Main App: http://localhost:3001"
echo "   • Public Voting: http://localhost:3001/public-vote"
echo "   • Final Results: http://localhost:3001/final-evaluations"
echo ""

if [ -z "$OPENAI_API_KEY" ]; then
    echo "💡 To enable real GPT-4 AI:"
    echo "   export OPENAI_API_KEY='sk-your-key-here'"
    echo "   npm run dev:full"
fi
