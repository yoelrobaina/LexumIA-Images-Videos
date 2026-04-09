// video.ts - Adaptado para Minimax Video API
const VIDEO_API_URL = process.env.VIDEO_API_URL || "https://api.minimax.chat/v1/video_generation";
const VIDEO_API_TOKEN = process.env.VIDEO_API_TOKEN;

// Minimax video es asíncrono: primero crear tarea, luego consultar estado
interface CreateTaskResponse {
  task_id: string;
  status: string;
}

interface QueryTaskResponse {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  video_url?: string;
  error?: string;
}

export async function callVideoProvider({
  promptJson,
  referenceImageUrl,
  aspectRatio,
  imageSize
}: any) {
  if (!VIDEO_API_TOKEN) {
    throw new Error("Missing VIDEO_API_TOKEN environment variable");
  }

  // Construir el prompt (puede venir de promptJson o ser string)
  const prompt = typeof promptJson === 'string' 
    ? promptJson 
    : (promptJson?.positive || promptJson?.prompt || "");

  // Determinar si es texto->video o imagen->video
  const isImageToVideo = !!referenceImageUrl;
  
  const payload: any = {
    model: isImageToVideo ? "video-01-image-to-video" : "video-01-text-to-video",
    prompt: prompt,
    duration: 5, // segundos, ajustable
    resolution: "1080p"
  };

  if (isImageToVideo && referenceImageUrl) {
    payload.image_url = referenceImageUrl;
  }

  // 1. Crear tarea
  const createResponse = await fetch(VIDEO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VIDEO_API_TOKEN}`
    },
    body: JSON.stringify(payload)
  });

  const createData = await createResponse.json();
  if (!createResponse.ok || !createData.task_id) {
    throw new Error(`Minimax video creation failed: ${createData.message || JSON.stringify(createData)}`);
  }

  const taskId = createData.task_id;
  console.log(`[Video] Task created: ${taskId}`);

  // 2. Polleo por resultado (Minimax tiene endpoint de consulta)
  const videoUrl = await pollForVideoResult(taskId);
  return { video_url: videoUrl };
}

async function pollForVideoResult(taskId: string): Promise<string> {
  const queryUrl = `${VIDEO_API_URL}/${taskId}`; // Ajusta según documentación real de Minimax
  const maxAttempts = 60; // 5 minutos (5s * 60)
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(queryUrl, {
      headers: { "Authorization": `Bearer ${VIDEO_API_TOKEN}` }
    });
    const data = await response.json();
    
    if (data.status === "completed" && data.video_url) {
      return data.video_url;
    } else if (data.status === "failed") {
      throw new Error(data.error || "Video generation failed");
    }
    // "pending" o "processing" -> esperar
    await delay(5000);
  }
  throw new Error("Video generation timed out");
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
