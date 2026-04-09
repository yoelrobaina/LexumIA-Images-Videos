// video.ts - Deshabilitado temporalmente, pero con tipos correctos para que compile

export interface VideoTaskStatus {
    state: "waiting" | "generating" | "success" | "fail";
    videoUrl?: string;
    error?: string;
    progress?: number;
    input?: any;
    failMsg?: string;
}

export async function createVideoTask(params: {
    prompt: string;
    imageUrls?: string[];
    duration?: string;
    resolution?: string;
    multiShots?: boolean;
}): Promise<{ taskId: string }> {
    throw new Error("Video generation is currently disabled. Please use image generation.");
}

export async function queryVideoTaskStatus(taskId: string): Promise<VideoTaskStatus> {
    throw new Error("Video generation is disabled.");
}

export async function callVideoProvider(params: any): Promise<{ video_url: string }> {
    throw new Error("Video generation is disabled.");
}
