import { Ollama } from "ollama"

// Load environment variables
import * as dotenv from "dotenv"
dotenv.config()

const requiredChatModel = process.env.OLLAMA_CHAT_MODEL || "gemma3:1b"
const requiredEmbeddingModel =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text:latest"

async function checkOllama() {
  console.log("Connecting to Ollama...")
  const ollama = new Ollama({ host: "http://localhost:11434" }) // Default host

  try {
    const response = await ollama.list()
    console.log("Successfully connected to Ollama.")

    const availableModels = response.models.map((model) => model.name)
    console.log("Available models:", availableModels)

    let hasChatModel = false
    let hasEmbeddingModel = false

    for (const modelName of availableModels) {
      if (modelName.includes(requiredChatModel)) {
        hasChatModel = true
      }
      if (modelName.includes(requiredEmbeddingModel)) {
        hasEmbeddingModel = true
      }
    }

    if (hasChatModel) {
      console.log(`✅ Chat model found: ${requiredChatModel}`)
    } else {
      console.error(`❌ Chat model not found: ${requiredChatModel}`)
      console.log(
        `Please run 'ollama pull ${requiredChatModel}' to download it.`
      )
    }

    if (hasEmbeddingModel) {
      console.log(`✅ Embedding model found: ${requiredEmbeddingModel}`)
    } else {
      console.error(`❌ Embedding model not found: ${requiredEmbeddingModel}`)
      console.log(
        `Please run 'ollama pull ${requiredEmbeddingModel}' to download it.`
      )
    }

    if (!hasChatModel || !hasEmbeddingModel) {
      process.exit(1)
    }
  } catch (error) {
    console.error("Failed to connect to Ollama.", error)
    console.error(
      "Please ensure Ollama is running and accessible at http://localhost:11434."
    )
    process.exit(1)
  }
}

checkOllama()
