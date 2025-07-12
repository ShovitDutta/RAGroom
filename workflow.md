# Development Workflow for Forked Repository

This document outlines the process for keeping the local `forked` repository synchronized with the `official` repository while allowing for independent development.

## One-Time Setup

The `official` repository has been added as a Git remote named `upstream`.

```bash
git remote add upstream ../ofiicial
```

## Syncing and Development Workflow

Follow these steps to pull the latest changes from the `official` repository and continue your own development work.

### 1. Update Your Local `main` Branch

Before starting any new work, ensure your `main` branch is up-to-date with the `official` repository.

```bash
# Switch to your main branch
git checkout main

# Fetch the latest changes from the official repository
git fetch upstream

# Merge the changes from upstream/main into your local main
git merge upstream/main
```

Your `main` branch is now a clean, updated copy of the official one.

### 2. Create a Feature Branch for Your Work

Never work directly on the `main` branch. Create a new branch for each feature or bugfix.

```bash
# Create a new branch from main and switch to it
git checkout -b your-feature-name
```

### 3. Save Your Work to Your Remote Fork

When you want to save your work or back it up, push your feature branch to your remote fork on GitHub (named `origin`).

```bash
# Push your feature branch to origin
git push origin your-feature-name
```
This command sends your commits to your personal GitHub repository. It does **not** affect the `official` repository.

### 4. (Optional) Updating Your Feature Branch

If the `official` repository is updated while you are still working on your feature, you can pull those changes into your feature branch.

```bash
# First, update your main branch (see Step 1)
git checkout main
git fetch upstream
git merge upstream/main

# Then, go back to your feature branch and rebase
git checkout your-feature-name
git rebase main
```