# RAGroom: Project TODO List

## 1. Overview

RAGroom is a retrieval-augmented generation (RAG) system designed to answer questions based on a user-provided corpus of documents. The architecture is split into a pure Node.js backend for data processing and conversational AI, and a future Next.js frontend.

This document outlines the backend implementation plan, focusing on creating a robust, phased development process that ensures quality, scalability, and maintainability.

## 2. Core Technologies (Backend)

- **Runtime:** Node.js
- **Type Safety:** TypeScript
- **Linting/Formatting:** ESLint & Prettier
- **Orchestration:** LangChain for JS (`@langchain/core`, `@langchain/community`, `@langchain/ollama`)
- **Model Provider:** Ollama (via `ollama` Node.js client)
- **Chat Model:** `gemma3:1b`
- **Embedding Model:** `nomic-embed-text:latest`
- **Vector Store:** FAISS (`faiss-node`)
- **File Handling:**
    - ZIP Archives: `yauzl` (for streaming)
    - Text Extraction: `pdf-parse` (PDFs), `mammoth` (DOCX), native `fs` (TXT/MD)
- **API Server:** Express.js
- **Deployment:** Docker

## 3. Backend Architecture

The backend consists of two primary workflows:

1.  **Ingestion Pipeline:** A process that accepts a ZIP archive, streams its contents, parses textual data using an extensible parser module, generates embeddings, and stores them in a FAISS vector store.
2.  **Conversational Interface:** An interactive service that loads the FAISS index, retrieves relevant document chunks, and uses a chat model—augmented with the retrieved context and managed conversation history—to generate a response.

The refined directory structure will be:

```
/
├── data/         # FAISS indices, interim files, chat history
├── scripts/      # Standalone scripts (e.g., ingestion)
├── src/
│   ├── api/      # Express routes and controllers
│   ├── lib/      # Reusable modules (zip, parsing, embeddings)
│   └── models/   # Ollama client wrappers and model logic
├── tests/        # Unit and integration tests
├── .env
├── .env.example  # Example environment variables
├── .gitignore
├── package.json
└── tsconfig.json
```

## 4. Implementation Plan

### Phase -1: Foundations & Quality

- [x] Initialize a Git repository and create a `.gitattributes` file.
- [x] Initialize a Node.js project (`package.json`) and configure TypeScript (`tsconfig.json`).
- [x] Install all core npm packages, including development dependencies.
- [x] Set up ESLint and Prettier for consistent code style.
- [x] Implement pre-commit hooks with Husky.
- [x] Define the directory structure.
- [x] Create a `.env.example` file.
- [x] Set up basic CI workflows with GitHub Actions.

### Phase 0: Project Setup & Dependencies

- [x] Install application dependencies.
- [x] Write a startup script to check for a running Ollama instance and models.

### Phase 1: Data Ingestion & Embedding Pipeline

- [x] Implement ZIP archive streaming and extraction.
- [x] Design and implement an extensible file-parsing module.
- [x] Define and implement a chunking strategy.
- [x] Implement a resumable, file-by-file embedding process.
- [x] Add a progress bar for visual feedback.
- [x] Generate and save the final `FaissStore` index.

### Phase 2: Conversational RAG Interface

- [x] Implement logic to load the existing FAISS index.
- [x] Build a history-aware retriever chain.
- [x] Implement persistent chat history.
- [x] Create an interactive command-line interface (CLI).
- [x] Add a non-interactive mode to the CLI for testing.

### Phase 3: API Server

- [x] Create an `/ingest` endpoint for ZIP file uploads.
- [x] Create a `/chat` endpoint with session-based history.
- [x] Implement a `/health` check endpoint.
- [x] Address TypeScript and `curl`-related bugs.
- [x] Harden the `spawn` call in the ingest route.

### Phase 4: Testing & Documentation

- [ ] Write unit tests for the file parsing module.
- [ ] Write unit tests for chunking and API validation.
- [ ] Add end-to-end tests for the core ZIP-to-chat workflow.
- [ ] Generate API documentation (e.g., OpenAPI/Swagger).

### Phase 5: Packaging & Deployment

- [ ] Write a `Dockerfile` to containerize the backend.
- [ ] Create a `docker-compose.yml` for development orchestration.
- [ ] Automate the build and deployment process via CI/CD pipelines.