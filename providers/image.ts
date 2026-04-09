import { buildTurboPrompt } from "@lib/turboPrompt";
import type { PromptJson } from "@lib/promptTypes";

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

    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Generating image with prompt: ${prompt.slice(0, 100)}...`);

    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const payload: Record<string, any> = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        response_format: "url"
    };

    if (referenceImageUrl) {
        payload.subject_reference = [
            {
                type: "character",
                image_file: referenceImageUrl
            }
        ];
    }

    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${IMAGE_API_TOKEN}`
        },
        body: JSON.stringify(payload)
    });

    const textResponse = await response.text();
    console.log(`[Minimax] Status: ${response.status}`);
    console.log(`[Minimax] Raw response (first 500 chars): ${textResponse.slice(0, 500)}`);

    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        throw new Error(`Invalid JSON from Minimax. Status ${response.status}. Body: ${textResponse.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new Error(`Minimax API error (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    // 🔧 CORRECCIÓN: buscar image_urls en la raíz
    let imageUrl = data?.image_urls?.[0];
    
    // Fallbacks por si la respuesta tiene otra estructura
    if (!imageUrl && data?.data?.image_urls?.[0]) {
        imageUrl = data.data.image_urls[0];
    }
    if (!imageUrl && data?.images?.[0]?.url) {
        imageUrl = data.images[0].url;
    }
    if (!imageUrl && data?.data?.images?.[0]?.url) {
        imageUrl = data.data.images[0].url;
    }

    if (!imageUrl) {
        console.error("[Minimax] Full response:", JSON.stringify(data, null, 2));
        throw new Error("No image URL in Minimax response");
    }

    return { image_url: imageUrl };
}
