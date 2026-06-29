import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dir = path.resolve(__dirname, "..")

process.chdir(dir)

const modelsUrl = process.env.OPENCODE_MODELS_URL || "https://models.dev"
const modelsPath = process.env.MODELS_DEV_API_JSON
const fallbackModelsPath = path.join(dir, "test", "tool", "fixtures", "models-api.json")

async function loadRemoteModelsData() {
  const response = await fetch(`${modelsUrl}/api.json`)
  if (!response.ok) throw new Error(`models.dev responded with ${response.status}`)
  return response.text()
}

export const modelsData = await (modelsPath
  ? Bun.file(modelsPath).text().then((data) => {
      console.log(`Loaded models.dev snapshot from ${modelsPath}`)
      return data
    })
  : loadRemoteModelsData()
      .then((data) => {
        console.log(`Loaded models.dev snapshot from ${modelsUrl}`)
        return data
      })
      .catch(async (error) => {
        console.warn(
          `Failed to load models.dev snapshot from ${modelsUrl}; using ${fallbackModelsPath}`,
          error,
        )
        return Bun.file(fallbackModelsPath).text()
      }))
