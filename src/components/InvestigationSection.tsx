import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowLeft, 
  Scroll, 
  Download, 
  Lock, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ShieldCheck,
  Shield,
  History,
  MapPin,
  Users,
  MessageCircle
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { WHATSAPP_LINK } from '../constants';

interface InvestigationSectionProps {
  onBack: () => void;
}

export const InvestigationSection = ({ onBack }: InvestigationSectionProps) => {
  const [step, setStep] = useState<'intro' | 'form' | 'loading' | 'result'>('intro');
  const [formData, setFormData] = useState({
    surname: '',
    maternalSurname: '',
    fullName: '',
    origin: '',
    legend: '',
    ancestor: '',
    ancestorBirthplace: '',
    familyTrade: ''
  });
  const [report, setReport] = useState<{
    exploration: string;
    parchment: {
      title: string;
      name: string;
      origin: string;
      region: string;
      trace: string;
      certainty: string;
      closing: string;
    };
  } | null>(null);
  const [downloadCode, setDownloadCode] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'investigation_enabled')
        .maybeSingle();
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleStart = () => setStep('form');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateInvestigation = async () => {
    if (!formData.surname) {
      setError('El apellido es obligatorio');
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Actúa como un archivista de memoria y linaje con rigor histórico y sensibilidad narrativa para la app "El Baúl de los Recuerdos".
      
      OBJETIVO: Investigar profundamente el apellido paterno "${formData.surname}" y el materno "${formData.maternalSurname || 'No especificado'}" para la persona "${formData.fullName}".
      
      CONTEXTO DEL USUARIO:
      - Apellido Paterno: ${formData.surname}
      - Apellido Materno: ${formData.maternalSurname || 'No especificado'}
      - Nombre Completo: ${formData.fullName}
      - Lugar asociado: ${formData.origin || 'No especificado'}
      - Memoria familiar: ${formData.legend || 'No especificada'}
      - Antepasado: ${formData.ancestor || 'No especificado'}
      - Lugar de nacimiento del antepasado: ${formData.ancestorBirthplace || 'No especificado'}
      - Oficio/Tradición familiar: ${formData.familyTrade || 'No especificado'}

      REGLAS CRÍTICAS:
      1. NUNCA inventes datos. Distingue siempre entre: dato documentado, memoria familiar, coincidencia posible e interpretación simbólica.
      2. Usa palabras gatillo de certeza obligatorias: "documentado", "probable", "posible", "asociado", "según memoria familiar", "en construcción".
      3. Tono: elegante, claro, sobrio, cálido, formal, evocador. NUNCA grandilocuente ni fantasioso.
      4. No inventes parentescos ni atribuyas cargos sin evidencia.
      5. No certifiques descendencias no verificadas.
      6. No perfilar personas reales vivas con información no comprobada.
      7. PROFUNDIDAD: Investiga etimología, variantes geográficas y posibles migraciones. Si el oficio familiar coincide con el origen del apellido (ej. Herrero), menciónalo.

      DEBES RESPONDER ÚNICAMENTE EN FORMATO JSON con la siguiente estructura:
      {
        "exploration": "Texto detallado y extenso del reporte de exploración con secciones de origen (etimología y geografía), memoria familiar, coincidencias históricas, nivel de certeza y una conclusión reflexiva.",
        "parchment": {
          "title": "Crónica de Memoria y Linaje",
          "name": "${formData.fullName}",
          "origin": "Texto detallado sobre el origen probable y significado de los apellidos",
          "region": "${formData.origin || 'Raíces en el tiempo'}",
          "symbols": "Descripción de símbolos, colores o elementos heráldicos asociados (ej. Un roble por la fuerza, azul por la lealtad)",
          "stories": "Breve relato o leyenda asociada al apellido o a la región de origen",
          "trace": "4 o 5 valores simbólicos o virtudes asociadas al linaje",
          "certainty": "Nivel de certeza (alta/media/posible/en construcción)",
          "closing": "Frase poética final que resuma la esencia del linaje"
        }
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exploration: { type: Type.STRING },
              parchment: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  name: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  region: { type: Type.STRING },
                  symbols: { type: Type.STRING },
                  stories: { type: Type.STRING },
                  trace: { type: Type.STRING },
                  certainty: { type: Type.STRING },
                  closing: { type: Type.STRING }
                },
                required: ["title", "name", "origin", "region", "symbols", "stories", "trace", "certainty", "closing"]
              }
            },
            required: ["exploration", "parchment"]
          }
        }
      });

      const data = JSON.parse(response.text);
      if (data) {
        setReport(data);
        setStep('result');
        
        // Guardar en la base de datos
        await supabase.from('investigations').insert([{
          user_name: formData.fullName || formData.ancestor,
          surname: formData.surname,
          report_content: data.exploration
        }]);
      } else {
        throw new Error('No se pudo generar el informe');
      }
    } catch (err) {
      console.error('Error generating investigation:', err);
      setError('Hubo un error al conectar con los archivos históricos. Por favor, inténtalo de nuevo.');
      setStep('form');
    }
  };

  const validateCode = async () => {
    if (!downloadCode) return;
    setIsCheckingCode(true);
    setError(null);

    try {
      const { data } = await supabase
        .from('investigation_codes')
        .select('*')
        .eq('code', downloadCode.toUpperCase())
        .eq('is_used', false)
        .maybeSingle();

      if (data) {
        setIsUnlocked(true);
        setIsCodeValid(true);
      } else {
        setError('Código inválido o ya utilizado');
      }
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Error al validar el código');
    } finally {
      setIsCheckingCode(false);
    }
  };

  const getHtml2CanvasOptions = (clonedDoc: Document) => {
    const clonedElement = clonedDoc.getElementById('parchment-content');
    if (clonedElement) {
      // Limpieza radical para evitar errores de oklab/oklch
      clonedElement.style.boxShadow = 'none';
      clonedElement.style.backgroundImage = 'none';
      clonedElement.style.filter = 'none';
      clonedElement.style.border = '1px solid #2d1a0a';
      clonedElement.style.backgroundColor = '#f4ecd8';
      clonedElement.style.color = '#2d1a0a';
      
      const allElements = clonedElement.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i] as HTMLElement;
        
        // Forzar limpieza de colores oklch/oklab que html2canvas no entiende
        // Tailwind 4 usa oklch por defecto para opacidad y mezclas
        const styles = ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'boxShadow', 'textShadow'];
        const computedStyle = window.getComputedStyle(el);
        
        styles.forEach(prop => {
          const value = (computedStyle as any)[prop];
          if (value && (value.includes('oklch') || value.includes('oklab'))) {
            // Reemplazo simple: si es texto usamos el color oscuro del pergamino, 
            // si es fondo usamos transparente o el color del pergamino
            if (prop === 'color') el.style.color = '#2d1a0a';
            else if (prop === 'backgroundColor') el.style.backgroundColor = 'transparent';
            else if (prop === 'borderColor') el.style.borderColor = '#2d1a0a';
            else (el.style as any)[prop] = 'none';
          }
        });

        if (el.style) {
          el.style.boxShadow = 'none';
          el.style.filter = 'none';
          el.style.backdropFilter = 'none';
          el.style.textShadow = 'none';
          
          // Forzar colores hex para evitar oklab/oklch de las clases de Tailwind
          if (el.classList.contains('text-sepia-100')) el.style.color = '#fdfaf6';
          if (el.classList.contains('text-sepia-400')) el.style.color = '#d2ae76';
          if (el.classList.contains('text-sepia-500')) el.style.color = '#c19251';
          if (el.classList.contains('text-sepia-950')) el.style.color = '#342216';
          
          // Asegurar que el texto sea visible y no use oklch
          if (!el.style.color && computedStyle.color.includes('oklch')) {
            el.style.color = '#2d1a0a';
          }
        }
      }
    }
  };

  const downloadPDF = async () => {
    const element = document.getElementById('parchment-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      // Marcar código como usado
      await supabase
        .from('investigation_codes')
        .update({ is_used: true })
        .eq('code', downloadCode.toUpperCase());

      // Pequeña espera para asegurar renderizado
      await new Promise(resolve => setTimeout(resolve, 800));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f4ecd8',
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Add a global style override to the cloned document to handle oklch/oklab
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              backdrop-filter: none !important;
            }
            .text-sepia-100 { color: #fdfaf6 !important; }
            .text-sepia-400 { color: #d2ae76 !important; }
            .text-sepia-500 { color: #c19251 !important; }
            .text-sepia-950 { color: #342216 !important; }
          `;
          clonedDoc.head.appendChild(style);
          getHtml2CanvasOptions(clonedDoc);
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Historia_Apellido_${formData.surname}.pdf`);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Error al generar el PDF. Intentando descarga de imagen como alternativa...');
      downloadImage();
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadImage = async () => {
    const element = document.getElementById('parchment-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f4ecd8',
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Add a global style override to the cloned document to handle oklch/oklab
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * {
              color-scheme: light !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              backdrop-filter: none !important;
            }
            .text-sepia-100 { color: #fdfaf6 !important; }
            .text-sepia-400 { color: #d2ae76 !important; }
            .text-sepia-500 { color: #c19251 !important; }
            .text-sepia-950 { color: #342216 !important; }
          `;
          clonedDoc.head.appendChild(style);
          getHtml2CanvasOptions(clonedDoc);
        }
      });
      const link = document.createElement('a');
      link.download = `Pergamino_${formData.surname}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('No se pudo descargar ni el PDF ni la imagen. Por favor, toma una captura de pantalla.');
    }
  };

  return (
    <div className="min-h-screen bg-sepia-950 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sepia-400 hover:text-sepia-100 transition-colors mb-10 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver al Baúl
        </button>

        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <div className="inline-block p-4 bg-sepia-900/50 rounded-full border border-sepia-500/30 mb-4">
                <History className="w-12 h-12 text-sepia-500" />
              </div>
              <h1 className="text-5xl md:text-6xl font-serif text-sepia-100 leading-tight">
                Investiga tu Historia <br />
                <span className="text-sepia-500 italic">y el origen de tu Apellido</span>
              </h1>
              <p className="text-xl text-sepia-400 max-w-2xl mx-auto leading-relaxed">
                A partir de tu apellido, tus recuerdos familiares y referencias históricas, construimos una interpretación visual y narrativa de tu posible linaje. <br />
                <span className="text-sepia-500/80 text-lg block mt-2">Descubre posibles raíces, símbolos e historias asociadas a tu apellido.</span>
              </p>
              <div className="flex justify-center pt-6">
                <button 
                  onClick={handleStart}
                  className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-2xl hover:scale-105 transition-all flex items-center gap-3"
                >
                  Descubrir mi huella
                  <Scroll className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-sepia-900/30 border border-sepia-800 p-10 rounded-3xl backdrop-blur-md relative overflow-hidden"
            >
              <h2 className="text-3xl font-serif text-sepia-100 mb-8 flex items-center gap-3">
                <Users className="w-8 h-8 text-sepia-500" />
                Datos de tu Linaje
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Nombre Completo de la Persona *</label>
                  <input 
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Nombre y apellidos para búsqueda pública"
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Apellido Paterno *</label>
                  <input 
                    type="text"
                    name="surname"
                    value={formData.surname}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Ej: García"
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Apellido Materno (Opcional)</label>
                  <input 
                    type="text"
                    name="maternalSurname"
                    value={formData.maternalSurname}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Ej: Martínez"
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Lugar que tu familia asocia con estos apellidos</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sepia-600" />
                    <input 
                      type="text"
                      name="origin"
                      value={formData.origin}
                      onChange={handleInputChange}
                      disabled={!isUnlocked}
                      placeholder="Ej: Galicia, España / San Luis Potosí"
                      className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 pl-12 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Oficio o Tradición Familiar (Opcional)</label>
                  <input 
                    type="text"
                    name="familyTrade"
                    value={formData.familyTrade}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Ej: Carpinteros, Comerciantes, Agricultores..."
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Leyenda o Historia Familiar</label>
                  <textarea 
                    name="legend"
                    value={formData.legend}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="¿Qué se ha dicho en tu familia sobre este apellido, sus raíces o sus antepasados?"
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all h-32 resize-none disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Antepasado Específico (Opcional)</label>
                  <input 
                    type="text"
                    name="ancestor"
                    value={formData.ancestor}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Nombre de un abuelo, bisabuelo o familiar clave"
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sepia-400 text-xs uppercase tracking-widest font-bold">Lugar de Nacimiento del Antepasado (Opcional)</label>
                  <input 
                    type="text"
                    name="ancestorBirthplace"
                    value={formData.ancestorBirthplace}
                    onChange={handleInputChange}
                    disabled={!isUnlocked}
                    placeholder="Ej: Ciudad de México, Madrid, etc."
                    className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 focus:border-sepia-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <div className="mt-10 flex flex-col items-end gap-4">
                <button 
                  onClick={generateInvestigation}
                  disabled={!isUnlocked}
                  className="bg-sepia-500 hover:bg-sepia-400 text-sepia-950 px-10 py-4 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
                >
                  Iniciar Búsqueda
                  <Search className="w-5 h-5" />
                </button>
                <p className="text-sepia-500 text-[10px] uppercase tracking-wider max-w-md text-right leading-relaxed opacity-70">
                  Los resultados se construyen con base en memoria familiar, referencias históricas abiertas e interpretación asistida por IA. No constituyen una prueba genealógica definitiva.
                </p>
              </div>

              {/* Lock Overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-sepia-950/40 backdrop-blur-[2px]">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-sepia-900 border border-sepia-500/30 p-8 rounded-3xl shadow-2xl text-center space-y-6"
                  >
                    <Lock className="w-12 h-12 text-sepia-500 mx-auto" />
                    <div>
                      <h3 className="text-2xl font-serif text-sepia-100">Acceso Restringido</h3>
                      <p className="text-sepia-400 text-sm mt-2">
                        Para iniciar esta investigación profunda asistida por IA y archivos históricos, necesitas un código de acceso.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <input 
                        type="text"
                        value={downloadCode}
                        onChange={e => setDownloadCode(e.target.value)}
                        placeholder="Introduce tu código"
                        className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 text-center font-mono tracking-widest outline-none focus:border-sepia-500"
                      />
                      <div className="flex gap-3">
                        <button 
                          onClick={validateCode}
                          disabled={isCheckingCode}
                          className="flex-1 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                        >
                          {isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          Validar
                        </button>
                        <a 
                          href={WHATSAPP_LINK}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="w-5 h-5" />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                    {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                    <p className="text-sepia-500 text-[10px] uppercase tracking-tighter">
                      ¿No tienes un código? Solicítalo vía WhatsApp para comenzar tu investigación.
                    </p>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20 space-y-8"
            >
              <div className="relative inline-block">
                <div className="w-24 h-24 border-4 border-sepia-500/20 border-t-sepia-500 rounded-full animate-spin"></div>
                <History className="absolute inset-0 m-auto w-10 h-10 text-sepia-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-serif text-sepia-100">Consultando Archivos Históricos...</h3>
                <p className="text-sepia-400 italic">Rastreando linajes, escudos y registros antiguos.</p>
              </div>
              
              <div className="max-w-md mx-auto bg-sepia-900/50 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  className="h-full bg-sepia-500"
                />
              </div>
            </motion.div>
          )}

          {step === 'result' && report && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Detailed Exploration Report */}
              <div className="bg-sepia-900/30 border border-sepia-800 p-8 md:p-12 rounded-3xl backdrop-blur-md">
                <h2 className="text-3xl font-serif text-sepia-100 mb-6 flex items-center gap-3">
                  <Scroll className="w-8 h-8 text-sepia-500" />
                  Reporte de Exploración Histórica
                </h2>
                <div className="prose prose-sepia prose-invert max-w-none text-sepia-200 leading-relaxed space-y-4">
                  {report.exploration.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Parchment UI */}
              <div className="relative">
                <div 
                  id="parchment-content"
                  className="p-12 md:p-20 relative overflow-hidden min-h-[800px]"
                  style={{
                    backgroundColor: '#f4ecd8',
                    color: '#2d1a0a',
                    backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper.png")',
                    boxShadow: 'inset 0 0 100px rgba(139, 69, 19, 0.2)',
                    border: '1px solid #d4c4a8'
                  }}
                >
                  {/* Decorative Borders */}
                  <div className="absolute inset-4 border-2 border-[#2d1a0a]/20 pointer-events-none"></div>
                  <div className="absolute inset-6 border border-[#2d1a0a]/10 pointer-events-none"></div>
                  
                  {/* Watermark for preview */}
                  {!isCodeValid && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-30deg]">
                      <div className="flex flex-col items-center">
                        <span className="text-9xl font-serif font-black uppercase" style={{ color: '#2d1a0a' }}>Charlitron®</span>
                        <span className="text-4xl font-serif font-bold uppercase tracking-[0.5em]" style={{ color: '#2d1a0a' }}>El Viajero del Tiempo</span>
                        <span className="text-6xl font-serif font-bold uppercase mt-4" style={{ color: '#2d1a0a' }}>Muestra</span>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="text-center mb-16">
                      <div className="w-24 h-24 mx-auto mb-6 border-2 border-[#2d1a0a] rounded-full flex items-center justify-center">
                        <History className="w-12 h-12" style={{ color: '#2d1a0a' }} />
                      </div>
                      <h2 className="text-4xl font-serif font-bold uppercase tracking-widest border-b-2 border-[#2d1a0a]/30 pb-4 inline-block" style={{ color: '#2d1a0a' }}>
                        {report.parchment.title}
                      </h2>
                      <div className="mt-4 flex flex-col items-center">
                        <p className="font-serif italic" style={{ color: '#4a3728' }}>Documento generado por los Archivos de Charlitron®</p>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-60" style={{ color: '#4a3728' }}>El Viajero del Tiempo</p>
                      </div>
                    </div>

                    <div className={`max-w-none font-serif leading-relaxed text-lg ${!isCodeValid ? 'blur-[2px] select-none' : ''}`} style={{ color: '#2d1a0a' }}>
                      <div className="space-y-6">
                        <div>
                          <span className="font-bold uppercase text-xs tracking-widest block mb-1">Nombre</span>
                          <p className="text-2xl">{report.parchment.name}</p>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-xs tracking-widest block mb-1">Origen Probable</span>
                          <p>{report.parchment.origin}</p>
                        </div>
                        <div className="flex gap-8 items-start">
                          <div className="flex-1 space-y-6">
                            <div>
                              <span className="font-bold uppercase text-xs tracking-widest block mb-1">Región Asociada</span>
                              <p>{report.parchment.region}</p>
                            </div>
                            <div>
                              <span className="font-bold uppercase text-xs tracking-widest block mb-1">Interpretación del Blasón</span>
                              <p className="italic text-base leading-snug">{report.parchment.symbols}</p>
                            </div>
                          </div>
                          <div className="w-32 h-40 border-2 border-[#2d1a0a]/30 rounded-t-full rounded-b-lg flex flex-col items-center justify-center p-2 bg-[#2d1a0a]/5">
                            <Shield className="w-16 h-16 mb-2 opacity-40" style={{ color: '#2d1a0a' }} />
                            <span className="text-[8px] uppercase font-bold text-center opacity-60">Representación Simbólica</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-xs tracking-widest block mb-1">Relatos del Linaje</span>
                          <p className="text-base">{report.parchment.stories}</p>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-xs tracking-widest block mb-1">Huella del Linaje</span>
                          <p>{report.parchment.trace}</p>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-xs tracking-widest block mb-1">Nivel de Certeza</span>
                          <p className="italic">{report.parchment.certainty}</p>
                        </div>
                        <div className="pt-8 text-center">
                          <p className="text-xl italic">"{report.parchment.closing}"</p>
                        </div>
                      </div>
                    </div>

                    {isCodeValid && (
                      <div className="mt-20 pt-10 border-t border-[#2d1a0a]/20 flex justify-between items-end">
                        <div className="text-sm font-serif italic" style={{ color: '#4a3728' }}>
                          Dado en San Luis Potosí <br />
                          {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-right">
                          <div className="w-20 h-20 bg-[rgba(127,29,29,0.1)] rounded-full border-4 border-[rgba(127,29,29,0.2)] flex items-center justify-center mb-2">
                            <ShieldCheck className="w-10 h-10" style={{ color: '#7f1d1d' }} />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#2d1a0a' }}>Sello de Autenticidad</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Overlay for Unlocked Content */}
                {!isCodeValid && (
                  <div className="absolute inset-0 bg-sepia-950/40 backdrop-blur-[2px] flex items-center justify-center p-6 rounded-sm">
                    <div className="max-w-md w-full bg-sepia-900 p-8 rounded-3xl border border-sepia-500/30 shadow-2xl text-center space-y-6">
                      <Lock className="w-12 h-12 text-sepia-500 mx-auto" />
                      <h3 className="text-2xl font-serif text-sepia-100">Investigación Completada</h3>
                      <p className="text-sepia-400 text-sm">
                        Hemos encontrado registros valiosos sobre tu apellido. Para desbloquear el pergamino completo y descargar el PDF oficial, introduce tu código de acceso.
                      </p>
                      <div className="space-y-4">
                        <input 
                          type="text"
                          value={downloadCode}
                          onChange={e => setDownloadCode(e.target.value)}
                          placeholder="Introduce tu código"
                          className="w-full bg-sepia-950 border border-sepia-800 rounded-xl p-4 text-sepia-100 text-center font-mono tracking-widest outline-none focus:border-sepia-500"
                        />
                        <div className="flex gap-3">
                          <button 
                            onClick={validateCode}
                            disabled={isCheckingCode}
                            className="flex-1 bg-sepia-500 hover:bg-sepia-400 text-sepia-950 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                          >
                            {isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Validar
                          </button>
                          <a 
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            WhatsApp
                          </a>
                        </div>
                      </div>
                      {error && <p className="text-red-400 text-xs">{error}</p>}
                      <p className="text-sepia-500 text-[10px] uppercase tracking-tighter">
                        ¿No tienes un código? Solicítalo vía WhatsApp para obtener tu pergamino oficial.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {isCodeValid && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="flex items-center gap-3 text-green-500 bg-green-500/10 px-6 py-3 rounded-full border border-green-500/20">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest text-xs">Código Validado Correctamente</span>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={downloadPDF}
                      disabled={isDownloading}
                      className="bg-sepia-100 hover:bg-white text-sepia-950 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {isDownloading ? 'Generando...' : 'Descargar Pergamino PDF'}
                    </button>
                    <button 
                      onClick={downloadImage}
                      disabled={isDownloading}
                      className="bg-sepia-900 border border-sepia-500 text-sepia-100 px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-xl transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Descargar como Imagen
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
