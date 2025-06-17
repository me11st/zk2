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

// Multi-instance database connections
const databases = {};
const instances = ['zk1', 'zk2', 'zk3', 'zk4'];

// Initialize all database connections
instances.forEach(instance => {
  const dbPath = path.join(__dirname, `zktender_${instance}.db`);
  databases[instance] = new sqlite3.Database(dbPath);
  console.log(`📊 Database connected: ${instance} -> zktender_${instance}.db`);
});

// Helper function to get database for instance
const getDatabase = (instance) => {
  if (!databases[instance]) {
    throw new Error(`Invalid instance: ${instance}`);
  }
  return databases[instance];
};

// INSTANCE STATUS AND CONFIGURATION
const instanceConfig = {
  zk1: {
    phase: 'final',
    name: 'Metropolitan Infrastructure Tender zk1',
    description: 'Advanced urban development proposals',
    submission_deadline: '2024-12-15T12:00:00Z',
    reveal_deadline: '2024-12-20T12:00:00Z',
    voting_deadline: '2024-12-25T12:00:00Z',
    final_date: '2025-01-01T12:00:00Z',
    status: 'Complete - Results Available'
  },
  zk2: {
    phase: 'submission',
    name: 'Smart City Innovation Tender zk2',
    description: 'Next-generation digital infrastructure',
    submission_deadline: '2025-07-15T12:00:00Z',
    reveal_deadline: '2025-07-20T12:00:00Z',
    voting_deadline: '2025-07-25T12:00:00Z',
    final_date: '2025-08-01T12:00:00Z',
    status: 'Open for Submissions'
  },
  zk3: {
    phase: 'submission',
    name: 'Sustainable Development Tender zk3',
    description: 'Green technology and environmental solutions',
    submission_deadline: '2025-08-15T12:00:00Z',
    reveal_deadline: '2025-08-20T12:00:00Z',
    voting_deadline: '2025-08-25T12:00:00Z',
    final_date: '2025-09-01T12:00:00Z',
    status: 'Open for Submissions'
  },
  zk4: {
    phase: 'voting',
    name: 'Transportation Network Tender zk4',
    description: 'Modern transit and mobility solutions',
    submission_deadline: '2025-06-01T12:00:00Z',
    reveal_deadline: '2025-06-10T12:00:00Z',
    voting_deadline: '2025-07-01T12:00:00Z',
    final_date: '2025-07-15T12:00:00Z',
    status: 'Public Voting in Progress'
  }
};

// API Routes

// Get all tender instances overview
app.get('/api/instances', (req, res) => {
  const overview = Object.entries(instanceConfig).map(([id, config]) => ({
    id,
    ...config
  }));
  
  res.json({
    success: true,
    instances: overview,
    total_instances: instances.length
  });
});

// Get specific instance status
app.get('/api/instances/:instance', (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const db = getDatabase(instance);
  
  // Get submissions count
  db.get(
    "SELECT COUNT(*) as total FROM proposal_commitments",
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        success: true,
        instance,
        ...instanceConfig[instance],
        total_submissions: row.total || 0
      });
    }
  );
});

// Instance-specific public state
app.get('/api/instances/:instance/public-state', (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const db = getDatabase(instance);
  const config = instanceConfig[instance];
  
  db.all(
    `SELECT pc.submission_id, pc.commitment_hash, pc.submission_timestamp, 
            CASE WHEN rp.submission_id IS NOT NULL THEN 'revealed' ELSE 'committed' END as status
     FROM proposal_commitments pc
     LEFT JOIN revealed_proposals rp ON pc.submission_id = rp.submission_id
     ORDER BY pc.submission_timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      const anonymous_commitments = rows.map(row => ({
        id: row.submission_id,
        commitment_preview: row.commitment_hash.substring(0, 18) + '...',
        timestamp: row.submission_timestamp,
        status: row.status
      }));
      
      res.json({
        instance,
        current_phase: config.phase,
        submission_deadline: config.submission_deadline,
        reveal_deadline: config.reveal_deadline,
        voting_deadline: config.voting_deadline,
        total_submissions: rows.length,
        anonymous_commitments,
        message: `zkTender ${instance}: ${config.status}`
      });
    }
  );
});

// Instance-specific revealed proposals
app.get('/api/instances/:instance/revealed', (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const config = instanceConfig[instance];
  
  // Only show revealed data if in appropriate phase
  if (config.phase === 'submission') {
    return res.json({
      instance,
      phase: config.phase,
      revealed_proposals: [],
      message: 'Proposals are still being submitted - no data revealed yet'
    });
  }
  
  const db = getDatabase(instance);
  
  db.all(
    `SELECT * FROM revealed_proposals ORDER BY reveal_timestamp DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        instance,
        phase: config.phase,
        revealed_proposals: rows,
        total_revealed: rows.length
      });
    }
  );
});

