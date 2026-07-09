import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Variable de entorno requerida en Vercel (sin prefijo VITE_):
//   GEMINI_API_KEY — clave de Google Gemini AI

interface FormData {
  surname?: string;
  maternalSurname?: string;
  fullName?: string;
  origin?: string;
  legend?: string;
  ancestor?: string;
  ancestorBirthplace?: string;
  familyTrade?: string;
}

function sanitize(value: unknown, maxLen = 200): string {
  if (!value || typeof value !== 'string') return 'No especificado';
  return value.trim().slice(0, maxLen);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini-investigation] GEMINI_API_KEY no configurada');
    return res.status(500).json({ error: 'Configuración del servidor incompleta.' });
  }

  const body = (req.body ?? {}) as FormData;
  const surname = sanitize(body.surname, 100);

  if (surname === 'No especificado') {
    return res.status(400).json({ error: 'El apellido es obligatorio.' });
  }

  const maternalSurname  = sanitize(body.maternalSurname);
  const fullName         = sanitize(body.fullName);
  const origin           = sanitize(body.origin);
  const legend           = sanitize(body.legend, 500);
  const ancestor         = sanitize(body.ancestor);
  const ancestorBirthplace = sanitize(body.ancestorBirthplace);
  const familyTrade      = sanitize(body.familyTrade);

  const prompt = `Actúa como un archivista de memoria y linaje con rigor histórico y sensibilidad narrativa para la app "El Baúl de los Recuerdos".

OBJETIVO: Investigar profundamente el apellido paterno "${surname}" y el materno "${maternalSurname}" para la persona "${fullName}".

CONTEXTO DEL USUARIO:
- Apellido Paterno: ${surname}
- Apellido Materno: ${maternalSurname}
- Nombre Completo: ${fullName}
- Lugar asociado: ${origin}
- Memoria familiar: ${legend}
- Antepasado: ${ancestor}
- Lugar de nacimiento del antepasado: ${ancestorBirthplace}
- Oficio/Tradición familiar: ${familyTrade}

REGLAS CRÍTICAS:
1. NUNCA inventes datos. Distingue siempre entre: dato documentado, memoria familiar, coincidencia posible e interpretación simbólica.
2. Usa palabras gatillo de certeza obligatorias: "documentado", "probable", "posible", "asociado", "según memoria familiar", "en construcción".
3. Tono: elegante, claro, sobrio, cálido, formal, evocador. NUNCA grandilocuente ni fantasioso.
4. No inventes parentescos ni atribuyas cargos sin evidencia.
5. No certifiques descendencias no verificadas.
6. No perfilar personas reales vivas con información no comprobada.
7. PROFUNDIDAD: Investiga etimología, variantes geográficas y posibles migraciones.

DEBES RESPONDER ÚNICAMENTE EN FORMATO JSON con la siguiente estructura:
{
  "exploration": "Texto detallado del reporte con secciones de origen, memoria familiar, coincidencias históricas, nivel de certeza y conclusión reflexiva.",
  "parchment": {
    "title": "Crónica de Memoria y Linaje",
    "name": "${fullName}",
    "origin": "Texto detallado sobre el origen probable y significado de los apellidos",
    "region": "${origin}",
    "symbols": "Descripción de símbolos, colores o elementos heráldicos asociados",
    "stories": "Breve relato o leyenda asociada al apellido o a la región de origen",
    "trace": "4 o 5 valores simbólicos o virtudes asociadas al linaje",
    "certainty": "Nivel de certeza (alta/media/posible/en construcción)",
    "closing": "Frase poética final que resuma la esencia del linaje"
  }
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    const data = JSON.parse(text);
    return res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[gemini-investigation] error:', message);
    return res.status(500).json({ error: message });
  }
}
