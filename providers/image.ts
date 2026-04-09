// providers/image.ts - VERSIÓN QUE CONVIERTE LA URL EN BASE64 INTERNAMENTE
import { buildTurboPrompt } from "@lib/turboPrompt";
import type { PromptJson } from "@lib/promptTypes";

const IMAGE_API_URL = process.env.IMAGE_API_URL || "https://api.minimax.io/v1/image_generation";
const IMAGE_API_TOKEN = process.env.IMAGE_API_TOKEN;

export async function callImageProvider({ promptJson, referenceImageUrl, aspectRatio }: any) {
    if (!IMAGE_API_TOKEN) throw new Error("Falta IMAGE_API_TOKEN");

    const prompt = buildTurboPrompt(promptJson);
    const ratio = (aspectRatio && ["1:1","4:3","3:4","16:9","9:16"].includes(aspectRatio)) ? aspectRatio : "1:1";

    const payload: any = { model: "image-01", prompt, aspect_ratio: ratio, response_format: "url" };
    if (referenceImageUrl) payload.subject_reference = [{ type: "character", image_file: referenceImageUrl }];

    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${IMAGE_API_TOKEN}` },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Minimax error: ${data.message}`);

    let imageUrl = data?.image_urls?.[0] || data?.data?.image_urls?.[0] || data?.images?.[0]?.url;
    if (!imageUrl) throw new Error("No URL en respuesta");

    // Descargar la imagen HTTP y convertirla a base64
    const httpsUrl = imageUrl.replace('http://', 'https://');
    const imgResponse = await fetch(httpsUrl);
    const buffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mime = imgResponse.headers.get('content-type') || 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;

    return { image_url: dataUrl };
}
