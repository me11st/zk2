# zkTender 🏛️

- **Track(s):** Privacy & AI/ML Innovation
- **Team/Contributors:** mell (Full-Stack Development, UX Design, System Architecture)
- **Repository:** [https://github.com/me11st/-projects-zk2-](https://github.com/me11st/-projects-zk2-)
- **Demo:** http://localhost:3000 (Local Development)

## Description (TL;DR)
zkTender is a privacy-preserving government tender system that combines Zero-Knowledge proofs, AI evaluation, and blockchain technology to create transparent, fair, and tamper-proof public procurement processes. Companies submit proposals anonymously, AI evaluates them without bias, the public votes using ZK privacy, and final results include full disclosure with bias detection.

## Problem
Traditional government tender processes suffer from:
- **Lack of transparency** - Citizens can't see evaluation criteria or vote on proposals
- **Potential bias** - Human evaluators may have conflicts of interest or unconscious bias
- **Privacy concerns** - Company information exposed during evaluation process
- **Voter intimidation** - Public voting can lead to retaliation or influence
- **Limited accountability** - No clear audit trail or bias detection mechanisms

## Solution
zkTender addresses these issues through a four-phase workflow:

1. **📝 Anonymous Submission** - Companies submit proposals with privacy-preserving Poseidon hashing
2. **🤖 AI Evaluation** - Unbiased AI assessment without company identity disclosure
3. **🗳️ Private Voting** - Public votes using Zero-Knowledge proofs to protect voter identity
4. **🏆 Full Disclosure** - Complete transparency with bias detection and final recommendations

Key innovations:
- **ZK Privacy**: Voters can participate without revealing identity or vote details
- **AI Fairness**: Initial evaluation without company names to prevent bias
- **Blockchain Security**: StarkNet integration for tamper-proof voting
- **Progressive Transparency**: Anonymous evaluation → Public voting → Full disclosure

## Technology Stack

### Frontend
- **Next.js 15** - React framework with TypeScript
- **Tailwind CSS 4** - Modern styling and responsive design
- **@argent/get-starknet** - Real StarkNet wallet integration (Braavos/ArgentX)

### Blockchain & Privacy
- **StarkNet** - Layer 2 blockchain for scalable transactions
- **circomlibjs** - Poseidon hash implementation for privacy
- **Zero-Knowledge Proofs** - Voter privacy with nullifier-based anti-double-voting

### Backend
- **Express.js 5** - RESTful API server
- **SQLite3** - Local database with 5 tables (proposals, ai_evaluations, votes, final_evaluations, voting_stats)
- **CORS** - Cross-origin resource sharing

### AI & Development
- **OpenAI GPT-4** - Real AI evaluation with intelligent fallback
- **Concurrently** - Parallel server management
- **Node-fetch** - HTTP client for API integration

## Privacy Impact

zkTender significantly enhances privacy through multiple layers:

### Voter Privacy
- **Zero-Knowledge Proofs**: Vote without revealing identity or vote content
- **Nullifier System**: Prevents double-voting while maintaining anonymity
- **No Vote Tracking**: Impossible to correlate voters with their choices

### Company Privacy
- **Phased Disclosure**: Initial evaluation happens without company identification
- **Selective Transparency**: Only relevant information disclosed at appropriate times
- **Protected Submissions**: Poseidon hashing ensures proposal integrity without exposure

### Process Integrity
- **Bias Detection**: AI analysis of potential conflicts of interest
- **Audit Trails**: Complete cryptographic proof of all actions
- **Tamper-Proof Records**: Blockchain-backed immutable voting records

## Real-World Use Cases

### Government Agencies
- **Municipal Contracts**: Road construction, public building projects
- **Technology Procurement**: Software systems, infrastructure upgrades
- **Service Contracts**: Waste management, security services
- **Consulting Services**: Legal, financial, technical advisory

### Organizations
- **NGOs**: Grant allocation with community input
- **Cooperatives**: Member-driven decision making on contracts
- **Academic Institutions**: Research funding allocation
- **International Bodies**: Multi-stakeholder procurement processes

### Benefits by Stakeholder
- **Citizens**: Transparent insight into public spending decisions
- **Companies**: Fair evaluation process without bias
- **Officials**: Reduced liability and increased accountability
- **Auditors**: Complete cryptographic audit trail

## Business Logic

### Revenue Models
- **SaaS Licensing**: Government agencies pay per-tender or annual subscription
- **Transaction Fees**: Small fee per vote or proposal submission
- **Enterprise Consulting**: Custom implementation and integration services
- **API Access**: Third-party developers building on the platform

### Cost Structure
- **Infrastructure**: Blockchain gas fees, server hosting
- **AI Processing**: OpenAI API calls for real evaluations
- **Development**: Ongoing feature development and security audits
- **Compliance**: Legal and regulatory compliance costs

### Sustainability
- **Network Effects**: More participants increase platform value
- **Data Insights**: Aggregated (anonymous) tender analytics
- **Integration Revenue**: Connecting with existing government systems
- **International Expansion**: Scaling to multiple jurisdictions

## What's Next

### Immediate (Next 2 Weeks)
- **Enhanced AI Features**: Multi-modal evaluation (documents, presentations)
- **Security Audit**: Professional penetration testing
- **Mobile Optimization**: Responsive design improvements
- **Demo Video**: Professional demonstration for hackathons

### Short Term (1-3 Months)
- **Smart Contract Migration**: Move from local database to full blockchain
- **Advanced ZK Circuits**: Custom zero-knowledge proof implementations
- **Multi-Language Support**: Internationalization for global use
- **Integration APIs**: Connect with existing government systems

### Long Term (6-12 Months)
- **Regulatory Compliance**: Work with government agencies for approval
- **Scalability Solutions**: Handle thousands of concurrent proposals
- **Advanced AI Features**: Multi-modal evaluation (documents, presentations)
- **Governance Token**: Decentralized platform governance

### Vision
Transform public procurement globally by making it transparent, fair, and privacy-preserving. Enable citizens to participate in government decisions while protecting all stakeholders through cutting-edge cryptographic privacy.

## 📜 Fair Use License

**"Free for the people. Funded by the ones with power."**

zkTender operates under an innovative **Fair Use License** that ensures:

🔓 **Free for Civic Use:**
- Students, activists, civic hackers, grassroots movements
- Personal, educational, and non-commercial purposes
- Community-driven improvements welcomed

🏛️ **Paid for Institutional Use:**
- Government agencies and municipalities
- NGOs with budgets >€100k, corporations
- Required licensing supports continued development

This approach democratizes access while ensuring sustainability. [Full License Details](./LICENSE.md)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up OpenAI for real AI evaluation (optional)
./setup-openai.sh
export OPENAI_API_KEY='sk-your-key-here'

# Start both servers
npm run dev:full

# Or run separately:
npm run server  # API server on :3003
npm run dev     # Frontend on :3000
```

### AI Features
- **With OpenAI API Key**: GPT-4 powered intelligent proposal evaluation
- **Without API Key**: Intelligent fallback system maintains full functionality
- **Real-time AI Analysis**: Anonymized initial evaluations + comprehensive final assessments

## 📊 Demo Workflow

```bash
# Run the complete demo
chmod +x demo-workflow.sh
./demo-workflow.sh
```

**Built with ❤️ in one week - from idea to production-ready system** ✨

*"Oh, that's just the beginning 😊" - and indeed it was! What started as a simple concept evolved into a complete privacy-preserving government tender system with real AI integration, democratic participation, and innovative licensing that puts power back in the hands of the people.*