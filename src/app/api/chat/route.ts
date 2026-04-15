import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Initialize Google provider manually or let it use GOOGLE_GENERATIVE_AI_API_KEY env var
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: google('gemini-2.5-flash-lite'), // Menggunakan versi 2.5 Flash Lite sesuai permintaan
    system: "Kamu adalah asisten AI yang elegan, ramah, dan membantu. Jawablah dalam bahasa Indonesia dengan nada yang tenang dan profesional.\\nSaat membuat daftar (list), gunakan format bullet atau numbering yang standar. Pastikan tabel dirender dengan format Markdown yang valid.",
    messages,
  });
  return result.toTextStreamResponse();
}
