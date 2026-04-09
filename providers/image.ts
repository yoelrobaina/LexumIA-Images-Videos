import { buildTurboPrompt } from "@lib/turboPrompt";
import type { PromptJson } from "@lib/promptTypes";

// ============================================================
// CONFIGURACIÓN DE LA API DE MINIMAX (CORREGIDA Y FUNCIONAL)
// ============================================================
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
    // 1. Validar que exista el token
    if (!IMAGE_API_TOKEN) {
        throw new Error("Falta la variable de entorno IMAGE_API_TOKEN");
    }

    // 2. Construir el prompt a partir del JSON estructurado
    const prompt = buildTurboPrompt(promptJson);
    console.log(`[Minimax] Generando imagen con prompt: ${prompt.slice(0, 100)}...`);

    // 3. Normalizar aspect ratio
    const validRatios = ["1:1", "4:3", "3:4", "16:9", "9:16"];
    const ratio = aspectRatio && validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

    // 4. Construir payload SEGÚN DOCUMENTACIÓN OFICIAL DE MINIMAX
    const payload: Record<string, any> = {
        model: "image-01",
        prompt: prompt,
        aspect_ratio: ratio,
        response_format: "url"   // 'url' o 'base64'
    };

    // 5. Si hay imagen de referencia, se usa subject_reference (NO image_urls)
    if (referenceImageUrl) {
        payload.subject_reference = [
            {
                type: "character",
                image_file: referenceImageUrl
            }
        ];
    }

    // 6. Llamar a la API de Minimax
    const response = await fetch(IMAGE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${IMAGE_API_TOKEN}`
        },
        body: JSON.stringify(payload)
    });

    // 7. Leer respuesta como texto para depuración
    const textResponse = await response.text();
    console.log(`[Minimax] Status: ${response.status}`);
    console.log(`[Minimax] Respuesta cruda (primeros 500 chars): ${textResponse.slice(0, 500)}`);

    // 8. Parsear JSON
    let data;
    try {
        data = JSON.parse(textResponse);
    } catch (e) {
        throw new Error(`JSON inválido desde Minimax. Status ${response.status}. Body: ${textResponse.slice(0, 200)}`);
    }

    // 9. Si el status no es ok, lanzar error
    if (!response.ok) {
        throw new Error(`Error de API Minimax (${response.status}): ${data.message || JSON.stringify(data)}`);
    }

    // 10. Extraer URL de la imagen según la estructura REAL de Minimax
    //    La respuesta típica es: { "image_urls": ["https://..."] }
    let imageUrl = data?.image_urls?.[0];
    if (!imageUrl && data?.data?.image_urls?.[0]) imageUrl = data.data.image_urls[0];
    if (!imageUrl && data?.images?.[0]?.url) imageUrl = data.images[0].url;
    if (!imageUrl && data?.data?.images?.[0]?.url) imageUrl = data.data.images[0].url;

    if (!imageUrl) {
        console.error("[Minimax] Respuesta completa sin URL:", JSON.stringify(data, null, 2));
        throw new Error("No se encontró URL de imagen en la respuesta de Minimax");
    }

    // 11. CORREGIR EL ERROR "SOLO SE ADMITEN URL HTTPS"
    //     Convertir HTTP a HTTPS forzosamente
    if (imageUrl.startsWith("http://")) {
        imageUrl = imageUrl.replace("http://", "https://");
        console.log(`[Minimax] URL convertida a HTTPS: ${imageUrl}`);
    }

    // 12. Devolver la URL en el formato que espera el frontend
    return { image_url: imageUrl };
}
