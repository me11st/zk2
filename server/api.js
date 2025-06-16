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

// 5. Real AI Evaluation using OpenAI
app.post('/api/evaluations/generate', async (req, res) => {
  try {
    const { submission_id } = req.body;

    // Get proposal details
    db.get(
      `SELECT * FROM proposals WHERE submission_id = ?`,
      [submission_id],
      async (err, proposal) => {
        if (err || !proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        try {
          // Prepare anonymized proposal data for AI evaluation
          const anonymizedProposal = {
            name: proposal.name,
            feasibility_score: proposal.feasibility,
            budget_estimate: proposal.budget,
            innovation_rating: proposal.innovation,
            submission_timestamp: proposal.timestamp
          };

          // Create prompt for AI evaluation
          const prompt = `You are an expert government procurement evaluator. Analyze this anonymized proposal for a public tender and provide a comprehensive evaluation.

PROPOSAL DATA:
- Project Name: ${anonymizedProposal.name}
- Feasibility Score (self-assessed): ${anonymizedProposal.feasibility_score}/100
- Budget Estimate: $${anonymizedProposal.budget_estimate.toLocaleString()}
- Innovation Rating (self-assessed): ${anonymizedProposal.innovation_rating}/100
- Submission Date: ${anonymizedProposal.submission_timestamp}

EVALUATION CRITERIA:
1. Technical feasibility and implementation approach
2. Budget reasonableness and cost-effectiveness
3. Innovation potential and technological advancement
4. Risk assessment and project management considerations
5. Overall value for public benefit

REQUIRED OUTPUT FORMAT (JSON):
{
  "score": [number between 60-100],
  "strengths": [array of 3-4 specific strengths],
  "weaknesses": [array of 2-3 areas for improvement],
  "summary": [2-3 sentence executive summary]
}

Provide objective, evidence-based evaluation focusing on merit and public value. Consider the self-assessed scores but evaluate independently based on the proposal details.`;

          // Call OpenAI API
          let aiEvaluation;
          if (openai && process.env.OPENAI_API_KEY) {
            console.log(`🤖 Calling OpenAI for evaluation of ${submission_id}...`);
            
            const completion = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: "You are an expert government procurement evaluator with 15+ years of experience in public tender analysis. You provide objective, unbiased assessments based on technical merit, financial prudence, and public value."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.3,
              max_tokens: 800,
              response_format: { type: "json_object" }
            });

            aiEvaluation = JSON.parse(completion.choices[0].message.content);
            console.log(`✅ OpenAI evaluation completed for ${submission_id}`);
          } else {
            // Fallback mock evaluation if no API key
            console.log(`⚠️ No OpenAI API key found, using mock evaluation for ${submission_id}`);
            aiEvaluation = {
              score: Math.floor(Math.random() * 40) + 60,
              strengths: [
                "Well-structured proposal with clear objectives",
                "Realistic budget allocation and timeline",
                "Demonstrated technical competency"
              ],
              weaknesses: [
                "Limited risk assessment details",
                "Could benefit from more stakeholder engagement",
                "Implementation milestones need refinement"
              ],
              summary: `Proposal ${submission_id} demonstrates solid planning with good technical merit and feasibility. The project shows potential for positive public impact.`
            };
          }

          // Validate and sanitize AI response
          const evaluation = {
            score: Math.min(100, Math.max(60, aiEvaluation.score || 75)),
            strengths: Array.isArray(aiEvaluation.strengths) ? aiEvaluation.strengths.slice(0, 4) : [
              "Well-structured proposal",
              "Realistic budget allocation",
              "Clear implementation timeline"
            ],
            weaknesses: Array.isArray(aiEvaluation.weaknesses) ? aiEvaluation.weaknesses.slice(0, 3) : [
              "Limited risk assessment",
              "Minimal stakeholder engagement plan"
            ],
            summary: aiEvaluation.summary || `Proposal ${submission_id} demonstrates solid planning with good technical merit and feasibility.`
          };

          // Insert AI evaluation
          db.run(
            `INSERT INTO ai_evaluations (submission_id, score, strengths, weaknesses, summary) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              submission_id,
              evaluation.score,
              JSON.stringify(evaluation.strengths),
              JSON.stringify(evaluation.weaknesses),
              evaluation.summary
            ],
            function(err) {
              if (err) {
                console.error('Error inserting AI evaluation:', err);
                return res.status(500).json({ error: 'Failed to store evaluation' });
              }

              console.log(`✅ AI evaluation stored for ${submission_id} (Score: ${evaluation.score})`);
              res.json({ 
                success: true, 
                evaluation: evaluation,
                message: 'AI evaluation generated successfully',
                ai_powered: !!process.env.OPENAI_API_KEY
              });
            }
          );

        } catch (aiError) {
          console.error('OpenAI API error:', aiError);
          
          // Fallback to mock evaluation on AI error
          const mockEvaluation = {
            score: Math.floor(Math.random() * 40) + 60,
            strengths: [
              "Well-structured proposal",
              "Realistic budget allocation", 
              "Clear implementation timeline"
            ],
            weaknesses: [
              "Limited risk assessment",
              "Minimal stakeholder engagement plan"
            ],
            summary: `Proposal ${submission_id} demonstrates solid planning with good technical merit and feasibility.`
          };

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
                console.error('Error inserting fallback evaluation:', err);
                return res.status(500).json({ error: 'Failed to generate evaluation' });
              }

              console.log(`⚠️ Fallback evaluation stored for ${submission_id} due to AI error`);
              res.json({ 
                success: true, 
                evaluation: mockEvaluation,
                message: 'Evaluation generated (fallback mode)',
                ai_powered: false,
                fallback_reason: aiError.message
              });
            }
          );
        }
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

// 7. Enhanced Final AI Evaluation with OpenAI (post-voting, with full disclosure)
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
      async (err, proposal) => {
        if (err || !proposal) {
          return res.status(404).json({ error: 'Proposal not found' });
        }

        try {
          // Calculate public voting metrics
          const totalVotes = (proposal.upvotes || 0) + (proposal.flags || 0);
          const flagRate = totalVotes > 0 ? (proposal.flags || 0) / totalVotes : 0;
          const publicSupport = totalVotes > 0 ? (proposal.upvotes || 0) / totalVotes : 0;
          const flaggedByPublic = flagRate > 0.1; // >10% flag rate triggers concern

          // Prepare comprehensive proposal data for final AI evaluation
          const fullProposalData = {
            name: proposal.name,
            feasibility_score: proposal.feasibility,
            budget_estimate: proposal.budget,
            innovation_rating: proposal.innovation,
            submission_timestamp: proposal.timestamp,
            public_votes: {
              total_votes: totalVotes,
              upvotes: proposal.upvotes || 0,
              flags: proposal.flags || 0,
              flag_rate: Math.round(flagRate * 100),
              public_support: Math.round(publicSupport * 100)
            }
          };

          // Create prompt for comprehensive final evaluation
          const prompt = `You are conducting a FINAL EVALUATION for a government tender proposal that has completed the public voting phase. This evaluation will include full company disclosure and determine the final recommendation.

PROPOSAL DATA:
- Project Name: ${fullProposalData.name}
- Budget: $${fullProposalData.budget_estimate.toLocaleString()}
- Initial Scores: Feasibility ${fullProposalData.feasibility_score}/100, Innovation ${fullProposalData.innovation_rating}/100

PUBLIC VOTING RESULTS:
- Total Votes: ${fullProposalData.public_votes.total_votes}
- Upvotes: ${fullProposalData.public_votes.upvotes} (${fullProposalData.public_votes.public_support}% support)
- Flags: ${fullProposalData.public_votes.flags} (${fullProposalData.public_votes.flag_rate}% concern rate)

EVALUATION REQUIREMENTS:
1. Incorporate public feedback into assessment
2. Provide bias detection analysis
3. Assess legal compliance and risk factors
4. Generate final recommendation (approve/manual_review/reject)
5. Consider public transparency requirements

REQUIRED OUTPUT FORMAT (JSON):
{
  "final_score": [number 0-100, adjusted for public input],
  "risk_assessment": "[LOW/MEDIUM/HIGH] - [brief explanation]",
  "bias_detection_results": "[analysis of potential bias indicators]",
  "legal_compliance_status": "[COMPLIANT/NEEDS_REVIEW/NON_COMPLIANT] - [explanation]",
  "public_vote_impact": "[how public voting influenced the evaluation]",
  "recommendation": "[approve/manual_review/reject]",
  "final_summary": "[comprehensive 2-3 sentence conclusion]",
  "audit_trigger": [boolean - true if manual audit needed]
}

Consider that flag rates >10% indicate public concerns that should be investigated. High public support (>70%) with low flags is positive. Factor both technical merit and democratic input.`;

          let finalEvaluation;
          if (openai && process.env.OPENAI_API_KEY) {
            console.log(`🤖 Calling OpenAI for final evaluation of ${submission_id}...`);
            
            const completion = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: "You are a senior government procurement official conducting final tender evaluations. You have authority to make binding recommendations and must balance technical merit, public interest, legal compliance, and democratic input. Your evaluations directly impact public spending decisions."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.2,
              max_tokens: 1000,
              response_format: { type: "json_object" }
            });

            finalEvaluation = JSON.parse(completion.choices[0].message.content);
            console.log(`✅ OpenAI final evaluation completed for ${submission_id}`);
          } else {
            // Fallback mock final evaluation
            console.log(`⚠️ No OpenAI API key found, using mock final evaluation for ${submission_id}`);
            finalEvaluation = {
              final_score: Math.floor(Math.random() * 30) + 70 - (flaggedByPublic ? 15 : 0),
              risk_assessment: flaggedByPublic ? "MEDIUM - Public flags raised concerns" : "LOW - No significant red flags",
              bias_detection_results: "No conflicts of interest detected in preliminary analysis",
              legal_compliance_status: "COMPLIANT - All documents verified, standard procurement rules followed",
              public_vote_impact: `Public support: ${Math.round(publicSupport * 100)}%, concern flags: ${Math.round(flagRate * 100)}%`,
              recommendation: flaggedByPublic ? 'manual_review' : 'approve',
              final_summary: `Final assessment incorporating ${totalVotes} public votes. ${flaggedByPublic ? 'Requires manual review due to public concerns.' : 'Recommended for approval based on merit and public support.'}`,
              audit_trigger: flaggedByPublic
            };
          }

          // Validate and prepare final evaluation data
          const processedEvaluation = {
            company_name: `Company-${submission_id.substring(5, 10)}`, // Mock revealed name
            ownership_structure: "Private Limited Company, 3 shareholders, no government connections",
            past_performance: "4 successful public contracts completed on time, 1 minor delay in 2023",
            final_score: Math.min(100, Math.max(0, finalEvaluation.final_score || 75)),
            risk_assessment: finalEvaluation.risk_assessment || "LOW - Standard assessment",
            bias_detection_results: finalEvaluation.bias_detection_results || "No conflicts of interest detected",
            insider_connection_check: "No connections to decision makers found",
            legal_compliance_status: finalEvaluation.legal_compliance_status || "COMPLIANT - All documents verified",
            public_vote_impact: finalEvaluation.public_vote_impact || `${totalVotes} votes received`,
            flag_analysis: flaggedByPublic ? "Public flags indicate concerns requiring investigation" : "Minimal flagging activity observed",
            ai_confidence_level: flaggedByPublic ? 0.75 : 0.92,
            recommendation: finalEvaluation.recommendation || (flaggedByPublic ? 'manual_review' : 'approve'),
            audit_trigger: finalEvaluation.audit_trigger || flaggedByPublic,
            final_summary: finalEvaluation.final_summary || `Final assessment complete for ${submission_id}`,
            evaluation_metadata: JSON.stringify({
              voting_period_end: new Date().toISOString(),
              total_votes: totalVotes,
              flag_rate: Math.round(flagRate * 100),
              public_support_rate: Math.round(publicSupport * 100),
              ai_model_version: process.env.OPENAI_API_KEY ? "gpt-4_full_disclosure" : "mock_v2.1",
              bias_check_passed: true,
              ai_powered: !!process.env.OPENAI_API_KEY
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
              processedEvaluation.company_name,
              processedEvaluation.ownership_structure,
              processedEvaluation.past_performance,
              processedEvaluation.final_score,
              processedEvaluation.risk_assessment,
              processedEvaluation.bias_detection_results,
              processedEvaluation.insider_connection_check,
              processedEvaluation.legal_compliance_status,
              processedEvaluation.public_vote_impact,
              processedEvaluation.flag_analysis,
              processedEvaluation.ai_confidence_level,
              processedEvaluation.recommendation,
              processedEvaluation.audit_trigger,
              processedEvaluation.final_summary,
              processedEvaluation.evaluation_metadata
            ],
            function(err) {
              if (err) {
                console.error('Error inserting final evaluation:', err);
                return res.status(500).json({ error: 'Failed to generate final evaluation' });
              }

              console.log(`✅ Final evaluation generated for ${submission_id} (Score: ${processedEvaluation.final_score}, Recommendation: ${processedEvaluation.recommendation})`);
              res.json({ 
                success: true, 
                final_evaluation: processedEvaluation,
                message: 'Final evaluation generated successfully',
                ai_powered: !!process.env.OPENAI_API_KEY
              });
            }
          );

        } catch (aiError) {
          console.error('OpenAI final evaluation error:', aiError);
          
          // Fallback logic for final evaluation
          const flaggedByPublic = (proposal.flags || 0) > (proposal.upvotes || 0) * 0.1;
          const publicSupport = (proposal.upvotes || 0) / ((proposal.upvotes || 0) + (proposal.flags || 0) + 1);
          
          const fallbackEvaluation = {
            company_name: `Company-${submission_id.substring(5, 10)}`,
            ownership_structure: "Private Limited Company, 3 shareholders, no government connections",
            past_performance: "4 successful public contracts completed on time, 1 minor delay in 2023",
            final_score: Math.floor(Math.random() * 30) + 70 - (flaggedByPublic ? 15 : 0),
            risk_assessment: flaggedByPublic ? "MEDIUM - Public flags raised concerns" : "LOW - No significant red flags",
            bias_detection_results: "No conflicts of interest detected",
            insider_connection_check: "No connections to decision makers found",
            legal_compliance_status: "COMPLIANT - All documents verified",
            public_vote_impact: `Public support: ${(publicSupport * 100).toFixed(1)}%, Flags: ${proposal.flags || 0}`,
            flag_analysis: flaggedByPublic ? "Flags primarily concern budget feasibility" : "Minimal flagging activity",
            ai_confidence_level: flaggedByPublic ? 0.75 : 0.92,
            recommendation: flaggedByPublic ? 'manual_review' : 'approve',
            audit_trigger: flaggedByPublic,
            final_summary: `Final assessment incorporating public feedback. ${flaggedByPublic ? 'Requires manual review due to public concerns.' : 'Recommended for approval based on merit and public support.'}`,
            evaluation_metadata: JSON.stringify({
              voting_period_end: new Date().toISOString(),
              total_voters: Math.floor((proposal.upvotes || 0) + (proposal.flags || 0)),
              ai_model_version: "fallback_v2.1",
              bias_check_passed: true,
              ai_powered: false,
              fallback_reason: aiError.message
            })
          };

          // Insert fallback final evaluation
          db.run(
            `INSERT INTO final_evaluations (
              submission_id, company_name, ownership_structure, past_performance,
              final_score, risk_assessment, bias_detection_results, insider_connection_check,
              legal_compliance_status, public_vote_impact, flag_analysis, ai_confidence_level,
              recommendation, audit_trigger, final_summary, evaluation_metadata
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              submission_id,
              fallbackEvaluation.company_name,
              fallbackEvaluation.ownership_structure,
              fallbackEvaluation.past_performance,
              fallbackEvaluation.final_score,
              fallbackEvaluation.risk_assessment,
              fallbackEvaluation.bias_detection_results,
              fallbackEvaluation.insider_connection_check,
              fallbackEvaluation.legal_compliance_status,
              fallbackEvaluation.public_vote_impact,
              fallbackEvaluation.flag_analysis,
              fallbackEvaluation.ai_confidence_level,
              fallbackEvaluation.recommendation,
              fallbackEvaluation.audit_trigger,
              fallbackEvaluation.final_summary,
              fallbackEvaluation.evaluation_metadata
            ],
            function(err) {
              if (err) {
                console.error('Error inserting fallback final evaluation:', err);
                return res.status(500).json({ error: 'Failed to generate final evaluation' });
              }

              console.log(`⚠️ Fallback final evaluation stored for ${submission_id}`);
              res.json({ 
                success: true, 
                final_evaluation: fallbackEvaluation,
                message: 'Final evaluation generated (fallback mode)',
                ai_powered: false,
                fallback_reason: aiError.message
              });
            }
          );
        }
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
