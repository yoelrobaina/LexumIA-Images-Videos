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
        response_format: "base64"  // <--- CAMBIO CLAVE: base64 en lugar de url
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

    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        throw new Error(`JSON inválido: ${textResponse.slice(0, 200)}`);
    }

    if (!response.ok) {
        throw new Error(`Error API (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    // Extraer base64 (viene en data.image_base64 o data.images[0].image_base64)
    let base64String = data?.image_base64?.[0] || data?.data?.image_base64?.[0] || data?.images?.[0]?.image_base64;
    if (!base64String && data?.data?.images?.[0]?.image_base64) {
        base64String = data.data.images[0].image_base64;
    }

    if (!base64String) {
        console.error("Respuesta completa:", JSON.stringify(data, null, 2));
        throw new Error("No se recibió base64 de la imagen");
    }

    // Construir data URL (el frontend la acepta sin problemas)
    const dataUrl = `data:image/jpeg;base64,${base64String}`;
    return { image_url: dataUrl };
}
