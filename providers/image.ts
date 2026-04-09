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
        throw new Error("Falta la variable de entorno IMAGE_API_TOKEN");
    }

    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Generando imagen con prompt: ${prompt.slice(0, 100)}...`);

    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const payload: Record<string, any> = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        response_format: "base64"
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
    console.log(`[Minimax] Respuesta completa (primeros 1000 chars): ${textResponse.slice(0, 1000)}`);

    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        throw new Error(`JSON inválido: ${textResponse.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new Error(`Error API (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    // Extraer base64 según la estructura REAL de Minimax (con data anidado)
    let base64String = null;
    if (data?.data?.image_base64 && Array.isArray(data.data.image_base64) && data.data.image_base64.length > 0) {
        base64String = data.data.image_base64[0];
    } else if (data?.image_base64 && Array.isArray(data.image_base64) && data.image_base64.length > 0) {
        base64String = data.image_base64[0];
    } else if (data?.data?.images && Array.isArray(data.data.images) && data.data.images[0]?.image_base64) {
        base64String = data.data.images[0].image_base64;
    } else if (data?.images && Array.isArray(data.images) && data.images[0]?.image_base64) {
        base64String = data.images[0].image_base64;
    }

    if (!base64String) {
        console.error("[Minimax] No se encontró base64 en la respuesta. Respuesta completa:", JSON.stringify(data, null, 2));
        throw new Error("No se recibió base64 de la imagen. Revisa los logs para ver la estructura real.");
    }

    const dataUrl = `data:image/jpeg;base64,${base64String}`;
    return { image_url: dataUrl };
}
