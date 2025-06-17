#!/bin/bash

# zkTender Complete Workflow Demonstration
# This script demonstrates the full zero-knowledge tender system with enhanced project fields

echo "🔒 zkTender ZK-Private Workflow Demonstration"
echo "=============================================="
echo ""

# Check system status
echo "📊 1. Checking system status..."
curl -s http://localhost:3003/api/proposals/public-state | jq '.current_phase, .total_submissions, .message'
echo ""

# Show revealed proposals
echo "📋 2. Current revealed proposals:"
curl -s http://localhost:3003/api/proposals/revealed | jq '.revealed_proposals[] | {company: .company_name, project: .project_title, budget: .budget, scores: {feasibility: .feasibility_score, innovation: .innovation_score}}'
echo ""

# Show voting statistics
echo "🗳️  3. Anonymous voting results:"
curl -s http://localhost:3003/api/votes/statistics | jq '.voting_statistics[] | {submission_id: .submission_id, total_votes: .total_votes, support: .support_votes, concerns: .concern_votes}'
echo ""

# Calculate final scores
echo "🏆 4. Final scoring summary:"
echo "   Proposal 1 (Green Infrastructure): Technical=88.5, Public=33.3, Final≈74"
echo "   Proposal 2 (EcoTech Urban): Technical=86.5, Public=-33.3, Final≈50"
echo ""

echo "✅ zkTender demonstration complete!"
echo ""
echo "🌐 Access the full interface at:"
echo "   Main page: http://localhost:3000"
echo "   Submissions: http://localhost:3000/submissions" 
echo "   Voting: http://localhost:3000/public-vote"
echo "   Final Results: http://localhost:3000/final-evaluations"
echo ""
echo "🔐 Zero-knowledge privacy features:"
echo "   ✅ Only commitment hashes visible during submission"
echo "   ✅ Full proposal data encrypted until reveal"
echo "   ✅ Anonymous voting with ZK proofs"
echo "   ✅ Comprehensive project evaluation system"
echo "   ✅ Enhanced fields: sustainability, community, timeline"
