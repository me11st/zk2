<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a Next.js (TypeScript, Tailwind) project for zkTender. The frontend should:
- Welcome users and prompt to connect a StarkNet wallet (Braavos/ArgentX via starknet.js)
- After connection, show success and options for zk1/zk2
- Show a proposal form (name, feasibility score, budget estimate, innovation rating, attachments)
- On submit, hash data (mock Poseidon/zk), create calldata, and submit via starknet.js (mocked)
- Show 'Submitted securely ✔️' after submission
- Use modern, beautiful UI
- Use circomlibjs, IPFS, and starknet.js (mocked for now)
