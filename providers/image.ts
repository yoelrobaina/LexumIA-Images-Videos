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
    if (!IMAGE_API_TOKEN) throw new Error("Falta IMAGE_API_TOKEN");

    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Prompt generado (primeros 200 chars): ${prompt.slice(0, 200)}`);

    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    const payload: any = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        response_format: "url"
    };
    if (referenceImageUrl) {
        payload.subject_reference = [{ type: "character", image_file: referenceImageUrl }];
    }

    console.log(`[Minimax] Payload enviado: ${JSON.stringify(payload).slice(0, 300)}`);

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
    console.log(`[Minimax] Respuesta completa: ${textResponse.slice(0, 800)}`);

    if (!response.ok) {
        // Si es 400, el mensaje de error suele estar en textResponse
        throw new Error(`Minimax error ${response.status}: ${textResponse.slice(0, 500)}`);
    }

    let data;
    try { data = JSON.parse(textResponse); } catch(e) {
        throw new Error(`JSON inválido: ${textResponse.slice(0, 200)}`);
    }

    let imageUrl = data?.image_urls?.[0];
    if (!imageUrl && data?.data?.image_urls?.[0]) imageUrl = data.data.image_urls[0];
    if (!imageUrl && data?.images?.[0]?.url) imageUrl = data.images[0].url;
    if (!imageUrl && data?.data?.images?.[0]?.url) imageUrl = data.data.images[0].url;

    if (!imageUrl) {
        throw new Error("No URL en respuesta de Minimax");
    }

    // Convertir a base64 para evitar problemas de frontend
    const httpsUrl = imageUrl.replace('http://', 'https://');
    const imgRes = await fetch(httpsUrl);
    if (!imgRes.ok) throw new Error(`Error descargando imagen: ${imgRes.status}`);
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    return { image_url: dataUrl };
}
