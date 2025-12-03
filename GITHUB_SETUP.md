# GitHub Repository Setup Guide

**Version:** 1.0  
**Date:** December 3, 2025  
**Purpose:** Securely push trading bot code to GitHub

---

## ✅ Security Status

**Your repository is now secure:**
- ✅ API keys removed from git history
- ✅ `.gitignore` configured to prevent sensitive data commits
- ✅ `config.example.js` created as template
- ✅ `config.js` (with real API keys) is ignored
- ✅ Logs and trade data excluded
- ✅ Ready for GitHub!

---

## 📋 Step-by-Step GitHub Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Fill in repository details:
   - **Repository name:** `binance-trading-bot` (or your preferred name)
   - **Description:** "Automated cryptocurrency trading bot for Binance.US with multi-strategy support"
   - **Visibility:** **Private** ⚠️ (IMPORTANT!)
   - **Initialize:** Leave all checkboxes UNCHECKED (we already have files)

3. Click **"Create repository"**

4. Copy the repository URL from the page:
   ```
   https://github.com/YOUR_USERNAME/binance-trading-bot.git
   ```

---

### Step 2: Connect Local Repository to GitHub

**On the Manus sandbox, run:**

```bash
cd /home/ubuntu/trading-bot-websocket

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/binance-trading-bot.git

# Verify remote was added
git remote -v
```

**Expected output:**
```
origin  https://github.com/YOUR_USERNAME/binance-trading-bot.git (fetch)
origin  https://github.com/YOUR_USERNAME/binance-trading-bot.git (push)
```

---

### Step 3: Push Code to GitHub

```bash
# Push all commits and tags
git push -u origin master --tags
```

**You'll be prompted for GitHub credentials:**
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token** (not your GitHub password!)

---

### Step 4: Create GitHub Personal Access Token (if needed)

