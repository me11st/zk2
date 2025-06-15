# zkTender Navigation Flow

## 📍 Complete Navigation System

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │────▶│                     │────▶│                     │
│   Main Page (/)     │     │ Public Voting       │     │ Final Evaluations   │
│                     │◀────│ (/public-vote)      │◀────│ (/final-evaluations)│
│  📝 Submit Proposal │     │  🗳️ Vote on Proposals │     │  🏆 View Results    │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                           │                           │
          │                           │                           │
          ▼                           ▼                           ▼
   Fixed buttons at                Navigation buttons          Navigation buttons
   bottom right:                   at bottom:                  at bottom:
   🗳️ Public Voting               ← Submit Proposal            ← Submit Proposal  
   🏆 Final Results               🏆 Final Results →           🗳️ Public Voting
```

## 🎯 Navigation Features
- **No dead ends**: Every page has navigation to other sections
- **Logical flow**: Follows the tender workflow (Submit → Vote → Results)
- **Easy access**: Fixed buttons on main page for quick access
- **Complete circuit**: Can navigate between all three pages seamlessly
- **Progress tracking**: Visual timeline shows current phase and completion status
- **Status awareness**: Users always know where they are in the process

## 📊 Progress Indicator Features
- **Visual timeline**: Shows all 4 phases of the tender process
- **Current phase highlighting**: Active phase is clearly marked with brand color
- **Completion tracking**: Completed phases show green checkmarks
- **Phase descriptions**: Each step includes helpful context
- **Deadline awareness**: Submission deadline prominently displayed
- **Consistent across pages**: Same progress view on all main pages

### Progress Phases:
1. **📝 Submit Proposals** - Companies submit their proposals
2. **🤖 AI Evaluation** - Anonymous AI assessment  
3. **🗳️ Public Voting** - Community votes with ZK privacy
4. **🏆 Final Results** - Full disclosure & recommendations
4. **Gov intake** - e.g. 10% to final voting (just an idea)
5. **Smart contract execution** - The winning company is paid in **stages**. Each milestone (e.g., 30%, 40%, 30%) is released **after verification** of progress. (just an idea)

## 🔄 User Journey
1. **Submit Proposal** (/) - Connect wallet, fill form, submit untill 0:00 h x date.
2. **Primary AI evaluation** without the names of the companies starts at 0:01 x+1 date
2. **Public Voting** (/public-vote) - View proposals, vote with ZK privacy
3. **Final Results** (/final-evaluations) - See full company disclosure and AI recommendations
4. **Gov intake** - 10% to final voting
5. **Smart contract execution** - The winning company is paid in **stages**. Each milestone (e.g., 30%, 40%, 30%) is released **after verification** of progress.

The navigation now forms a complete circuit with no dead ends! 🎉
