const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'zktender.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  // Table 1: Proposals (main proposal submissions)
  db.run(`CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    feasibility INTEGER NOT NULL,
    budget INTEGER NOT NULL,
    innovation INTEGER NOT NULL,
    attachment_url TEXT,
    hash TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    step TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'submitted'
  )`);

  // Table 2: AI Evaluations (AI analysis results)
  db.run(`CREATE TABLE IF NOT EXISTS ai_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    strengths TEXT NOT NULL, -- JSON array
    weaknesses TEXT NOT NULL, -- JSON array
    summary TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposals (submission_id)
  )`);

  // Table 3: Votes (public voting data)
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT NOT NULL,
    voter_address TEXT NOT NULL,
    vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'flag')),
    zk_proof TEXT NOT NULL,
    nullifier TEXT UNIQUE NOT NULL,
    commitment TEXT NOT NULL,
    stake_amount INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposals (submission_id)
  )`);

  // Table 4: Final AI Evaluations (post-voting, with full disclosure)
  db.run(`CREATE TABLE IF NOT EXISTS final_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    ownership_structure TEXT,
    past_performance TEXT,
    final_score INTEGER NOT NULL,
    risk_assessment TEXT NOT NULL,
    bias_detection_results TEXT,
    insider_connection_check TEXT,
    legal_compliance_status TEXT,
    public_vote_impact TEXT, -- How public votes affected the evaluation
    flag_analysis TEXT, -- Analysis of any flags received
    ai_confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    recommendation TEXT NOT NULL CHECK (recommendation IN ('approve', 'reject', 'manual_review')),
    audit_trigger BOOLEAN DEFAULT FALSE,
    final_summary TEXT NOT NULL,
    evaluation_metadata TEXT, -- JSON with additional data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposals (submission_id)
  )`);

  // Table 5: Voting Stats (aggregated voting statistics)
  db.run(`CREATE TABLE IF NOT EXISTS voting_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    upvotes INTEGER DEFAULT 0,
    flags INTEGER DEFAULT 0,
    total_stake INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES proposals (submission_id)
  )`);
});

// API Routes

// 1. Submit Proposal (replaces n8n webhook)
app.post('/api/proposals/submit', async (req, res) => {
  try {
    const {
      name,
      feasibility,
      budget,
      innovation,
      attachmentUrl,
      hash,
      wallet,
      step,
      timestamp
    } = req.body;

    // Generate unique submission ID
    const submission_id = `subm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Insert proposal
    db.run(
      `INSERT INTO proposals (submission_id, name, feasibility, budget, innovation, 
       attachment_url, hash, wallet_address, step, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [submission_id, name, feasibility, budget, innovation, attachmentUrl, hash, wallet, step, timestamp],
      function(err) {
        if (err) {
          console.error('Error inserting proposal:', err);
          return res.status(500).json({ error: 'Failed to submit proposal' });
        }

        // Initialize voting stats for this proposal
        db.run(
          `INSERT INTO voting_stats (submission_id) VALUES (?)`,
          [submission_id],
          (err) => {
            if (err) {
              console.error('Error initializing voting stats:', err);
            }
          }
        );

        console.log(`✅ Proposal ${submission_id} submitted successfully`);
        res.json({ 
          success: true, 
          submission_id,
          message: 'Proposal submitted successfully' 
        });
      }
    );
  } catch (error) {
    console.error('Proposal submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Get AI Evaluations (replaces Supabase fetch)
app.get('/api/evaluations', (req, res) => {
  db.all(
    `SELECT submission_id, score, strengths, weaknesses, summary, timestamp 
     FROM ai_evaluations ORDER BY timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching evaluations:', err);
        return res.status(500).json({ error: 'Failed to fetch evaluations' });
      }

      // Parse JSON strings back to arrays
      const evaluations = rows.map(row => ({
        ...row,
        strengths: JSON.parse(row.strengths),
        weaknesses: JSON.parse(row.weaknesses)
      }));

      res.json(evaluations);
    }
  );
});

