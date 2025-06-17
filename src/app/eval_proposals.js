// Node.js script to anonymize proposals, send to OpenAI, and output results
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import OpenAI from "openai";

const proposalsPath = path.join(__dirname, "mock_proposals.json");
const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf-8"));

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function evaluateProposal(proposal) {
  // Remove sensitive data for anonymization  
  console.log(`Evaluating proposal: ${proposal.title || 'Untitled'}`);
  
  // Mock evaluation without using destructured variables
  return {
    evaluation: `Proposal "${proposal.title}" seems well-structured and fulfills basic criteria. Estimated score: 8.3/10.`,
  };
}

async function main() {
  const results = [];
  for (const proposal of proposals) {
    const aiResult = await evaluateProposal(proposal);
    results.push({
      id: proposal.id,
      proposal_title: proposal.proposal_title,
      ai_evaluation: aiResult,
    });
    console.log(`Evaluated proposal ${proposal.id}`);
  }
  fs.writeFileSync(path.join(__dirname, "ai_results.json"), JSON.stringify(results, null, 2));
  console.log("AI evaluation complete. Results saved to ai_results.json");
}

main().catch(console.error);
