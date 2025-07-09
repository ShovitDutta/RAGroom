import * as path from "path"
import * as readline from "readline"
import * as fs from "fs/promises"
import * as dotenv from "dotenv"
import { FaissStore } from "@langchain/community/vectorstores/faiss"
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama"
import { Ollama } from "@langchain/community/llms/ollama"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { Runnable, RunnableSequence } from "@langchain/core/runnables"
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages"
import {
  MessagesPlaceholder,
  ChatPromptTemplate,
} from "@langchain/core/prompts"
import { createStuffDocumentsChain } from "langchain/chains/combine_documents"
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever"
import { createRetrievalChain } from "langchain/chains/retrieval"

// Load environment variables
dotenv.config()

// --- Configuration ---
const DATA_PATH = path.resolve(process.env.DATA_PATH || "./data")
const STORE_PATH = path.join(DATA_PATH, "store")
const FAISS_INDEX_PATH = path.join(STORE_PATH, "faiss.index")
const CHAT_HISTORY_PATH = path.join(DATA_PATH, "chat_history.json")

const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "gemma3:1b"
const OLLAMA_EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest"
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434"

// --- Main Application Logic ---

async function main() {
  console.log("--- Starting RAGroom Chat Interface ---")

  // 1. Load the FAISS index
  console.log("Loading vector store...")
  let vectorStore
  try {
    const embeddings = new OllamaEmbeddings({
      model: OLLAMA_EMBEDDING_MODEL,
      baseUrl: OLLAMA_HOST,
    })
    vectorStore = await FaissStore.load(FAISS_INDEX_PATH, embeddings)
    console.log("Vector store loaded successfully.")
  } catch (error) {
    console.error("Failed to load FAISS index.", error)
    console.error(
      `Please make sure you have run the ingestion script ('npm run ingest') and a 'faiss.index' file exists in the '${STORE_PATH}' directory.`
    )
    process.exit(1)
  }

  const retriever = vectorStore.asRetriever()

  // 2. Initialize the Chat Model
  const llm = new Ollama({
    model: OLLAMA_CHAT_MODEL,
    baseUrl: OLLAMA_HOST,
  })

  // 3. Set up the RAG chain with conversational history
  const historyAwarePrompt = ChatPromptTemplate.fromMessages([
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    [
      "user",
      "Given the above conversation, generate a search query to look up in order to get information relevant to the conversation",
    ],
  ])

  const historyAwareRetrieverChain = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt: historyAwarePrompt,
  })

  const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "Answer the user's questions based on the below context:\n\n{context}",
    ],
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
  ])

  const historyAwareCombineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt: historyAwareRetrievalPrompt,
  })

  const conversationalRetrievalChain = await createRetrievalChain({
    retriever: historyAwareRetrieverChain,
    combineDocsChain: historyAwareCombineDocsChain,
  })

  // 4. Load chat history and start the CLI
  const question = process.argv.slice(2).join(" ").replace(/^"|"$/g, "");
  const chatHistory = !question ? await loadChatHistory() : [];
  if(question) console.log("Chat history loaded.");

  // 5. Check for command-line argument for a single question
  if (question) {
    await processSingleQuestion(
      conversationalRetrievalChain,
      chatHistory,
      question
    );
  } else {
    console.log(
      "\n--- RAGroom is ready. Ask a question or type 'exit' to quit. ---\n"
    );
    startCli(conversationalRetrievalChain, chatHistory);
  }
}

// --- Helper Functions ---

async function loadChatHistory(): Promise<BaseMessage[]> {
  try {
    const historyJson = await fs.readFile(CHAT_HISTORY_PATH, "utf-8")
    const history = JSON.parse(historyJson).map(
      (msg: { type: string; content: string }) => {
        return msg.type === "ai"
          ? new AIMessage(msg.content)
          : new HumanMessage(msg.content)
      }
    )
    return history
  } catch (error) {
    // If the file doesn't exist or is invalid, start with an empty history
    return []
  }
}

async function saveChatHistory(history: BaseMessage[]): Promise<void> {
  const historyJson = JSON.stringify(
    history.map((msg) => ({
      type: msg instanceof AIMessage ? "ai" : "human",
      content: msg.content,
    })),
    null,
    2
  )
  await fs.writeFile(CHAT_HISTORY_PATH, historyJson, "utf-8")
}

async function processSingleQuestion(
  chain: Runnable<any, any>,
  history: BaseMessage[],
  input: string
) {
  console.log(`You: ${input}`)
  console.log("AI: Thinking...")
  try {
    const response = await chain.invoke({
      chat_history: history,
      input: input,
    })

    console.log(`AI: ${response.answer}`)

    // Update history
    history.push(new HumanMessage(input))
    history.push(new AIMessage(response.answer))

    await saveChatHistory(history)
    console.log("--- Chat history saved. ---")
  } catch (error) {
    console.error("An error occurred while processing your question:", error)
  }
}

function startCli(chain: Runnable<any, any>, history: BaseMessage[]) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        await saveChatHistory(history)
        console.log("--- Chat history saved. Goodbye! ---")
        rl.close()
        return
      }

      console.log("AI: Thinking...")
      try {
        const response = await chain.invoke({
          chat_history: history,
          input: input,
        })

        console.log(`AI: ${response.answer}`)

        // Update history
        history.push(new HumanMessage(input))
        history.push(new AIMessage(response.answer))
      } catch (error) {
        console.error(
          "An error occurred while processing your question:",
          error
        )
      }

      askQuestion()
    })
  }

  askQuestion()
}

main().catch((error) => {
  console.error("An unexpected error occurred in the chat interface:", error)
  process.exit(1)
})