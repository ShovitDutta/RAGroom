import * as fs from "fs/promises";
import * as path from "path";
import * as dotenv from "dotenv";
import { extractZipStream } from "../src/lib/zip";
import { getParser } from "../src/lib/parsers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import * as cliProgress from "cli-progress";
import { Document } from "@langchain/core/documents";

// Load environment variables
dotenv.config();

// --- Configuration ---
const DATA_PATH = path.resolve(process.env.DATA_PATH || "./data");
const STORE_PATH = path.join(DATA_PATH, "store");
const INPUT_ZIP_PATH = path.join(DATA_PATH, "input.zip");
const FAISS_INDEX_PATH = path.join(STORE_PATH, "faiss.index");
const PROCESSED_FILES_LOG = path.join(DATA_PATH, "processed_files.json");
const TEMP_EXTRACT_PATH = path.join(DATA_PATH, "temp_extracted");

const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";

async function main() {
  console.log("--- Starting Resumable Ingestion Pipeline ---");

  // 1. Ensure all required directories exist
  await fs.mkdir(TEMP_EXTRACT_PATH, { recursive: true });
  await fs.mkdir(STORE_PATH, { recursive: true });
  console.log(`Store path ensured at: ${STORE_PATH}`);

  // 2. Extract the ZIP archive
  try {
    console.log(`Extracting ${INPUT_ZIP_PATH}...`);
    await extractZipStream(INPUT_ZIP_PATH, TEMP_EXTRACT_PATH);
    console.log("Extraction complete.");
  } catch (error) {
    console.error("Failed to extract ZIP file.", error);
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(
        `Please make sure a file named 'input.zip' exists in the '${DATA_PATH}' directory.`
      );
    }
    process.exit(1);
  }

  // 3. Load the list of already processed files
  const processedFiles = await loadProcessedFiles();
  console.log(`Loaded ${processedFiles.size} processed file records.`);

  // 4. Get all files to parse and filter out the ones already processed
  const allFiles = await getAllFiles(TEMP_EXTRACT_PATH);
  const filesToProcess = allFiles.filter((file) => !processedFiles.has(file));
  console.log(`Found ${filesToProcess.length} new files to process.`);

  if (filesToProcess.length === 0) {
    console.log("No new files to process. Exiting.");
    await cleanup();
    return;
  }

  // 5. Initialize models and vector store
  const embeddings = new OllamaEmbeddings({
    model: OLLAMA_EMBEDDING_MODEL,
    baseUrl: OLLAMA_HOST,
  });

  let vectorStore: FaissStore | null = null;
  try {
    // Try to load an existing index
    vectorStore = await FaissStore.load(FAISS_INDEX_PATH, embeddings);
    console.log("Loaded existing FAISS index.");
  } catch (e) {
    console.log("No existing FAISS index found. A new one will be created.");
  }

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // 6. Process new files and add to the index
  console.log("Processing new files...");
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );
  progressBar.start(filesToProcess.length, 0);

  for (const filePath of filesToProcess) {
    const parser = getParser(filePath);
    if (!parser) {
      console.log(`  - Skipping: No parser for ${filePath}`);
      progressBar.increment();
      continue;
    }

    try {
      const content = await parser.parse(filePath);
      if (content) {
        const documents = [
          new Document({
            pageContent: content,
            metadata: { source: path.relative(TEMP_EXTRACT_PATH, filePath) },
          }),
        ];
        const chunks = await textSplitter.splitDocuments(documents);

        if (chunks.length > 0) {
          if (!vectorStore) {
            // Create the index from the first set of chunks
            vectorStore = await FaissStore.fromDocuments(chunks, embeddings);
          } else {
            // Add to the existing index
            await vectorStore.addDocuments(chunks);
          }
        }
      }
      // Mark file as processed even if it had no content
      processedFiles.add(filePath);
    } catch (error) {
      console.error(`\nFailed to process file ${filePath}:`, error);
    }
    progressBar.increment();
  }

  progressBar.stop();

  // 7. Save the final index and the processed files log
  if (vectorStore) {
    await vectorStore.save(FAISS_INDEX_PATH);
    console.log(`FAISS index saved to: ${FAISS_INDEX_PATH}`);
  }
  await saveProcessedFiles(processedFiles);
  console.log("Processed files log updated.");

  // 8. Cleanup
  await cleanup();

  console.log("--- Ingestion Pipeline Finished ---");
}

async function loadProcessedFiles(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(PROCESSED_FILES_LOG, "utf-8");
    return new Set(JSON.parse(data));
  } catch (error) {
    // If file doesn't exist or is invalid, start with an empty set
    return new Set();
  }
}

async function saveProcessedFiles(files: Set<string>): Promise<void> {
  const data = JSON.stringify(Array.from(files));
  await fs.writeFile(PROCESSED_FILES_LOG, data, "utf-8");
}

async function getAllFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getAllFiles(res) : res;
    })
  );
  return Array.prototype.concat(...files);
}

async function cleanup() {
  console.log("Cleaning up temporary files...");
  await fs.rm(TEMP_EXTRACT_PATH, { recursive: true, force: true });
  console.log("Cleanup complete.");
}

main().catch((error) => {
  console.error(
    "An unexpected error occurred in the ingestion pipeline:",
    error
  );
  process.exit(1);
});
