import { buildTurboPrompt } from "@lib/turboPrompt";
import type { PromptJson } from "@lib/promptTypes";

// URL correcta según documentación de Minimax
const IMAGE_API_URL = process.env.IMAGE_API_URL || "https://api.minimax.io/v1/image_generation";
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

    // Construir el prompt (igual que antes)
    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Generating image with prompt: ${prompt.slice(0, 100)}...`);

    // Mapear aspect ratio (Minimax soporta 1:1, 16:9, etc.)
    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    // Construir payload según documentación de Minimax
    const payload: Record<string, any> = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        response_format: "url"  // Puede ser "url" o "base64"
    };

    // Si hay imagen de referencia, usar subject_reference (no image_urls)
    if (referenceImageUrl) {
        payload.subject_reference = [
            {
                type: "character",
                image_file: referenceImageUrl
            }
        ];
    }

    // Llamar a la API de Minimax
    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${IMAGE_API_TOKEN}`
        },
        body: JSON.stringify(payload)
    });

    // Obtener respuesta como texto para debug
    const textResponse = await response.text();
    console.log(`[Minimax] Status: ${response.status}`);
    console.log(`[Minimax] Raw response (first 300 chars): ${textResponse.slice(0, 300)}`);

    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        throw new Error(`Invalid JSON from Minimax. Status ${response.status}. Body: ${textResponse.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new Error(`Minimax API error (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    // Extraer URL de la imagen según la respuesta de Minimax
    // La documentación muestra que puede venir en data.images[0].url o data.image_urls[0]
    let imageUrl = data?.data?.images?.[0]?.url || data?.images?.[0]?.url || data?.image_urls?.[0];

    if (!imageUrl) {
        throw new Error("No image URL in Minimax response");
    }

    return { image_url: imageUrl };
}
