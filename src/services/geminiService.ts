import { GoogleGenAI, Type } from "@google/genai";
import { CalorieEstimation } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function estimateCalories(base64Image: string): Promise<CalorieEstimation> {
  const ai = getAI();
  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const prompt = `Analyze this image of food and provide an estimate of the calories and protein content in grams. 
  Be specific about the food items identified.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Main food item(s) name" },
            calories: { type: Type.NUMBER, description: "Estimated total calories" },
            protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
            description: { type: Type.STRING, description: "Brief breakdown of the estimation" },
          },
          required: ["foodName", "calories", "protein", "description"],
        },
      },
    });

    const resultStr = response.text;
    if (!resultStr) throw new Error("No response from AI");
    
    return JSON.parse(resultStr) as CalorieEstimation;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Failed to estimate calories. Please try again.");
  }
}
