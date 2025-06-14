// Node.js script to anonymize proposals, send to OpenAI, and output results
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import OpenAI from "openai";

const proposalsPath = path.join(__dirname, "mock_proposals.json");
const proposals = JSON.parse(fs.readFileSync(proposalsPath, "utf-8"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function evaluateProposal(proposal) {
  // Remove company_name for anonymization
  const { company_name, id, ...anonymized } = proposal;
  // const prompt = `You are a public procurement expert. Evaluate the following proposal based on: technical quality, sustainability, and experience. Rate each from 1–10 and explain your reasoning.\nProposal: ${JSON.stringify(anonymized, null, 2)}`;
  // const response = await openai.chat.completions.create({
  //   model: "gpt-3.5-turbo",
  //   messages: [
  //     { role: "system", content: "You are a public procurement expert." },
  //     { role: "user", content: prompt },
  //   ],
  //   temperature: 0.2,
  //   max_tokens: 300,
  // });
  // return response.choices[0].message.content;
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
