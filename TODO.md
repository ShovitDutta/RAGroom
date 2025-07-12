# TODO - Integrating Official Changes

This document outlines the tasks required to integrate the latest changes from the `official` repository into the `forked` repository.

## Merge Conflicts

- [x] `packages/cli/src/nonInteractiveCli.ts`: Resolved the merge conflict by combining the RAG integration with the `turnCount` logic from the official repository.

## New Features from Fork

The following features were developed in the `forked` repository and need to be verified against the newly merged codebase:

- **RAG Ingestion (`--ingest` flag):**
  - [ ] Verify that the `--ingest` flag is still parsed correctly in `packages/cli/src/config/config.ts`.
  - [ ] Confirm that the `RagIngestTool` is correctly called in `packages/cli/src/gemini.tsx`.
  - [ ] Test the `RagIngestTool` (`packages/core/src/tools/rag-ingest.ts`) to ensure it still functions as expected after the merge.

- **RAG Context Retrieval:**
  - [ ] Verify that the `retrieveContextForQuery` function in `packages/core/src/rag/retrieval.ts` is still correctly called from `packages/cli/src/nonInteractiveCli.ts`.
  - [ ] Test the non-interactive mode to ensure that RAG context is being correctly retrieved and added to the prompt.

## New Dependencies

- [ ] Run `npm install` to ensure all new dependencies from both the `official` and `forked` repositories are correctly installed. The new dependencies from the `forked` repository are:
  - `@lancedb/lancedb`
  - `ollama`
  - `ora`
  - `pdf-poppler`
  - `sbd`
  - `sharp`

## Build and Test

- [ ] Run the full preflight check (`npm run preflight`) to ensure that all tests, linting, and type checks pass after the merge.
- [ ] Manually test the RAG functionality using the `tempArg.js` script.
