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

    const prompt = buildTurboPrompt(promptJson);
    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "9:16";

    const payload: Record<string, any> = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        n: 1
    };

    if (referenceImageUrl) {
        payload.image_urls = [referenceImageUrl];
    }

    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${IMAGE_API_TOKEN}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Minimax API error: ${data.message || JSON.stringify(data)}`);
    }

    const imageUrl = data?.data?.images?.[0]?.url || data?.images?.[0]?.url || data?.url;

    if (!imageUrl) {
        throw new Error("No image URL in Minimax response");
    }

    return { image_url: imageUrl };
}