If you don't have a Personal Access Token:

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: "Trading Bot Repository"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click **"Generate token"**
6. **COPY THE TOKEN IMMEDIATELY** (you won't see it again!)
7. Use this token as your password when pushing

---

### Step 5: Verify Upload

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/binance-trading-bot`
2. You should see:
   - ✅ All code files
   - ✅ Documentation (TECHNICAL_WHITEPAPER.md, etc.)
   - ✅ Changelogs
   - ✅ config.example.js (with placeholder API keys)
   - ❌ config.js (should NOT be there!)
   - ❌ *.log files (should NOT be there!)
   - ❌ trades.csv (should NOT be there!)

---

## 🔒 Security Verification Checklist

**Before sharing the repository, verify:**

- [ ] Repository is set to **Private**
- [ ] `config.js` is NOT in the repository
- [ ] No API keys visible in any files
- [ ] No log files committed
- [ ] No trade data (trades.csv) committed
- [ ] `.gitignore` is present and working
- [ ] `config.example.js` has placeholder values only

---

## 📦 Repository Structure

**What's in the repository:**

```
binance-trading-bot/
├── .gitignore                          ← Prevents sensitive data commits
├── bot.js                              ← Main trading bot logic
├── config.example.js                   ← Configuration template (safe)
├── portfolio-manager.js                ← Portfolio rebalancing module
├── deploy.sh                           ← Deployment script
├── package.json                        ← Node.js dependencies
├── README.md                           ← Project overview
├── TECHNICAL_WHITEPAPER.md             ← Comprehensive documentation
├── AI_CODE_REVIEW_GUIDE.md             ← AI review guide
├── CONTINUOUS_IMPROVEMENT_ROADMAP.md   ← Improvement plan
├── OPTIMIZATION_PLAN_PERFORMANCE.md    ← Performance optimization
├── OPTIMIZATION_PLAN_RISK.md           ← Risk management
├── PERFORMANCE_ANALYSIS.md             ← Performance metrics
├── PORTFOLIO_REBALANCING_DESIGN.md     ← Rebalancing documentation
├── ROADMAP.md                          ← Development roadmap
├── CHANGELOG-v2.1.6.md                 ← Version changelogs
├── CHANGELOG-v2.1.7.md
├── CHANGELOG-v2.1.8.md
├── CHANGELOG-v2.2.0.md
├── CHANGELOG-v2.2.1.md
└── CHANGELOG-v2.3.0.md
```

**What's NOT in the repository (protected by .gitignore):**

```
config.js              ← Contains real API keys
*.log                  ← Log files
trades.csv             ← Trade history
node_modules/          ← Dependencies
*.tar.gz               ← Deployment packages
```

---

## 🔄 Future Updates

**To push new changes to GitHub:**

```bash
cd /home/ubuntu/trading-bot-websocket

# Check what changed
git status

# Add changes
git add .

# Commit with message
git commit -m "Description of changes"

# Push to GitHub
git push origin master

# If you created a new tag
git push origin master --tags
```

---

## 🚨 Emergency: Accidentally Committed API Keys

**If you accidentally committed API keys:**

### Option 1: Remove from latest commit (if just committed)

```bash
# Undo last commit but keep changes
git reset HEAD~1

# Remove sensitive file
git rm --cached config.js

# Re-commit without sensitive file
git commit -m "Remove sensitive data"

# Force push (overwrites GitHub)
git push origin master --force
```

### Option 2: Remove from entire history (if committed earlier)

```bash
# Install BFG Repo-Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove config.js from all history
java -jar bfg-1.14.0.jar --delete-files config.js

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (overwrites GitHub)
git push origin master --force
```

### Option 3: Rotate API keys (RECOMMENDED)

**Even after removing from git, the keys were exposed. You should:**

1. Log into Binance.US
2. Go to API Management
3. Delete the exposed API key
4. Create a new API key
5. Update your local `config.js` with new keys
6. Never commit `config.js` again!

---

## 🎯 Sharing the Repository

### For Code Review

**Safe to share:**
- ✅ GitHub repository URL (if reviewer has access)
- ✅ Individual files (bot.js, portfolio-manager.js)
- ✅ Documentation (TECHNICAL_WHITEPAPER.md)

**Never share:**
- ❌ config.js (contains API keys!)
- ❌ API keys or secrets
- ❌ Log files with trade data
- ❌ trades.csv

### Granting Access

**To give someone access to your private repository:**

1. Go to repository settings: `https://github.com/YOUR_USERNAME/binance-trading-bot/settings`
2. Click **"Collaborators"** in left sidebar
3. Click **"Add people"**
4. Enter their GitHub username
5. Choose permission level:
   - **Read:** Can view code only
   - **Write:** Can make changes
   - **Admin:** Full control

**For AI code review, you don't need to grant access - just share specific files!**

---

## 📊 Repository Statistics

**Current repository size:**
- Code: ~2,000 lines
- Documentation: ~40,000 words
- Commits: 9 commits
- Tags: 3 tags (v2.1.8, v2.2.0, v2.3.0)
- Branches: 1 (master)

---

## 🎓 Best Practices

### DO:
- ✅ Keep repository private
- ✅ Use `.gitignore` for sensitive files
- ✅ Create example config files
- ✅ Write clear commit messages
- ✅ Tag releases (v2.3.0, etc.)
- ✅ Document everything
- ✅ Review changes before committing

### DON'T:
- ❌ Commit API keys
- ❌ Commit log files
- ❌ Commit trade data
- ❌ Make repository public
- ❌ Share API keys in issues/PRs
- ❌ Commit node_modules
- ❌ Force push without backup

---

## 🔗 Useful GitHub Commands

### Check repository status
```bash
git status
```

### View commit history
```bash
git log --oneline --graph --all
```

### View remote URL
```bash
git remote -v
```

### Change remote URL
```bash
git remote set-url origin https://github.com/NEW_USERNAME/NEW_REPO.git
```

### Create a new branch
```bash
git checkout -b feature-name
```

### Switch branches
```bash
git checkout master
```

### View differences
```bash
git diff
```

### Undo uncommitted changes
```bash
git checkout -- filename.js
```

---

## 📞 Support

**If you encounter issues:**

1. **Authentication failed:**
   - Use Personal Access Token instead of password
   - Ensure token has `repo` scope

2. **Push rejected:**
   - Pull latest changes first: `git pull origin master`
   - Resolve conflicts if any
   - Push again: `git push origin master`

3. **Accidentally committed sensitive data:**
   - Follow "Emergency" section above
   - Rotate API keys immediately

4. **Repository too large:**
   - Check if node_modules was committed
   - Check if log files were committed
   - Use `git rm --cached` to remove

---

## ✅ Setup Complete!

**Once you've pushed to GitHub, you'll have:**

- ✅ Secure cloud backup of your code
- ✅ Version history and tags
- ✅ Ability to share code safely
- ✅ Collaboration capabilities
- ✅ Professional code repository

**Your repository URL will be:**
```
https://github.com/YOUR_USERNAME/binance-trading-bot
```

**Share this URL with reviewers, auditors, or AI code review tools!**

---

**Document Version:** 1.0  
**Last Updated:** December 3, 2025  
**Next Steps:** Push to GitHub and verify security checklist
