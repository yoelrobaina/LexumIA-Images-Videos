// video.ts - Deshabilitado temporalmente para permitir despliegue
// La funcionalidad de video se habilitará más adelante

export async function callVideoProvider(params: any) {
    throw new Error("Video generation is currently disabled. Please use image generation.");
}

export async function createVideoTask(params: any) {
    throw new Error("Video generation is disabled.");
}

export async function queryVideoTaskStatus(taskId: string) {
    throw new Error("Video generation is disabled.");
}
