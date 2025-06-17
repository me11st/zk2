const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create databases for zk1, zk2, zk3, zk4
const instances = ['zk1', 'zk2', 'zk3', 'zk4'];

instances.forEach(instance => {
  const dbPath = path.join(__dirname, `zktender_${instance}.db`);
  const db = new sqlite3.Database(dbPath);

  // Create tables with ZK-private schema
  db.serialize(() => {
    // System state table
    db.run(`CREATE TABLE IF NOT EXISTS system_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current_phase TEXT NOT NULL DEFAULT 'submission',
      submission_deadline TEXT,
      reveal_deadline TEXT,
      voting_deadline TEXT,
      total_submissions INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Proposal commitments (during submission phase)
    db.run(`CREATE TABLE IF NOT EXISTS proposal_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id TEXT UNIQUE NOT NULL,
      commitment_hash TEXT NOT NULL,
      submitter_address TEXT,
      submission_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      zk_proof TEXT,
      nullifier TEXT
    )`);

    // Revealed proposals (after deadline with ZK proofs)
    db.run(`CREATE TABLE IF NOT EXISTS revealed_proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      project_title TEXT NOT NULL,
      location TEXT NOT NULL,
      budget REAL NOT NULL,
      feasibility_score INTEGER DEFAULT 0,
      innovation_score INTEGER DEFAULT 0,
      planned_start_date TEXT,
      planned_end_date TEXT,
      material_plan TEXT,
      construction_plan TEXT,
      sustainability_measures TEXT,
      community_engagement TEXT,
      past_projects TEXT,
      reveal_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      zk_proof TEXT NOT NULL,
      FOREIGN KEY(submission_id) REFERENCES proposal_commitments(submission_id)
    )`);

    // Anonymous votes with ZK proofs
    db.run(`CREATE TABLE IF NOT EXISTS anonymous_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id TEXT NOT NULL,
      voter_address TEXT NOT NULL,
      vote_type TEXT NOT NULL CHECK(vote_type IN ('support', 'concern')),
      zk_proof TEXT NOT NULL,
      nullifier TEXT UNIQUE NOT NULL,
      commitment TEXT,
      stake_amount REAL DEFAULT 1,
      vote_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(submission_id) REFERENCES proposal_commitments(submission_id)
    )`);

    // Set initial system state to final phase for demo
    db.run(`INSERT OR REPLACE INTO system_state (id, current_phase, submission_deadline, reveal_deadline, voting_deadline, total_submissions) 
            VALUES (1, 'final', '2024-01-15T12:00:00Z', '2024-01-20T12:00:00Z', '2024-01-25T12:00:00Z', 2)`);

    // Insert sample commitment data
    const commitments = [
      {
        submission_id: `${instance}_proposal_001`,
        commitment_hash: `commit_${instance}_${Math.random().toString(36).substring(7)}`,
        submitter_address: `0x${Math.random().toString(16).substring(2, 18)}`,
        zk_proof: `zk_proof_${instance}_001`,
        nullifier: `null_${instance}_001`
      },
      {
        submission_id: `${instance}_proposal_002`,
        commitment_hash: `commit_${instance}_${Math.random().toString(36).substring(7)}`,
        submitter_address: `0x${Math.random().toString(16).substring(2, 18)}`,
        zk_proof: `zk_proof_${instance}_002`,
        nullifier: `null_${instance}_002`
      }
    ];

    commitments.forEach(commitment => {
      db.run(`INSERT OR REPLACE INTO proposal_commitments 
              (submission_id, commitment_hash, submitter_address, zk_proof, nullifier) 
              VALUES (?, ?, ?, ?, ?)`,
              [commitment.submission_id, commitment.commitment_hash, commitment.submitter_address, commitment.zk_proof, commitment.nullifier]);
    });

    // Insert sample revealed proposal data
    const proposals = [
      {
        submission_id: `${instance}_proposal_001`,
        company_name: `${instance.toUpperCase()} Construction Ltd.`,
        project_title: `Smart Infrastructure Project - ${instance.toUpperCase()}`,
        location: `District ${instance.slice(-1)}, Metro Area`,
        budget: 2500000 + Math.floor(Math.random() * 1000000),
        feasibility_score: 85 + Math.floor(Math.random() * 10),
        innovation_score: 78 + Math.floor(Math.random() * 15),
        planned_start_date: '2024-03-01',
        planned_end_date: '2024-12-15',
        material_plan: `High-quality sustainable materials sourced locally for ${instance.toUpperCase()} project. Focus on recycled steel, low-carbon concrete, and energy-efficient systems.`,
        construction_plan: `Phased construction approach for ${instance.toUpperCase()}: Site preparation (Month 1-2), Foundation work (Month 3-4), Structural build (Month 5-8), Systems installation (Month 9-10), Final testing and commissioning (Month 11-12).`,
        sustainability_measures: `Green building certification target, 40% energy reduction through smart systems, rainwater harvesting, solar panel integration, and native landscaping for ${instance.toUpperCase()} district.`,
        community_engagement: `Monthly town halls, local hiring preference (60% target), apprenticeship programs with local schools, and community advisory board for ${instance.toUpperCase()} project oversight.`,
        past_projects: `Successfully completed 12 similar infrastructure projects across the region over the past 8 years, including award-winning sustainable developments in neighboring districts.`,
        zk_proof: `zk_reveal_proof_${instance}_001`
      },
      {
        submission_id: `${instance}_proposal_002`,
        company_name: `${instance.toUpperCase()} Smart Solutions Inc.`,
        project_title: `Digital Transformation Initiative - ${instance.toUpperCase()}`,
        location: `Central ${instance.slice(-1)} Hub`,
        budget: 1800000 + Math.floor(Math.random() * 700000),
        feasibility_score: 82 + Math.floor(Math.random() * 12),
        innovation_score: 91 + Math.floor(Math.random() * 8),
        planned_start_date: '2024-04-15',
        planned_end_date: '2024-11-30',
        material_plan: `Advanced IoT sensors, fiber optic networks, edge computing hardware, and cloud infrastructure components for comprehensive digital transformation in ${instance.toUpperCase()}.`,
        construction_plan: `Digital infrastructure deployment for ${instance.toUpperCase()}: Network assessment (Month 1), Hardware procurement (Month 2), Installation phase (Month 3-5), Testing and optimization (Month 6), User training and rollout (Month 7-8).`,
        sustainability_measures: `Energy-efficient hardware selection, e-waste recycling program, paperless operations transition, and smart energy management systems reducing overall carbon footprint by 35%.`,
        community_engagement: `Digital literacy workshops, public Wi-Fi expansion, local tech training programs, and partnership with ${instance.toUpperCase()} community colleges for ongoing support.`,
        past_projects: `Led digital transformation for 8 municipalities, specializing in smart city solutions with 95% user satisfaction rate and average 30% efficiency improvement.`,
        zk_proof: `zk_reveal_proof_${instance}_002`
      }
    ];

    proposals.forEach(proposal => {
      db.run(`INSERT OR REPLACE INTO revealed_proposals 
              (submission_id, company_name, project_title, location, budget, feasibility_score, innovation_score, 
               planned_start_date, planned_end_date, material_plan, construction_plan, sustainability_measures, 
               community_engagement, past_projects, zk_proof) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [proposal.submission_id, proposal.company_name, proposal.project_title, proposal.location, 
               proposal.budget, proposal.feasibility_score, proposal.innovation_score, proposal.planned_start_date, 
               proposal.planned_end_date, proposal.material_plan, proposal.construction_plan, 
               proposal.sustainability_measures, proposal.community_engagement, proposal.past_projects, proposal.zk_proof]);
    });

    // Insert sample voting data
    const votes = [
      // Votes for proposal 1
      { submission_id: `${instance}_proposal_001`, vote_type: 'support', count: 15 + Math.floor(Math.random() * 10) },
      { submission_id: `${instance}_proposal_001`, vote_type: 'concern', count: 3 + Math.floor(Math.random() * 5) },
      // Votes for proposal 2
      { submission_id: `${instance}_proposal_002`, vote_type: 'support', count: 12 + Math.floor(Math.random() * 8) },
      { submission_id: `${instance}_proposal_002`, vote_type: 'concern', count: 6 + Math.floor(Math.random() * 4) }
    ];

    votes.forEach(voteGroup => {
      for (let i = 0; i < voteGroup.count; i++) {
        db.run(`INSERT OR REPLACE INTO anonymous_votes 
                (submission_id, voter_address, vote_type, zk_proof, nullifier, commitment, stake_amount) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  voteGroup.submission_id,
                  `0x${Math.random().toString(16).substring(2, 18)}`,
                  voteGroup.vote_type,
                  `zk_vote_proof_${Math.random().toString(36).substring(7)}`,
                  `nullifier_${instance}_${voteGroup.submission_id}_${i}`,
                  `commit_vote_${Math.random().toString(36).substring(7)}`,
                  1
                ]);
      }
    });

    console.log(`✅ Database created and populated for ${instance}: zktender_${instance}.db`);
  });

  db.close();
});

console.log('🎯 All ZK instances (zk1, zk2, zk3, zk4) have been created with sample data!');
console.log('🔒 Each instance contains:');
console.log('   - 2 revealed proposals with full project details');
console.log('   - Anonymous voting data with ZK proofs');
console.log('   - Complete commitment-reveal scheme');
console.log('   - Final phase status for immediate evaluation');
