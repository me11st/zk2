#!/bin/bash

echo "🤖 Setting up OpenAI Integration for zkTender"
echo "============================================="
echo ""

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY environment variable not set"
    echo ""
    echo "To enable real AI evaluation, please:"
    echo "1. Get your OpenAI API key from: https://platform.openai.com/api-keys"
    echo "2. Set the environment variable:"
    echo "   export OPENAI_API_KEY='sk-...your-key-here'"
    echo "3. Restart the zkTender API server"
    echo ""
    echo "⚠️  Without API key, zkTender will use intelligent fallback evaluations"
    echo ""
else
    echo "✅ OPENAI_API_KEY is set!"
    echo "🔒 Key preview: ${OPENAI_API_KEY:0:7}...${OPENAI_API_KEY: -4}"
    echo ""
    echo "🚀 zkTender will now use GPT-4 for:"
    echo "   • Initial anonymized proposal evaluation"
    echo "   • Final comprehensive assessment with public input"
    echo "   • Bias detection and risk analysis"
    echo "   • Legal compliance verification"
    echo ""
fi

echo "📋 OpenAI Integration Features:"
echo "================================"
echo "• GPT-4 powered proposal analysis"
echo "• Anonymized initial evaluations (no company names)"
echo "• Comprehensive final evaluations with full disclosure"
echo "• Public voting impact analysis"
echo "• Bias detection and conflict of interest checks"
echo "• Risk assessment and compliance verification"
echo "• Intelligent fallback when API unavailable"
echo ""

echo "🔄 Restart your zkTender servers to apply changes:"
echo "   npm run dev:full"
echo ""
