import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, FileText, Scale, Bot } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms' | 'avatars';
  onBack: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isPrivacy = type === 'privacy';
  const isAvatars  = type === 'avatars';

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sepia-700 hover:text-sepia-950 transition-colors uppercase tracking-widest text-xs font-bold group mb-12"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </button>

        <header className="mb-16">
          <div className="w-16 h-16 bg-sepia-200 rounded-2xl flex items-center justify-center mb-6">
            {isAvatars ? <Bot className="text-sepia-600 w-8 h-8" />
              : isPrivacy ? <ShieldCheck className="text-sepia-600 w-8 h-8" />
              : <Scale className="text-sepia-600 w-8 h-8" />}
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
            {isAvatars ? 'Avatares Interactivos Asistidos por IA'
              : isPrivacy ? 'Aviso de Privacidad'
              : 'Términos y Condiciones'}
          </h1>
          <p className="text-sepia-600 uppercase tracking-[0.3em] text-sm font-bold">
            {isAvatars
              ? 'Museo de Avatares Interactivos – Charlitron® Viajero del Tiempo'
              : 'Charlitron® – "Baúl de los Recuerdos"'}
          </p>
        </header>

        <div className="prose prose-sepia max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-sepia-100">
          {isAvatars ? (
            <div className="space-y-8 text-sepia-900 font-light leading-relaxed">
              <p className="font-medium italic">AVISO SOBRE AVATARES INTERACTIVOS Y USO RESPONSABLE DE INTELIGENCIA ARTIFICIAL – CHARLITRON® VIAJERO DEL TIEMPO</p>

              <p>
                Los contenidos y experiencias disponibles en esta sección utilizan sistemas de
                inteligencia artificial para generar interacciones conversacionales, respuestas
                narrativas y representaciones interpretativas de personajes históricos, figuras
                simbólicas, contextos culturales o memorias documentadas.
              </p>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Naturaleza de los Avatares</h3>
                <p>
                  Estos avatares <strong>no constituyen reproducciones literales, auténticas ni verificadas
                  palabra por palabra</strong> de personas reales, fallecidas o históricas. Se trata de
                  recreaciones digitales elaboradas con fines educativos, culturales, de divulgación y
                  experimentación museográfica, a partir de investigación, fuentes disponibles, criterios
                  curatoriales y supervisión humana.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Limitaciones y Uso Responsable</h3>
                <p>
                  El uso de estos avatares <strong>no debe interpretarse como sustituto</strong> de investigación
                  académica, asesoría profesional, prueba documental, testimonio legal ni fuente histórica
                  única. Las respuestas generadas pueden contener simplificaciones, interpretaciones o
                  limitaciones propias de los sistemas de inteligencia artificial, por lo que se recomienda
                  contrastar la información con fuentes adicionales cuando sea necesario.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Compromiso Ético</h3>
                <p>
                  Charlitron® Viajero del Tiempo promueve un uso responsable, transparente y ético de la
                  inteligencia artificial. Cualquier referencia a personas históricas, personajes inspirados
                  en contextos reales o memorias familiares se presenta como parte de una{' '}
                  <strong>experiencia cultural y narrativa</strong>, no como afirmación de autenticidad absoluta,
                  resurrección digital o representación exacta de conciencia, pensamiento o voluntad de
                  persona alguna.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Contenidos Familiares y Sensibles</h3>
                <p>
                  En los casos de contenidos familiares, memoriales o sensibles, el proyecto procurará
                  actuar con respeto, prudencia y responsabilidad, evitando usos engañosos, invasivos o
                  lesivos para la dignidad, la memoria o la privacidad de terceros.
                </p>
              </section>

              <section className="pt-8 border-t border-sepia-100">
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Identificación de la Sección</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  <li><strong>Nombre público:</strong> Museo de Avatares Interactivos.</li>
                  <li><strong>Nombre legal de la sección:</strong> Avatares Interactivos Asistidos por Inteligencia Artificial.</li>
                </ul>
                <p className="mt-6 text-sm text-sepia-500">
                  Este aviso puede actualizarse conforme evolucionen las tecnologías utilizadas o el marco
                  legal aplicable. La versión vigente estará siempre disponible en este sitio web.
                </p>
              </section>
            </div>
          ) : isPrivacy ? (
            <div className="space-y-8 text-sepia-900 font-light leading-relaxed">
              <p className="font-medium italic">AVISO DE PRIVACIDAD – CHARLITRON “BAÚL DE LOS RECUERDOS”</p>
              
              <p>
                Charlitron® Viajero del Tiempo, con domicilio en San Luis Potosí, S.L.P., México, es responsable del tratamiento de los datos personales que nos proporciones para la creación y difusión de tu historia dentro del proyecto “Baúl de los Recuerdos”.
              </p>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Datos que podemos recolectar</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Datos de identificación:</strong> nombre, teléfono, correo electrónico, ciudad.</li>
                  <li><strong>Datos de la historia:</strong> textos, anécdotas, fechas aproximadas, nombres de negocios, lugares.</li>
                  <li><strong>Imágenes y contenido:</strong> fotografías, videos, audios, logotipos y cualquier material que nos entregues para la elaboración de tu historia.</li>
                </ul>
                <p className="mt-4 text-sm italic">No solicitamos datos sensibles como información médica, religiosa, financiera o política. Si tú decides mencionarlos en tu historia, será bajo tu responsabilidad.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Finalidades del tratamiento</h3>
                <p>Usaremos tus datos para:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Crear, editar y producir la pieza audiovisual o narrativa que contrataste (video homenaje, historia de negocio, cápsula de memoria, etc.).</li>
                  <li>Publicar tu historia en nuestra plataforma “Baúl de los Recuerdos”, así como en nuestras redes sociales y materiales de difusión del proyecto, cuando tú lo autorices.</li>
                  <li>Contactarte para temas relacionados con tu proyecto, pagos, aclaraciones y servicios posteriores.</li>
                </ul>
                <p className="mt-4">De manera adicional, y siempre con tu consentimiento, podremos usar fragmentos de tu historia como ejemplo de nuestro trabajo en presentaciones comerciales, portafolios y publicidad.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Transferencia de datos</h3>
                <p>Podemos compartir tu contenido con:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Proveedores de servicios tecnológicos (hosting, correo, herramientas de edición en la nube), únicamente para operar la plataforma.</li>
                  <li>Plataformas de redes sociales donde publiquemos la historia (por ejemplo, TikTok, Facebook, Instagram, YouTube).</li>
                </ul>
                <p className="mt-4">No venderemos tus datos personales a terceros.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Conservación</h3>
                <p>Guardaremos tu información mientras tu historia se encuentre publicada y mientras exista relación comercial. Si solicitas eliminación, retiraremos tu historia de la plataforma en un plazo razonable, salvo obligaciones legales de conservación.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Derechos ARCO</h3>
                <p>Tienes derecho a:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Acceder a los datos que tenemos sobre ti.</li>
                  <li>Rectificar datos inexactos.</li>
                  <li>Cancelar o solicitar la eliminación de tu historia del Baúl de los Recuerdos.</li>
                  <li>Oponerte al uso posterior de tus datos.</li>
                </ul>
                <p className="mt-4">Puedes ejercer estos derechos enviando un correo a: <a href="mailto:ventas@charlitron.com" className="text-sepia-600 font-bold underline">ventas@charlitron.com</a> indicando tu nombre completo, medio de contacto y la historia o proyecto al que te refieres.</p>
              </section>

              <section className="pt-8 border-t border-sepia-100">
                <p className="text-sm text-sepia-500">
                  Podremos modificar este Aviso de Privacidad para adaptarlo a cambios legales o del servicio. La versión vigente estará siempre disponible en este sitio web.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-8 text-sepia-900 font-light leading-relaxed">
              <p className="font-medium italic">TÉRMINOS Y CONDICIONES – “BAÚL DE LOS RECUERDOS”</p>
              
              <p>Al utilizar este sitio y contratar nuestros servicios, aceptas los siguientes términos:</p>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">1. Objeto del sitio</h3>
                <p>“Baúl de los Recuerdos” es una plataforma de Charlitron® Viajero del Tiempo para alojar historias audiovisuales y narrativas de personas, familias y negocios.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">2. Contenido proporcionado por el cliente</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Garantizas que las fotografías, videos, textos y datos que nos entregas son tuyos o cuentas con autorización para usarlos.</li>
                  <li>Te comprometes a no enviar material ilegal, difamatorio, violento, sexual explícito ni que viole derechos de terceros.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">3. Derechos de uso del contenido</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Tú sigues siendo titular de tus recuerdos e imágenes.</li>
                  <li>Nos otorgas una licencia no exclusiva para editar, adaptar y publicar el contenido dentro de la historia que te producimos, así como mostrarla en la plataforma y redes del proyecto, mientras mantengas activo el servicio.</li>
                  <li>Podemos usar fragmentos de la historia como parte de nuestro portafolio, siempre de forma respetuosa.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">4. Pagos y suscripciones</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>El servicio de producción del video se paga conforme a la cotización entregada.</li>
                  <li>El alojamiento de la historia en el Baúl de los Recuerdos puede incluir un periodo gratuito inicial y posteriormente una cuota periódica; los montos y vigencia se especificarán en la cotización y factura.</li>
                  <li>Si dejas de pagar la cuota de alojamiento, podremos despublicar la historia de la plataforma, sin afectar el archivo de video que ya te fue entregado.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">5. Limitación de responsabilidad</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Haremos esfuerzos razonables para mantener la plataforma disponible, pero no garantizamos que esté libre de fallos o interrupciones.</li>
                  <li>No somos responsables por el uso que otros hagan del enlace a tu historia ni por comentarios en redes sociales externas.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">6. Propiedad intelectual de Charlitron®</h3>
                <p>La marca “Charlitron® Viajero del Tiempo”, el diseño del sitio, guiones, narraciones y elementos gráficos creados por nosotros son propiedad de Charlitron® y no pueden ser reutilizados sin autorización escrita.</p>
              </section>

              <section>
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">7. Eliminación de historias</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Puedes solicitar que tu historia se retire de la plataforma; revisaremos tu solicitud y, tras verificar la identidad, la despublicaremos en un plazo razonable.</li>
                  <li>Nos reservamos el derecho de retirar historias que incumplan estos términos o generen conflictos legales.</li>
                </ul>
              </section>

              <section className="pt-8 border-t border-sepia-100">
                <h3 className="text-xl font-serif font-bold text-sepia-950 mb-4">Jurisdicción aplicable</h3>
                <p>Estos términos se rigen por las leyes de México. Cualquier controversia se resolverá en los tribunales competentes de San Luis Potosí, S.L.P.</p>
              </section>
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-3 bg-sepia-950 text-sepia-100 px-10 py-4 rounded-full font-bold uppercase tracking-widest hover:bg-sepia-800 transition-all shadow-xl"
          >
            Regresar a la página principal
          </button>
        </div>
      </div>
    </div>
  );
};
