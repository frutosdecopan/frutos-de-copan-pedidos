import { GoogleGenAI } from "@google/genai";
import { Order } from "../types";

// Safe initialization that doesn't crash if API key is missing (handled gracefully in UI)
const getAiClient = () => {
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateAiReport = async (orders: Order[]) => {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("API Key no configurada");
  }

  // Filter for relevant data to send to LLM (minimize token usage)
  const orderSummary = orders.map(o => ({
    id: o.id,
    city: o.cityName,
    status: o.status,
    items: o.items.map(i => `${i.quantity} x ${i.presentationName} ${i.productName}`).join(', ')
  }));

  const prompt = `
    Actúa como un experto en logística y producción de alimentos.
    Analiza los siguientes datos de pedidos recientes de 'Concentrados de Fruta'.
    
    Datos: ${JSON.stringify(orderSummary)}

    Genera un reporte breve y estratégico en formato Markdown que incluya:
    1. Resumen de demanda actual.
    2. Alerta de productos más solicitados (Top movers).
    3. Recomendación para el equipo de producción (prioridades).
    4. Sugerencia de distribución logística eficiente basada en las ciudades.

    Mantén el tono profesional y conciso.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI report:", error);
    throw new Error("No se pudo generar el reporte de IA.");
  }
};