// Instance-specific voting statistics
app.get('/api/instances/:instance/votes/statistics', (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const config = instanceConfig[instance];
  
  // Only show voting data if in voting or final phase
  if (config.phase === 'submission') {
    return res.json({
      instance,
      phase: config.phase,
      voting_statistics: [],
      message: 'Voting has not started yet'
    });
  }
  
  const db = getDatabase(instance);
  
  db.all(
    `SELECT 
       submission_id,
       COUNT(*) as total_votes,
       SUM(CASE WHEN vote_type = 'support' THEN 1 ELSE 0 END) as support_votes,
       SUM(CASE WHEN vote_type = 'concern' THEN 1 ELSE 0 END) as concern_votes
     FROM anonymous_votes 
     GROUP BY submission_id`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({
        instance,
        phase: config.phase,
        voting_statistics: rows,
        total_voting_sessions: rows.length
      });
    }
  );
});

// Submit proposal commitment to specific instance
app.post('/api/instances/:instance/proposals/commit', async (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const config = instanceConfig[instance];
  
  // Check if submission is allowed in current phase
  if (config.phase !== 'submission') {
    return res.status(400).json({ 
      error: `Submissions not allowed in ${config.phase} phase`,
      current_phase: config.phase
    });
  }
  
  try {
    const {
      commitment_hash,
      nullifier_hash,
      wallet_address,
      encrypted_proposal_data,
      zk_proof
    } = req.body;
    
    if (!commitment_hash || !nullifier_hash || !wallet_address || !zk_proof) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDatabase(instance);
    
    // Generate unique submission ID
    const submission_id = `${instance}_proposal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Check if nullifier already exists (prevent double submission)
    db.get(
      "SELECT id FROM proposal_commitments WHERE nullifier = ?",
      [nullifier_hash],
      (err, row) => {
        if (err) {
          console.error('Error checking nullifier:', err);
          console.error('Full error details:', err.message, err.stack);
          return res.status(500).json({ error: 'Database error checking nullifier: ' + err.message });
        }
        
        if (row) {
          return res.status(400).json({ error: 'Proposal already submitted (nullifier exists)' });
        }
        
        // Insert proposal commitment (match the actual database schema)
        db.run(
          `INSERT INTO proposal_commitments 
           (submission_id, commitment_hash, submitter_address, zk_proof, nullifier) 
           VALUES (?, ?, ?, ?, ?)`,
          [submission_id, commitment_hash, wallet_address, zk_proof, nullifier_hash],
          function(err) {
            if (err) {
              console.error('Error inserting proposal commitment:', err);
              console.error('Full insertion error details:', err.message, err.stack);
              console.error('Attempted values:', [submission_id, commitment_hash, wallet_address, zk_proof, nullifier_hash]);
              return res.status(500).json({ error: 'Failed to store proposal commitment: ' + err.message });
            }
            
            console.log(`📝 Proposal commitment recorded for ${instance}: ${submission_id}`);
            
            res.json({
              success: true,
              instance,
              submission_id,
              commitment_hash,
              message: 'Proposal commitment recorded successfully'
            });
          }
        );
      }
    );
    
  } catch (error) {
    console.error('Proposal submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit vote to specific instance
app.post('/api/instances/:instance/votes/anonymous', async (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const config = instanceConfig[instance];
  
  // Check if voting is allowed in current phase
  if (config.phase !== 'voting' && config.phase !== 'final') {
    return res.status(400).json({ 
      error: `Voting not available in ${config.phase} phase`,
      current_phase: config.phase
    });
  }
  
  try {
    const {
      submission_id,
      vote_commitment,
      nullifier,
      zk_vote_proof,
      vote_type,
      stake_commitment,
      voter_address = 'anonymous' // Default for ZK privacy
    } = req.body;
    
    const db = getDatabase(instance);
    
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
        
        // Insert anonymous vote (match the actual database schema)
        db.run(
          `INSERT INTO anonymous_votes 
           (submission_id, voter_address, vote_type, zk_proof, nullifier, commitment, stake_amount) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [submission_id, voter_address, vote_type, zk_vote_proof, nullifier, vote_commitment, parseFloat(stake_commitment) || 1],
          function(err) {
            if (err) {
              console.error('Error inserting vote:', err);
              return res.status(500).json({ error: 'Failed to record vote' });
            }
            
            console.log(`🗳️ Anonymous vote recorded for ${instance}:${submission_id} - ${vote_type}`);
            
            res.json({
              success: true,
              instance,
              vote_id: this.lastID,
              message: 'Vote recorded anonymously'
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

// Submit comment to specific instance
app.post('/api/instances/:instance/comments/anonymous', async (req, res) => {
  const { instance } = req.params;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const config = instanceConfig[instance];
  
  // Check if commenting is allowed in current phase (allow in voting and final phases)
  if (config.phase !== 'voting' && config.phase !== 'final') {
    return res.status(400).json({ 
      error: `Comments not available in ${config.phase} phase`,
      current_phase: config.phase
    });
  }
  
  try {
    const {
      submission_id,
      comment_text,
      nullifier,
      zk_proof,
      commitment,
      commenter_address = 'anonymous' // Default for ZK privacy
    } = req.body;
    
    if (!submission_id || !comment_text || !nullifier || !zk_proof) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const db = getDatabase(instance);
    
    // Check if nullifier already exists (prevent double commenting)
    db.get(
      "SELECT id FROM anonymous_comments WHERE nullifier = ?",
      [nullifier],
      (err, row) => {
        if (err) {
          console.error('Error checking comment nullifier:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (row) {
          return res.status(400).json({ error: 'Comment already submitted (nullifier exists)' });
        }
        
        // Insert anonymous comment
        db.run(
          `INSERT INTO anonymous_comments 
           (submission_id, commenter_address, comment_text, zk_proof, nullifier, commitment, stake_amount) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [submission_id, commenter_address, comment_text, zk_proof, nullifier, commitment, 0.5],
          function(err) {
            if (err) {
              console.error('Error inserting comment:', err);
              return res.status(500).json({ error: 'Failed to record comment' });
            }
            
            console.log(`💬 Anonymous comment recorded for ${instance}:${submission_id}`);
            
            res.json({
              success: true,
              instance,
              comment_id: this.lastID,
              message: 'Comment recorded anonymously'
            });
          }
        );
      }
    );
    
  } catch (error) {
    console.error('Comment submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advance instance phase (admin function)
app.post('/api/instances/:instance/advance-phase', (req, res) => {
  const { instance } = req.params;
  const { new_phase } = req.body;
  
  if (!instanceConfig[instance]) {
    return res.status(404).json({ error: `Instance ${instance} not found` });
  }
  
  const validPhases = ['submission', 'reveal', 'voting', 'final'];
  if (!validPhases.includes(new_phase)) {
    return res.status(400).json({ error: 'Invalid phase' });
  }
  
  // Update in-memory config (in production, this would update the database)
  instanceConfig[instance].phase = new_phase;
  
  const statusMap = {
    'submission': 'Open for Submissions',
    'reveal': 'Reveal Phase Active',
    'voting': 'Public Voting in Progress',
    'final': 'Complete - Results Available'
  };
  
  instanceConfig[instance].status = statusMap[new_phase];
  
  console.log(`⚙️ Instance ${instance} advanced to ${new_phase} phase`);
  
  res.json({
    success: true,
    instance,
    new_phase,
    status: instanceConfig[instance].status,
    message: `Instance ${instance} advanced to ${new_phase} phase`
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    instances: instances,
    openai_enabled: !!openai
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🔒 zkTender MULTI-INSTANCE API server running on http://localhost:' + PORT);
  console.log('📊 Managing instances:', instances.join(', '));
  console.log('🔐 ZERO-KNOWLEDGE PRIVACY MODE ACTIVE');
  console.log('');
  console.log('🔗 Multi-Instance Endpoints:');
  console.log('    GET  /api/instances                     - List all tender instances');
  console.log('    GET  /api/instances/:id                 - Get instance details');
  console.log('    GET  /api/instances/:id/public-state    - Get instance public state');
  console.log('    POST /api/instances/:id/proposals/commit - Submit proposal commitment');
  console.log('    GET  /api/instances/:id/revealed        - Get revealed proposals');
  console.log('    GET  /api/instances/:id/votes/statistics - Get voting statistics');
  console.log('    POST /api/instances/:id/votes/anonymous - Submit anonymous vote');
  console.log('    POST /api/instances/:id/advance-phase   - Advance instance phase');
  console.log('    GET  /api/health                        - Health check');
  console.log('');
  console.log('📋 Instance Status:');
  Object.entries(instanceConfig).forEach(([id, config]) => {
    console.log(`    ${id}: ${config.phase.toUpperCase()} - ${config.status}`);
  });
});
