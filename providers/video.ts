// video.ts - Temporalmente deshabilitado para permitir el despliegue
// TODO: Adaptar a Minimax Video API más adelante

export async function callVideoProvider(params: any) {
    throw new Error("Video generation is temporarily disabled. Please use image generation for now.");
}

export async function createVideoTask(params: any) {
    throw new Error("Video generation is disabled.");
}

export async function queryVideoTaskStatus(taskId: string) {
    throw new Error("Video generation is disabled.");
}
