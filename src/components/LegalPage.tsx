import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';

interface LegalPageProps {
  type: 'privacy' | 'terms';
  onBack: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const isPrivacy = type === 'privacy';

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
            {isPrivacy ? <ShieldCheck className="text-sepia-600 w-8 h-8" /> : <Scale className="text-sepia-600 w-8 h-8" />}
          </div>
          <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
            {isPrivacy ? 'Aviso de Privacidad' : 'Términos y Condiciones'}
          </h1>
          <p className="text-sepia-600 uppercase tracking-[0.3em] text-sm font-bold">
            Charlitron® – “Baúl de los Recuerdos”
          </p>
        </header>

        <div className="prose prose-sepia max-w-none bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-sepia-100">
          {isPrivacy ? (
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
