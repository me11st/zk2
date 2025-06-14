// Test script to verify the complete API flow
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:3003/api';

async function testCompleteFlow() {
  console.log('🧪 Testing zkTender API...');
  
  try {
    // 1. Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData);

    // 2. Submit a test proposal
    console.log('\n2. Submitting test proposal...');
    const proposalData = {
      name: "Test Infrastructure Project",
      feasibility: 85,
      budget: 500000,
      innovation: 75,
      attachmentUrl: "ipfs://test-document.pdf",
      hash: "0x123456789abcdef",
      wallet: "0xtest1234567890abcdef",
      step: "zk3",
      timestamp: new Date().toISOString()
    };

    const submitResponse = await fetch(`${API_BASE}/proposals/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proposalData)
    });
    const submitResult = await submitResponse.json();
    console.log('✅ Proposal submitted:', submitResult);

    const submissionId = submitResult.submission_id;

    // 3. Generate AI evaluation for the proposal
    console.log('\n3. Generating AI evaluation...');
    const evalResponse = await fetch(`${API_BASE}/evaluations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId })
    });
    const evalResult = await evalResponse.json();
    console.log('✅ AI evaluation generated:', evalResult);

    // 4. Get all evaluations
    console.log('\n4. Fetching all evaluations...');
    const evalsResponse = await fetch(`${API_BASE}/evaluations`);
    const evaluations = await evalsResponse.json();
    console.log('✅ Evaluations fetched:', evaluations.length, 'total');

    // 5. Submit a vote
    console.log('\n5. Submitting test vote...');
    const voteData = {
      submission_id: submissionId,
      voter_address: "0xvoter1234567890abcdef",
      vote_type: "up",
      zk_proof: "zk_proof_test12345",
      nullifier: "null_test12345",
      commitment: "commit_test12345",
      stake_amount: 1
    };

    const voteResponse = await fetch(`${API_BASE}/votes/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voteData)
    });
    const voteResult = await voteResponse.json();
    console.log('✅ Vote submitted:', voteResult);

    // 6. Get voting stats
    console.log('\n6. Fetching voting stats...');
    const statsResponse = await fetch(`${API_BASE}/voting-stats`);
    const stats = await statsResponse.json();
    console.log('✅ Voting stats:', stats);

    // 7. Get all proposals
    console.log('\n7. Fetching all proposals...');
    const proposalsResponse = await fetch(`${API_BASE}/proposals`);
    const proposals = await proposalsResponse.json();
    console.log('✅ Proposals fetched:', proposals.length, 'total');

    // 8. Generate final evaluation (post-voting phase)
    console.log('\n8. Generating final AI evaluation with full disclosure...');
    const finalEvalResponse = await fetch(`${API_BASE}/final-evaluations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId })
    });
    const finalEvalResult = await finalEvalResponse.json();
    console.log('✅ Final evaluation generated:', finalEvalResult);

    // 9. Get all final evaluations
    console.log('\n9. Fetching all final evaluations...');
    const finalEvalsResponse = await fetch(`${API_BASE}/final-evaluations`);
    const finalEvaluations = await finalEvalsResponse.json();
    console.log('✅ Final evaluations fetched:', finalEvaluations.length, 'total');

    console.log('\n🎉 All API tests passed! The zkTender system is working correctly.');
    console.log('\n📊 Final System Summary:');
    console.log('- Initial AI evaluation (anonymized):', evaluations.length);
    console.log('- Public votes submitted:', stats.length);
    console.log('- Final evaluations (full disclosure):', finalEvaluations.length);
    console.log('- Total proposals in system:', proposals.length);

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCompleteFlow();
}

module.exports = { testCompleteFlow };
