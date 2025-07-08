# RAGroom: Project Architecture & Implementation Plan

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

## 4. Implementation Phases

### Phase -1: Foundations & Quality

- **Goal:** Establish a high-quality, maintainable, and type-safe project foundation.
- **Milestones:**
  1. Initialize a Git repository and create a `.gitattributes` file to enforce consistent line endings.
  2. Initialize a Node.js project (`package.json`) and configure TypeScript (`tsconfig.json`).
  3. Install all core npm packages, including development dependencies for linting and testing.
  4. Set up ESLint and Prettier for consistent code style, using the modern `eslint.config.js` flat configuration.
  5. Implement pre-commit hooks (e.g., with Husky) to enforce linting and formatting.
  6. Define the directory structure as outlined above.
  7. Create a `.env.example` file to document required environment variables.
  8. Set up basic CI workflows (e.g., GitHub Actions) to run linting, type checks, and tests on pull requests.
- **Success Criteria:** A clean, organized project skeleton is in place with automated quality checks.

### Phase 0: Project Setup & Dependencies

- **Goal:** Install and configure all core application dependencies.
- **Milestones:**
  1. Install application dependencies: `@langchain/core`, `@langchain/community`, `@langchain/ollama`, `ollama`, `faiss-node`, `yauzl`, `pdf-parse`, `mammoth`, `express`.
  2. Write a startup script to check for a running Ollama instance and the required models.
- **Success Criteria:** All dependencies can be imported without error, and the application can verify its connection to Ollama.

### Phase 1: Data Ingestion & Embedding Pipeline

- **Goal:** Develop a script that can process a ZIP file and create a searchable FAISS index.
- **Milestones:**
  1. Implement ZIP archive streaming and extraction using `yauzl` to handle large files efficiently.
  2. Design and implement an extensible file-parsing module with a common interface (e.g., `src/lib/parsers/`).
     - Implement initial parsers for `.txt`, `.md`, `.pdf`, and `.docx`.
  3. Define a clear chunking strategy (size, overlap) for splitting long documents.
  4. Implement the document splitting and embedding process, storing relevant metadata (source file, chunk ID) with each vector.
  5. Generate and save the FAISS index to the `data` directory.
- **Success Criteria:** A standalone script that successfully transforms `input.zip` into `data/faiss.index` with proper metadata.

### Phase 2: Conversational RAG Interface

- **Goal:** Create a script that allows a user to ask questions against the indexed documents.
- **Milestones:**
  1. Implement logic to load the existing FAISS index from disk.
  2. Build a LangChain retrieval chain, defining a maximum context window to avoid exceeding token limits.
  3. Implement a robust chat history management system:
     - Use a memory-efficient structure like a Ring Buffer or LRU cache.
     - Version the `chat_history.json` schema for future migrations.
  4. Implement caching for recent retrieval results to improve performance.
  5. Create a simple command-line interface (CLI) to test the end-to-end conversational flow.
- **Success Criteria:** A user can run a script, ask a question, and receive a fast, context-aware answer from the model.

### Phase 3: API Server

- **Goal:** Wrap the core logic in a secure and observable Express.js server.
- **Milestones:**
  1. Create an `/ingest` endpoint that accepts a ZIP file upload, validates it (size, file types), and sanitizes file names.
  2. Create a `/chat` endpoint that accepts a user query and session ID, returning a streamed response.
  3. Integrate session-based conversation history management.
  4. Implement centralized error handling middleware for consistent API responses.
  5. Secure endpoints with rate limiting (`express-rate-limit`).
  6. Integrate request logging (e.g., Morgan) and a `/health` check endpoint.
- **Success Criteria:** The backend is fully operable and secure via HTTP requests.

### Phase 4: Testing & Documentation

- **Goal:** Ensure the application is reliable and well-documented.
- **Milestones:**
  1. Write unit tests for all critical modules (parsers, chunking, API validation).
  2. Add end-to-end tests for the core ZIP-to-chat workflow using a sample archive.
  3. Generate API documentation (e.g., OpenAPI/Swagger) for all endpoints.
- **Success Criteria:** The application has a comprehensive test suite and clear API documentation.

### Phase 5: Packaging & Deployment

- **Goal:** Prepare the application for easy deployment and execution.
- **Milestones:**
  1. Write a `Dockerfile` to containerize the backend application.
  2. Create a `docker-compose.yml` file to orchestrate the application and a local Ollama instance for development.
  3. Automate the build and deployment process via CI/CD pipelines.
- **Success Criteria:** The application can be built and deployed as a containerized service.