// 3. Submit Vote (with ZK proof)
app.post('/api/votes/submit', async (req, res) => {
  try {
    const {
      submission_id,
      voter_address,
      vote_type,
      zk_proof,
      nullifier,
      commitment,
      stake_amount
    } = req.body;

    // Check if nullifier already exists (prevent double voting)
    db.get(
      `SELECT id FROM votes WHERE nullifier = ?`,
      [nullifier],
      (err, row) => {
        if (err) {
          console.error('Error checking nullifier:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (row) {
          return res.status(400).json({ error: 'Vote already submitted (double voting prevented)' });
        }

        // Insert vote
        db.run(
          `INSERT INTO votes (submission_id, voter_address, vote_type, zk_proof, 
           nullifier, commitment, stake_amount) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [submission_id, voter_address, vote_type, zk_proof, nullifier, commitment, stake_amount],
          function(err) {
            if (err) {
              console.error('Error inserting vote:', err);
              return res.status(500).json({ error: 'Failed to submit vote' });
            }

            // Update voting stats
            const upvoteIncrement = vote_type === 'up' ? 1 : 0;
            const flagIncrement = vote_type === 'flag' ? 1 : 0;

            db.run(
              `UPDATE voting_stats 
               SET upvotes = upvotes + ?, flags = flags + ?, 
                   total_stake = total_stake + ?, last_updated = CURRENT_TIMESTAMP
               WHERE submission_id = ?`,
              [upvoteIncrement, flagIncrement, stake_amount, submission_id],
              (err) => {
                if (err) {
                  console.error('Error updating voting stats:', err);
                }
              }
            );

            console.log(`✅ Vote submitted for ${submission_id}: ${vote_type}`);
            res.json({ 
              success: true, 
              message: 'Vote submitted successfully',
              vote_id: this.lastID
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Vote submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Get Voting Stats
app.get('/api/voting-stats', (req, res) => {
  db.all(
    `SELECT submission_id, upvotes, flags, total_stake, last_updated 
     FROM voting_stats ORDER BY last_updated DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching voting stats:', err);
        return res.status(500).json({ error: 'Failed to fetch voting stats' });
      }

      res.json(rows);
    }
  );
});

// 5. Mock AI Evaluation (for demo purposes)
app.post('/api/evaluations/generate', async (req, res) => {
  try {
    const { submission_id } = req.body;

    // Get proposal details
    db.get(
      `SELECT * FROM proposals WHERE submission_id = ?`,
      [submission_id],
      (err, proposal) => {
        if (err || !proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        // Mock AI evaluation (replace with real AI logic)
        const mockEvaluation = {
          score: Math.floor(Math.random() * 40) + 60, // 60-100 range
          strengths: [
            "Well-structured proposal",
            "Realistic budget allocation",
            "Clear implementation timeline"
          ],
          weaknesses: [
            "Limited risk assessment",
            "Minimal stakeholder engagement plan"
          ],
          summary: `Proposal ${submission_id} demonstrates solid planning with a score reflecting good technical merit and feasibility.`
        };

        // Insert AI evaluation
        db.run(
          `INSERT INTO ai_evaluations (submission_id, score, strengths, weaknesses, summary) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            submission_id,
            mockEvaluation.score,
            JSON.stringify(mockEvaluation.strengths),
            JSON.stringify(mockEvaluation.weaknesses),
            mockEvaluation.summary
          ],
          function(err) {
            if (err) {
              console.error('Error inserting AI evaluation:', err);
              return res.status(500).json({ error: 'Failed to generate evaluation' });
            }

            console.log(`✅ AI evaluation generated for ${submission_id}`);
            res.json({ 
              success: true, 
              evaluation: mockEvaluation,
              message: 'AI evaluation generated successfully' 
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('AI evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 6. Get All Proposals
app.get('/api/proposals', (req, res) => {
  db.all(
    `SELECT * FROM proposals ORDER BY timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching proposals:', err);
        return res.status(500).json({ error: 'Failed to fetch proposals' });
      }

      res.json(rows);
    }
  );
});

// 7. Generate Final AI Evaluation (post-voting, with full disclosure)
app.post('/api/final-evaluations/generate', async (req, res) => {
  try {
    const { submission_id } = req.body;

    // Get proposal details and voting data
    db.get(
      `SELECT p.*, vs.upvotes, vs.flags, vs.total_stake 
       FROM proposals p 
       LEFT JOIN voting_stats vs ON p.submission_id = vs.submission_id
       WHERE p.submission_id = ?`,
      [submission_id],
      (err, proposal) => {
        if (err || !proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        // Mock final evaluation with full disclosure (replace with real AI logic)
        const flaggedByPublic = (proposal.flags || 0) > (proposal.upvotes || 0) * 0.1; // >10% flag rate
        const publicSupport = (proposal.upvotes || 0) / ((proposal.upvotes || 0) + (proposal.flags || 0) + 1);
        
        const mockFinalEvaluation = {
          company_name: `Company-${submission_id.substring(5, 10)}`, // Revealed name
          ownership_structure: "Private Limited Company, 3 shareholders, no government connections",
          past_performance: "4 successful public contracts completed on time, 1 minor delay in 2023",
          final_score: Math.floor(Math.random() * 30) + 70 - (flaggedByPublic ? 15 : 0), // 70-100, minus penalty if flagged
          risk_assessment: flaggedByPublic ? "MEDIUM - Public flags raised concerns" : "LOW - No significant red flags",
          bias_detection_results: "No conflicts of interest detected",
          insider_connection_check: "No connections to decision makers found",
          legal_compliance_status: "COMPLIANT - All documents verified",
          public_vote_impact: `Public support: ${(publicSupport * 100).toFixed(1)}%, Flags: ${proposal.flags || 0}`,
          flag_analysis: flaggedByPublic ? "Flags primarily concern budget feasibility" : "Minimal flagging activity",
          ai_confidence_level: flaggedByPublic ? 0.75 : 0.92,
          recommendation: flaggedByPublic ? 'manual_review' : 'approve',
          audit_trigger: flaggedByPublic,
          final_summary: `Final assessment incorporating public feedback and full disclosure. ${flaggedByPublic ? 'Requires manual review due to public concerns.' : 'Recommended for approval based on merit and public support.'}`,
          evaluation_metadata: JSON.stringify({
            voting_period_end: new Date().toISOString(),
            total_voters: Math.floor((proposal.upvotes || 0) + (proposal.flags || 0)),
            ai_model_version: "v2.1_full_disclosure",
            bias_check_passed: true
          })
        };

        // Insert final evaluation
        db.run(
          `INSERT INTO final_evaluations (
            submission_id, company_name, ownership_structure, past_performance,
            final_score, risk_assessment, bias_detection_results, insider_connection_check,
            legal_compliance_status, public_vote_impact, flag_analysis, ai_confidence_level,
            recommendation, audit_trigger, final_summary, evaluation_metadata
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            submission_id,
            mockFinalEvaluation.company_name,
            mockFinalEvaluation.ownership_structure,
            mockFinalEvaluation.past_performance,
            mockFinalEvaluation.final_score,
            mockFinalEvaluation.risk_assessment,
            mockFinalEvaluation.bias_detection_results,
            mockFinalEvaluation.insider_connection_check,
            mockFinalEvaluation.legal_compliance_status,
            mockFinalEvaluation.public_vote_impact,
            mockFinalEvaluation.flag_analysis,
            mockFinalEvaluation.ai_confidence_level,
            mockFinalEvaluation.recommendation,
            mockFinalEvaluation.audit_trigger,
            mockFinalEvaluation.final_summary,
            mockFinalEvaluation.evaluation_metadata
          ],
          function(err) {
            if (err) {
              console.error('Error inserting final evaluation:', err);
              return res.status(500).json({ error: 'Failed to generate final evaluation' });
            }

            console.log(`✅ Final evaluation generated for ${submission_id}`);
            res.json({ 
              success: true, 
              final_evaluation: mockFinalEvaluation,
              message: 'Final evaluation generated successfully' 
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Final evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 8. Get Final Evaluations
app.get('/api/final-evaluations', (req, res) => {
  db.all(
    `SELECT * FROM final_evaluations ORDER BY timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Error fetching final evaluations:', err);
        return res.status(500).json({ error: 'Failed to fetch final evaluations' });
      }

      // Parse JSON metadata
      const evaluations = rows.map(row => ({
        ...row,
        evaluation_metadata: JSON.parse(row.evaluation_metadata || '{}')
      }));

      res.json(evaluations);
    }
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'zkTender API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 zkTender API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🔗 Available endpoints:
    POST /api/proposals/submit
    GET  /api/evaluations
    POST /api/votes/submit
    GET  /api/voting-stats
    POST /api/evaluations/generate
    GET  /api/proposals
    POST /api/final-evaluations/generate
    GET  /api/final-evaluations
    GET  /api/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down zkTender API...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
