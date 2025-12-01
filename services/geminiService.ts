import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExamConfig, Question } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants for prompting
// Switched to Flash for speed as requested
const MODEL = 'gemini-2.5-flash';

/**
 * Generates a unique tutorial based on the exam configuration via Streaming.
 */
export const streamTutorialContent = async function* (config: ExamConfig) {
  const seed = Date.now().toString();
  
  const prompt = `
    You are a seasoned ${config.examType} examiner and tutor.
    Create a comprehensive, exam-focused study tutorial for the following parameters:
    
    Subject: ${config.subject}
    Topic: ${config.topic || 'General Review'}
    Exam Standard: ${config.examType}
    Target Year Style: ${config.year}
    
    Requirements:
    1. Structure it logically with clear headings (Introduction, Key Concepts, Examples, Summary).
    2. Use a professional, encouraging tone suitable for students.
    3. Include at least 3 worked examples typical of ${config.examType} questions.
    4. Highlight common pitfalls candidates make in this topic.
    5. UNIQUE SEED: ${seed} (Ensure this content is generated freshly and doesn't repeat generic templates).
    6. Format using Markdown.
    7. CRITICAL: Write ALL mathematical equations using STRICT LaTeX syntax enclosed in single dollar signs ($...$). 
       Example: "Solve for $x$ in $x^2 + 2x = 0$". 
       Do NOT use Unicode characters for math (like √ or ÷). ALWAYS use LaTeX ($\\sqrt{x}$ or $\\div$).
  `;

  try {
    const response = await ai.models.generateContentStream({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Tutorial Stream Error:", error);
    throw new Error("Could not generate tutorial stream.");
  }
};

/**
 * Generates 20 unique MCQ questions.
 */
export const generateQuizQuestions = async (config: ExamConfig): Promise<Question[]> => {
  const seed = Math.floor(Math.random() * 1000000).toString();

  const prompt = `
    Generate 20 completely unique, ${config.examType}-standard multiple-choice questions (MCQs).
    Subject: ${config.subject}
    Topic: ${config.topic || 'General Syllabus'}
    Year Standard: ${config.year}
    
    Rules:
    1. Questions must be difficult enough for a final year secondary school student.
    2. Provide 4 distinct options for each question.
    3. Ensure the correct answer is unambiguous.
    4. Random Seed: ${seed} (Do not repeat questions from common datasets).
    5. CRITICAL: Write ALL mathematical equations using STRICT LaTeX syntax enclosed in single dollar signs ($...$). 
       Example: "Simplify $\\frac{1}{2} + \\frac{3}{4}$". 
       Do NOT use Unicode characters for math (like √ or ÷). ALWAYS use LaTeX ($\\sqrt{x}$ or $\\div$).
    6. Return strict JSON.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        questionText: { type: Type.STRING },
        options: { 
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        correctOptionIndex: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" }
      },
      required: ["questionText", "options", "correctOptionIndex"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8, // High temperature for uniqueness
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.replace(/```json|```/g, '').trim();
    const rawData = JSON.parse(cleanedText);
    
    // Map to internal Question interface with IDs
    return rawData.map((q: any, index: number) => ({
      id: index + 1,
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex
    }));

  } catch (error) {
    console.error("Quiz Generation Error:", error);
    throw new Error("Could not generate quiz. Please try again.");
  }
};

/**
 * Generates explanations for incorrect answers.
 */
export const generateExplanations = async (
  config: ExamConfig, 
  failures: { question: string, selected: string, correct: string }[]
): Promise<string[]> => {
  
  if (failures.length === 0) return [];

  const failuresText = failures.map((f, i) => 
    `Question: ${f.question}\nStudent Selected: ${f.selected}\nCorrect Answer: ${f.correct}`
  ).join('\n\n');

  const prompt = `
    You are an expert ${config.examType} tutor. A student failed these questions in ${config.subject}.
    
    For EACH question provided below:
    1. Provide a direct, clear explanation of the correct answer.
    2. If it involves calculation (Math/Physics/Chem), YOU MUST SHOW THE STEP-BY-STEP SOLUTION.
    3. Format using Markdown (use bolding for key terms, bullet points for steps).
    4. CRITICAL: Write ALL mathematical equations using STRICT LaTeX syntax enclosed in single dollar signs ($...$). 
       Example: "Therefore, $x = 5$". 
       Do NOT use Unicode characters for math (like √ or ÷). ALWAYS use LaTeX ($\\sqrt{x}$ or $\\div$).
    5. Keep it concise but helpful.
    
    Questions:
    ${failuresText}
    
    Output: JSON Array of strings (one explanation per question).
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5 
      }
    });

    const text = response.text || "[]";
    const cleanedText = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Explanation Generation Error:", error);
    return failures.map(() => "Explanation could not be generated due to connection issues.");
  }
};