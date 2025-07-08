import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { extractZipStream } from '../src/lib/zip';
import { getParser } from '../src/lib/parsers';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { FaissStore } from '@langchain/community/vectorstores/faiss';

// Load environment variables
dotenv.config();

// --- Configuration ---
const DATA_PATH = path.resolve(process.env.DATA_PATH || './data');
const INPUT_ZIP_PATH = path.join(DATA_PATH, 'input.zip');
const FAISS_INDEX_PATH = path.join(DATA_PATH, 'faiss.index');
const TEMP_EXTRACT_PATH = path.join(DATA_PATH, 'temp_extracted');
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text:latest';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';

async function main() {
  console.log('--- Starting Ingestion Pipeline ---');

  // 1. Ensure data and temp directories exist
  await fs.mkdir(TEMP_EXTRACT_PATH, { recursive: true });
  console.log(`Temp directory created at: ${TEMP_EXTRACT_PATH}`);

  // 2. Extract the ZIP archive
  console.log(`Extracting ${INPUT_ZIP_PATH}...`);
  try {
    await extractZipStream(INPUT_ZIP_PATH, TEMP_EXTRACT_PATH);
    console.log('Extraction complete.');
  } catch (error) {
    console.error('Failed to extract ZIP file.', error);
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Please make sure a file named 'input.zip' exists in the '${DATA_PATH}' directory.`);
    }
    process.exit(1);
  }

  // 3. Walk through extracted files and parse content
  const documents = [];
  console.log('Parsing extracted files...');
  const filesToParse = await getAllFiles(TEMP_EXTRACT_PATH);

  for (const filePath of filesToParse) {
    const parser = getParser(filePath);
    if (parser) {
      console.log(`  - Parsing: ${filePath}`);
      const content = await parser.parse(filePath);
      if (content) {
        documents.push({
          pageContent: content,
          metadata: { source: path.relative(TEMP_EXTRACT_PATH, filePath) },
        });
      } else {
        console.log(`  - Warning: No content extracted from ${filePath}`);
      }
    } else {
      console.log(`  - Skipping: No parser for ${filePath}`);
    }
  }
  console.log(`Parsing complete. Found ${documents.length} documents.`);

  if (documents.length === 0) {
    console.log('No documents found to process. Exiting.');
    return;
  }

  // 4. Split documents into chunks
  console.log('Splitting documents into chunks...');
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const chunks = await textSplitter.splitDocuments(documents);
  console.log(`Created ${chunks.length} document chunks.`);

  // 5. Generate embeddings and create FAISS index
  console.log('Initializing embedding model and FAISS store...');
  const embeddings = new OllamaEmbeddings({
    model: OLLAMA_EMBEDDING_MODEL,
    baseUrl: OLLAMA_HOST,
  });

  console.log('Generating embeddings and building FAISS index...');
  const vectorStore = await FaissStore.fromDocuments(chunks, embeddings);
  console.log('FAISS index built.');

  // 6. Save the FAISS index
  await vectorStore.save(FAISS_INDEX_PATH);
  console.log(`FAISS index saved to: ${FAISS_INDEX_PATH}`);

  // 7. Cleanup temporary directory
  console.log('Cleaning up temporary files...');
  await fs.rm(TEMP_EXTRACT_PATH, { recursive: true, force: true });
  console.log('Cleanup complete.');

  console.log('--- Ingestion Pipeline Finished ---');
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

main().catch((error) => {
  console.error('An unexpected error occurred in the ingestion pipeline:', error);
  process.exit(1);
});
