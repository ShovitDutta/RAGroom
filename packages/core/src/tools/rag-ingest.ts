/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { connect } from '@lancedb/lancedb';
import ollama from 'ollama';
import sbd from 'sbd';
import ora from 'ora';
import { Config } from '../config/config.js';
import {
  BaseTool,
  ToolResult,
} from './tools.js';
import { Type } from '@google/genai';
import { SchemaValidator } from '../utils/schemaValidator.js';

export interface RagIngestToolParams {
  directory: string;
}

const OLLAMA_MODEL = "bge-m3:latest";
const LANCEDB_TABLE_NAME = "vectors";
const LANCE_DB_PATH = 'D:/GeminiCLI/rag-room/store';
const CACHE_DIR = path.join(LANCE_DB_PATH, 'cache');
const PROCESSED_FILES_CACHE = path.join(CACHE_DIR, 'processed.json');

const hash = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
const fileId = (filePath: string) => hash(filePath);

async function walk(dir: string, files: string[] = []): Promise<string[]> {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walk(fullPath, files);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

async function getEmbedding(text: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { embedding } = await ollama.embeddings({ model: OLLAMA_MODEL, prompt: text });
            if (Array.isArray(embedding) && embedding.every(Number.isFinite)) return new Float32Array(embedding);
        } catch (e) {}
    }
    return null;
}

async function canLoadAsText(filePath: string): Promise<boolean> {
    try {
        const buf = await fsp.readFile(filePath);
        const slice = buf.subarray(0, 512);
        if (slice.includes(0x00)) return false;
        const str = buf.toString("utf8");
        const replacement = (str.match(/\uFFFD/g) || []).length;
        return replacement / str.length < 0.1;
    } catch {
        return false;
    }
}

function* semanticChunks(text: string, size = 1000) {
    const sentences = sbd.sentences(text, { newline_boundaries: true });
    let buf = "";
    for (const s of sentences) {
        if (buf.length + s.length < size) buf += (buf ? " " : "") + s;
        else {
            if (buf) yield buf.trim();
            buf = s;
        }
    }
    if (buf) yield buf.trim();
}

export class RagIngestTool extends BaseTool<RagIngestToolParams, ToolResult> {
  static Name: string = 'rag_ingest';

  constructor(private readonly config: Config) {
    super(
      RagIngestTool.Name,
      'RAG Ingest',
      'Recursively ingests files from a directory to be used for Retrieval-Augmented Generation.',
      {
        type: Type.OBJECT,
        properties: {
          directory: {
            type: Type.STRING,
            description: 'The directory to ingest files from.',
          },
        },
        required: ['directory'],
      },
      false,
      false,
    );
  }

  validateToolParams(params: RagIngestToolParams): string | null {
    const errors = SchemaValidator.validate(this.schema.parameters, params);
    if (errors) {
      return errors;
    }
    if (path.isAbsolute(params.directory)) {
        return 'Directory cannot be absolute. Must be relative to the project root directory.';
    }
    const directory = path.resolve(
        this.config.getTargetDir(),
        params.directory,
    );
    if (!fs.existsSync(directory)) {
        return 'Directory must exist.';
    }
    return null;
  }

  async execute(
    params: RagIngestToolParams,
    abortSignal: AbortSignal,
  ): Promise<ToolResult> {
    const validationError = this.validateToolParams(params);
    if (validationError) {
      return {
        llmContent: `Ingest rejected: ${params.directory}. Reason: ${validationError}`,
        returnDisplay: `Error: ${validationError}`,
      };
    }

    if (abortSignal.aborted) {
      return {
        llmContent: 'Ingest was cancelled by user before it could start.',
        returnDisplay: 'Ingest cancelled by user.',
      };
    }
    
    const spinner = ora('Starting ingestion...').start();
    try {
        await fsp.mkdir(CACHE_DIR, { recursive: true });

        const targetDir = path.resolve(this.config.getTargetDir(), params.directory);
        
        spinner.text = 'Walking directory...';
        const allFiles = await walk(targetDir);
        spinner.succeed('Directory walk complete.');

        let processedFiles: Record<string, { mtime: number, fileId: string }> = {};
        try {
            processedFiles = JSON.parse(await fsp.readFile(PROCESSED_FILES_CACHE, 'utf-8'));
        } catch (e) {}

        const filesToProcess = [];
        for (const file of allFiles) {
            const stats = await fsp.stat(file);
            if (!processedFiles[file] || processedFiles[file].mtime !== stats.mtimeMs) {
                filesToProcess.push({ path: file, stats });
            }
        }

        if (filesToProcess.length === 0) {
            spinner.succeed('All files are up to date.');
            return {
                llmContent: 'All files are up to date.',
                returnDisplay: 'All files are up to date.',
            };
        }

        spinner.start(`Processing ${filesToProcess.length} new/modified files...`);

        const db = await connect(LANCE_DB_PATH);
        const tableNames = await db.tableNames();
        const tableExists = tableNames.includes(LANCEDB_TABLE_NAME);
        
        let table;
        if (tableExists) {
            table = await db.openTable(LANCEDB_TABLE_NAME);
        } else {
            const sampleEmbedding = await getEmbedding("sample");
            if (!sampleEmbedding) {
                throw new Error("Could not generate sample embedding. Is Ollama running?");
            }
            table = await db.createTable(LANCEDB_TABLE_NAME, [{
                vector: Array.from(sampleEmbedding),
                text: "sample",
                source: "sample"
            }]);
        }

        for (const { path: file, stats } of filesToProcess) {
            if (abortSignal.aborted) {
                spinner.warn('Ingestion cancelled by user.');
                break;
            }
            
            spinner.start(`Ingesting ${file}`);
            try {
                // TODO: Add support for more file types like PDF, DOCX, etc.
                if (!(await canLoadAsText(file))) {
                    spinner.warn(`Skipping non-text file: ${file}`);
                    continue;
                }

                const content = await fsp.readFile(file, 'utf-8');
                const chunks = [...semanticChunks(content)];
                const fid = fileId(file);

                // Delete old entries for this file
                if (tableExists) {
                    await table.delete(`source = '${file.replace(/\\/g, '\\\\')}'`);
                }

                const data = [];
                for (const chunk of chunks) {
                    const embedding = await getEmbedding(chunk);
                    if (embedding) {
                        data.push({
                            vector: Array.from(embedding),
                            text: chunk,
                            source: file,
                        });
                    }
                }
                
                if(data.length > 0) {
                    await table.add(data);
                }

                processedFiles[file] = { mtime: stats.mtimeMs, fileId: fid };
                spinner.succeed(`Ingested ${file}`);
            } catch (e) {
                spinner.fail(`Failed to ingest ${file}: ${e}`);
            }
        }

        await fsp.writeFile(PROCESSED_FILES_CACHE, JSON.stringify(processedFiles, null, 2));

        const message = `Successfully ingested ${filesToProcess.length} files from ${params.directory}.`;
        return {
            llmContent: message,
            returnDisplay: message,
        };

    } catch (e: any) {
        spinner.fail('Ingestion failed.');
        return {
            llmContent: `Ingestion failed: ${e.message}`,
            returnDisplay: `Error: ${e.message}`,
        };
    }
  }
}
