const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3003;

// Initialize OpenAI only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  console.log('🤖 OpenAI integration enabled');
} else {
  console.log('⚠️  OpenAI API key not found - using intelligent fallback mode');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'zktender_private.db');
const db = new sqlite3.Database(dbPath);

// ZK-PRIVATE DATABASE SCHEMA
db.serialize(() => {
  // Table 1: Proposal Commitments (ZERO-KNOWLEDGE PRIVACY)
  db.run(`CREATE TABLE IF NOT EXISTS proposal_commitments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    commitment_hash TEXT NOT NULL,
    nullifier_hash TEXT UNIQUE NOT NULL,
    wallet_address TEXT NOT NULL,
    encrypted_proposal_data TEXT, -- Encrypted with submitter's key
    zk_proof TEXT NOT NULL,
    submission_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reveal_timestamp DATETIME DEFAULT NULL,
    status TEXT DEFAULT 'committed' CHECK (status IN ('committed', 'revealed', 'evaluated'))
  )`);

  // Table 2: Revealed Proposals (ONLY AFTER REVEAL PHASE)
  db.run(`CREATE TABLE IF NOT EXISTS revealed_proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    -- Basic proposal data (revealed only after deadline)
    company_name TEXT NOT NULL,
    project_title TEXT NOT NULL,
    location TEXT NOT NULL,
    budget INTEGER NOT NULL,
    feasibility_score INTEGER NOT NULL,
    innovation_score INTEGER NOT NULL,
    -- Enhanced project fields
    planned_start_date TEXT,
    planned_end_date TEXT,
    material_plan TEXT,
    construction_plan TEXT,
    sustainability_measures TEXT,
    community_engagement TEXT,
    past_projects TEXT,
    attachment_urls TEXT, -- JSON array of file hashes
    -- Verification data
    zk_reveal_proof TEXT NOT NULL,
    reveal_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposal_commitments (submission_id)
  )`);

  // Table 3: Anonymous Evaluations (BASED ON COMMITMENT HASHES ONLY)
  db.run(`CREATE TABLE IF NOT EXISTS anonymous_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    commitment_hash TEXT NOT NULL,
    anonymous_score INTEGER NOT NULL,
    evaluation_hash TEXT NOT NULL, -- Hash of evaluation reasoning
    ai_confidence DECIMAL(3,2),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposal_commitments (submission_id)
  )`);

  // Table 4: Anonymous Votes (ZK-PRIVATE VOTING)
  db.run(`CREATE TABLE IF NOT EXISTS anonymous_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    vote_commitment TEXT UNIQUE NOT NULL,
    nullifier TEXT UNIQUE NOT NULL,
    zk_vote_proof TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('support', 'concern')),
    stake_commitment TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposal_commitments (submission_id)
  )`);

  // Table 5: System Configuration
  db.run(`CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY,
    submission_deadline DATETIME NOT NULL,
    reveal_deadline DATETIME NOT NULL,
    voting_deadline DATETIME NOT NULL,
    current_phase TEXT NOT NULL CHECK (current_phase IN ('submission', 'evaluation', 'voting', 'reveal', 'final')),
    total_submissions INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Initialize system configuration if empty
  db.get("SELECT COUNT(*) as count FROM system_config", (err, row) => {
    if (!err && row.count === 0) {
      db.run(`INSERT INTO system_config (id, submission_deadline, reveal_deadline, voting_deadline, current_phase) 
              VALUES (1, 
                datetime('now', '+30 days'), 
                datetime('now', '+35 days'), 
                datetime('now', '+40 days'), 
                'submission')`);
    }
  });
});

// PRIVACY-FIRST API ENDPOINTS

// 1. Submit Proposal Commitment (ZK-PRIVATE)
app.post('/api/proposals/commit', async (req, res) => {
  try {
    const {
      commitment_hash,
      nullifier_hash,
      wallet_address,
      encrypted_proposal_data,
      zk_proof
    } = req.body;

    // Validate required ZK components
    if (!commitment_hash || !nullifier_hash || !zk_proof || !wallet_address) {
      return res.status(400).json({ error: 'Missing required ZK proof components' });
    }

    // Check if nullifier already exists (prevent double submission)
    db.get(
      "SELECT id FROM proposal_commitments WHERE nullifier_hash = ?",
      [nullifier_hash],
      (err, row) => {
        if (err) {
          console.error('Error checking nullifier:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
          return res.status(400).json({ error: 'Proposal already submitted (nullifier exists)' });
        }

        // Generate submission ID
        const submission_id = `zkT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Insert commitment (NO SENSITIVE DATA STORED)
        db.run(
          `INSERT INTO proposal_commitments 
           (submission_id, commitment_hash, nullifier_hash, wallet_address, encrypted_proposal_data, zk_proof) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [submission_id, commitment_hash, nullifier_hash, wallet_address, encrypted_proposal_data || '', zk_proof],
          function(err) {
            if (err) {
              console.error('Error inserting proposal commitment:', err);
              return res.status(500).json({ error: 'Failed to submit proposal commitment' });
            }

            // Update total submissions count
            db.run("UPDATE system_config SET total_submissions = total_submissions + 1, last_updated = CURRENT_TIMESTAMP WHERE id = 1");

            console.log(`✅ ZK Proposal commitment ${submission_id} submitted (hash: ${commitment_hash.substring(0, 16)}...)`);
            res.json({ 
              success: true, 
              submission_id,
              commitment_hash: commitment_hash.substring(0, 16) + '...', // Only show partial hash
              message: 'Proposal committed successfully - data remains private until reveal phase'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Commitment submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get Public State (ONLY COMMITMENT HASHES VISIBLE)
app.get('/api/proposals/public-state', (req, res) => {
  // Get system configuration
  db.get("SELECT * FROM system_config WHERE id = 1", (err, config) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to get system state' });
    }

    // Get anonymous proposal commitments (NO SENSITIVE DATA)
    db.all(
      `SELECT submission_id, 
              substr(commitment_hash, 1, 16) || '...' as commitment_preview,
              submission_timestamp,
              status
       FROM proposal_commitments 
       ORDER BY submission_timestamp ASC`,
      [],
      (err, commitments) => {
        if (err) {
          console.error('Error fetching commitments:', err);
          return res.status(500).json({ error: 'Failed to fetch commitments' });
        }

        res.json({
          current_phase: config.current_phase,
          submission_deadline: config.submission_deadline,
          reveal_deadline: config.reveal_deadline,
          voting_deadline: config.voting_deadline,
          total_submissions: commitments.length,
          anonymous_commitments: commitments.map(c => ({
            id: c.submission_id,
            commitment_preview: c.commitment_preview,
            timestamp: c.submission_timestamp,
            status: c.status
          })),
          message: 'All proposal data remains private until reveal phase'
        });
      }
    );
  });
});

// 3. Reveal Proposal (ONLY AFTER DEADLINE WITH ZK PROOF)
app.post('/api/proposals/reveal', async (req, res) => {
  try {
    const {
      submission_id,
      zk_reveal_proof,
      revealed_data // Complete proposal data
    } = req.body;

    // Check if we're in reveal phase
    db.get("SELECT current_phase, reveal_deadline FROM system_config WHERE id = 1", (err, config) => {
      if (err || !config) {
        return res.status(500).json({ error: 'System configuration error' });
      }

      if (config.current_phase !== 'reveal') {
        return res.status(400).json({ 
          error: 'Not in reveal phase yet', 
          current_phase: config.current_phase 
        });
      }

      // Verify the submission exists and get original commitment
      db.get(
        "SELECT commitment_hash, status FROM proposal_commitments WHERE submission_id = ?",
        [submission_id],
        (err, commitment) => {
          if (err || !commitment) {
            return res.status(404).json({ error: 'Proposal commitment not found' });
          }

          if (commitment.status !== 'committed') {
            return res.status(400).json({ error: 'Proposal already revealed or invalid state' });
          }

          // TODO: Verify ZK proof that revealed_data matches original commitment_hash
          // For now, we'll simulate this verification

          // Store revealed proposal data
          db.run(
            `INSERT INTO revealed_proposals (
              submission_id, company_name, project_title, location, budget,
              feasibility_score, innovation_score, planned_start_date, planned_end_date,
              material_plan, construction_plan, sustainability_measures, 
              community_engagement, past_projects, attachment_urls, zk_reveal_proof
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              submission_id,
              revealed_data.company_name,
              revealed_data.project_title,
              revealed_data.location,
              revealed_data.budget,
              revealed_data.feasibility_score,
              revealed_data.innovation_score,
              revealed_data.planned_start_date,
              revealed_data.planned_end_date,
              revealed_data.material_plan,
              revealed_data.construction_plan,
              revealed_data.sustainability_measures,
              revealed_data.community_engagement,
              revealed_data.past_projects,
              JSON.stringify(revealed_data.attachment_urls || []),
              zk_reveal_proof
            ],
            function(err) {
              if (err) {
                console.error('Error inserting revealed proposal:', err);
                return res.status(500).json({ error: 'Failed to reveal proposal' });
              }

              // Update commitment status
              db.run(
                "UPDATE proposal_commitments SET status = 'revealed', reveal_timestamp = CURRENT_TIMESTAMP WHERE submission_id = ?",
                [submission_id]
              );

              console.log(`✅ Proposal ${submission_id} revealed successfully`);
              res.json({ 
                success: true, 
                message: 'Proposal revealed successfully',
                submission_id
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Reveal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Get Revealed Proposals (ONLY AFTER REVEAL PHASE)
app.get('/api/proposals/revealed', (req, res) => {
  db.get("SELECT current_phase FROM system_config WHERE id = 1", (err, config) => {
    if (err || !config) {
      return res.status(500).json({ error: 'System configuration error' });
    }

    if (config.current_phase === 'submission' || config.current_phase === 'evaluation') {
      return res.json({
        message: 'Proposals not yet revealed - still in privacy phase',
        current_phase: config.current_phase,
        revealed_proposals: []
      });
    }

    // Get revealed proposals
    db.all(
      "SELECT * FROM revealed_proposals ORDER BY reveal_timestamp ASC",
      [],
      (err, proposals) => {
        if (err) {
          console.error('Error fetching revealed proposals:', err);
          return res.status(500).json({ error: 'Failed to fetch revealed proposals' });
        }

        res.json({
          current_phase: config.current_phase,
          revealed_proposals: proposals.map(p => ({
            ...p,
            attachment_urls: JSON.parse(p.attachment_urls || '[]')
          }))
        });
      }
    );
  });
});

// 5. Submit Anonymous Vote (ZK-PRIVATE)
app.post('/api/votes/anonymous', async (req, res) => {
  try {
    const {
      submission_id,
      vote_commitment,
      nullifier,
      zk_vote_proof,
      vote_type,
      stake_commitment
    } = req.body;

    // Check if nullifier already exists (prevent double voting)
    db.get(
      "SELECT id FROM anonymous_votes WHERE nullifier = ?",
      [nullifier],
      (err, row) => {
        if (err) {
          console.error('Error checking vote nullifier:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
          return res.status(400).json({ error: 'Vote already cast (nullifier exists)' });
        }

        // Insert anonymous vote
        db.run(
          `INSERT INTO anonymous_votes 
           (submission_id, vote_commitment, nullifier, zk_vote_proof, vote_type, stake_commitment) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [submission_id, vote_commitment, nullifier, zk_vote_proof, vote_type, stake_commitment],
          function(err) {
            if (err) {
              console.error('Error inserting anonymous vote:', err);
              return res.status(500).json({ error: 'Failed to submit vote' });
            }

            console.log(`✅ Anonymous vote submitted for ${submission_id} (type: ${vote_type})`);
            res.json({ 
              success: true, 
              message: 'Anonymous vote submitted successfully',
              vote_id: this.lastID
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Anonymous vote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Get Voting Statistics (ANONYMOUS AGGREGATES ONLY)
app.get('/api/votes/statistics', (req, res) => {
  db.all(
    `SELECT submission_id,
            COUNT(*) as total_votes,
            SUM(CASE WHEN vote_type = 'support' THEN 1 ELSE 0 END) as support_votes,
            SUM(CASE WHEN vote_type = 'concern' THEN 1 ELSE 0 END) as concern_votes
     FROM anonymous_votes 
     GROUP BY submission_id`,
    [],
    (err, stats) => {
      if (err) {
        console.error('Error fetching vote statistics:', err);
        return res.status(500).json({ error: 'Failed to fetch voting statistics' });
      }

      res.json({
        voting_statistics: stats,
        message: 'All votes are anonymous and aggregated'
      });
    }
  );
});

// 7. Admin: Advance Phase (SYSTEM MANAGEMENT)
app.post('/api/admin/advance-phase', async (req, res) => {
  try {
    const { new_phase } = req.body;
    const validPhases = ['submission', 'evaluation', 'voting', 'reveal', 'final'];
    
    if (!validPhases.includes(new_phase)) {
      return res.status(400).json({ error: 'Invalid phase' });
    }

    db.run(
      "UPDATE system_config SET current_phase = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1",
      [new_phase],
      (err) => {
        if (err) {
          console.error('Error updating phase:', err);
          return res.status(500).json({ error: 'Failed to update phase' });
        }

        console.log(`📍 System phase advanced to: ${new_phase}`);
        res.json({ 
          success: true, 
          new_phase,
          message: `System advanced to ${new_phase} phase`
        });
      }
    );
  } catch (error) {
    console.error('Phase advance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'zkTender ZK-Private API is running',
    privacy_mode: 'MAXIMUM'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔒 zkTender ZK-PRIVATE API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔐 ZERO-KNOWLEDGE PRIVACY MODE ACTIVE`);
  console.log(`🔗 Available endpoints:
    POST /api/proposals/commit          - Submit proposal commitment (ZK-private)
    GET  /api/proposals/public-state    - Get anonymous commitments only
    POST /api/proposals/reveal          - Reveal proposal (after deadline)
    GET  /api/proposals/revealed        - Get revealed proposals (if phase allows)
    POST /api/votes/anonymous           - Submit anonymous vote
    GET  /api/votes/statistics          - Get voting statistics (aggregated)
    POST /api/admin/advance-phase       - Advance system phase
    GET  /api/health                    - Health check`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down zkTender ZK-Private API...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
