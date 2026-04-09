import { buildTurboPrompt } from "@lib/turboPrompt";
import type { PromptJson } from "@lib/promptTypes";

const IMAGE_API_URL = process.env.IMAGE_API_URL || "https://api.minimax.chat/v1/text_to_image";
const IMAGE_API_TOKEN = process.env.IMAGE_API_TOKEN;

export async function callImageProvider({
    promptJson,
    referenceImageUrl,
    aspectRatio
}: {
    promptJson: PromptJson;
    referenceImageUrl?: string | null;
    aspectRatio?: string;
}) {
    if (!IMAGE_API_TOKEN) {
        throw new Error("Missing IMAGE_API_TOKEN environment variable");
    }

    // Construir el prompt estilo Minimax (puedes usar el turboPrompt o el raw)
    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Generating image with prompt: ${prompt.slice(0, 100)}...`);

    // Mapear aspect ratio al formato que espera Minimax
    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "9:16";

    // Preparar el payload según la documentación de Minimax
    const payload = {
        model: "image-01", // o el modelo que tengas disponible
        prompt: prompt,
        aspect_ratio: ratio,
        n: 1  // número de imágenes a generar
    };

    // Si hay imagen de referencia (image-to-image), Minimax lo maneja con "image_urls"
    if (referenceImageUrl) {
        payload["image_urls"] = [referenceImageUrl];
    }

    // Llamar a la API de Minimax
    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${IMAGE_API_TOKEN}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Minimax API error: ${data.message || JSON.stringify(data)}`);
    }

    // La respuesta de Minimax suele tener data.images[0].url (verifica documentación)
    const imageUrl = data?.data?.images?.[0]?.url || data?.images?.[0]?.url || data?.url;

    if (!imageUrl) {
        throw new Error("No image URL in Minimax response");
    }

    return { image_url: imageUrl };
}
