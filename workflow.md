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

### 5. Post-Merge Integration Steps

After successfully merging changes from `upstream`, follow these steps to ensure the repository is stable and up-to-date.

1.  **Resolve Merge Conflicts (If Any)**:
    - If `git merge` reports conflicts, manually edit the conflicted files to resolve the differences.
    - After resolving, stage the changes using `git add .`.
    - Complete the merge by running `git commit`. Git will often provide a pre-populated commit message.

2.  **Install Dependencies**:
    - The `official` repository may have added or updated dependencies. Run `npm install` to sync your `node_modules` directory.
    ```bash
    npm install
    ```

3.  **Run Validation Checks**:
    - It is critical to run the full preflight check to ensure that the merged codebase is free of errors and passes all quality gates.
    ```bash
    npm run preflight
    ```

Once these steps are complete, your `main` branch is fully updated and validated, and you can proceed with creating feature branches.
