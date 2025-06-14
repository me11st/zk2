# zkTender Frontend

This is a Next.js (TypeScript, Tailwind) frontend for zkTender.

## Features
- Welcome screen with wallet connect (Braavos/ArgentX via starknet.js)
- After connection: Success message and zk1/zk2 options
- Proposal form: name, feasibility score, budget estimate, innovation rating, attachments (IPFS/off-chain)
- On submit: hashes proposal data (mock Poseidon/zk), creates calldata, submits via starknet.js (mocked)
- Modern, beautiful UI

## Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- starknet.js (wallet integration)
- circomlibjs (mocked for hash)
- IPFS (mocked for attachments)

## Getting Started
```bash
npm install
npm run dev
```

## Project Flow
1. Connect wallet
2. Fill proposal form
3. Submit (zk hash, calldata, contract call)
4. See confirmation

## Notes on Multiple Submissions

- You may submit multiple proposals, even from different wallets. Each submission will be evaluated and charged separately (AI + human expert costs).
- Submitting multiple proposals means you may end up competing with yourself.
- There are no technical restrictions on the number of submissions per wallet or participant.

---

This project is for hackathon/demo purposes. ZK and contract calls are mocked for now.
