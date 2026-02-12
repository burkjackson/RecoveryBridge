#!/bin/bash
# Simple deployment script for RecoveryBridge

echo "🚀 Pushing RecoveryBridge to GitHub..."

git add -A
git commit -m "Deploy RecoveryBridge" || echo "Nothing to commit"
git push origin main

echo "✅ Code pushed to GitHub!"
echo ""
echo "Now go to: https://vercel.com/new"
echo "And import: https://github.com/burkjackson/RecoveryBridge"
