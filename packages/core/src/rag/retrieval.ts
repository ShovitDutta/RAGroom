/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { connect } from '@lancedb/lancedb';
import ollama from 'ollama';

const OLLAMA_MODEL = "bge-m3:latest";
const LANCEDB_TABLE_NAME = "vectors";
const LANCE_DB_PATH = 'D:/GeminiCLI/rag-room/store';

async function getEmbedding(text: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const { embedding } = await ollama.embeddings({ model: OLLAMA_MODEL, prompt: text });
            if (Array.isArray(embedding) && embedding.every(Number.isFinite)) return new Float32Array(embedding);
        } catch (e) {}
    }
    return null;
}

export async function retrieveContextForQuery(query: string): Promise<string | null> {
    if (!fs.existsSync(LANCE_DB_PATH)) {
        return null;
    }

    try {
        const db = await connect(LANCE_DB_PATH);
        const tableNames = await db.tableNames();
        if (!tableNames.includes(LANCEDB_TABLE_NAME)) {
            return null;
        }

        const table = await db.openTable(LANCEDB_TABLE_NAME);
        const queryEmbedding = await getEmbedding(query);
        if (!queryEmbedding) {
            return null;
        }

        const results = await table
            .search(Array.from(queryEmbedding))
            .limit(5)
            .toArray();

        if (results.length === 0) {
            return null;
        }

        const context = results.map(r => r.text).join('\n---\n');
        return `Context:\n${context}\n\nQuestion: ${query}`;

    } catch (e) {
        console.error('Error querying RAG context:', e);
        return null;
    }
}
