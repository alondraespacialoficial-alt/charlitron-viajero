import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Maximize2, X, Download, Camera, Calendar, MapPin, User, Info, RotateCcw, Lock, Unlock } from 'lucide-react';
import { supabase } from '../supabase';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  photo_url: string;
  parent_id: string | null;
  birth_date?: string;
  death_date?: string;
  bio?: string;
  pos_x?: number | null;
  pos_y?: number | null;
}

interface FamilyTreeViewProps {
  treeId: string;
  onBack: () => void;
}

export const FamilyTreeView = ({ treeId, onBack }: FamilyTreeViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('*')
          .eq('tree_id', treeId);
        if (error) throw error;
        
        // Convert images to base64 to avoid CORS issues with html2canvas/PDF
        const membersWithBase64 = await Promise.all((data || []).map(async (m) => {
          if (m.photo_url) {
            try {
              const response = await fetch(m.photo_url);
              if (!response.ok) throw new Error('Network response was not ok');
              const blob = await response.blob();
              const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              return { ...m, photo_url: base64 };
            } catch (e) {
              console.error('Error converting image to base64:', e);
              return m;
            }
          }
          return m;
        }));

        setMembers(membersWithBase64);
      } catch (err) {
        console.error('Error fetching members:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [treeId]);

  useEffect(() => {
    if (members.length === 0 || !svgRef.current) return;

    const width = containerRef.current?.clientWidth || 1200;
    const height = 800;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);

    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Prepare links from members
    const links = members
      .filter(m => m.parent_id)
      .map(m => ({
        source: m.parent_id!,
        target: m.id
      }));

    // Inicializar nodos con posiciones guardadas si existen
    const nodesWithPos = members.map((m: any) => ({
      ...m,
      x: m.pos_x ?? undefined,
      y: m.pos_y ?? undefined,
      fx: m.pos_x != null ? m.pos_x : null,
      fy: m.pos_y != null ? m.pos_y : null,
    }));

    const simulation = d3.forceSimulation(nodesWithPos as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80))
      .alphaDecay(0.05);

    simulationRef.current = simulation;

    // Links (Branches)
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#8e6136")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.6);

    // Nodes (Family Members)
    const node = g.append("g")
      .selectAll(".node")
      .data(members)
      .join("g")
      .attr("class", "node")
      .style("cursor", "grab")
      .on("click", (event, d) => {
        setSelectedMember(d);
      })
      .call(d3.drag<SVGGElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    // Node Background (Vintage Frame)
    node.append("circle")
      .attr("r", 45)
      .attr("fill", "#f7f1e6")
      .attr("stroke", "#8e6136")
      .attr("stroke-width", 4)
      .attr("filter", "url(#drop-shadow)");

    // Node Image
    node.append("clipPath")
      .attr("id", (d: any) => `clip-${d.id}`)
      .append("circle")
      .attr("r", 40);

    node.append("image")
      .attr("xlink:href", (d: any) => d.photo_url || "https://picsum.photos/seed/user/200/200")
      .attr("x", -40)
      .attr("y", -40)
      .attr("width", 80)
      .attr("height", 80)
      .attr("clip-path", (d: any) => `url(#clip-${d.id})`)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .attr("crossorigin", "anonymous");

    // Node Text (Name)
    node.append("text")
      .attr("dy", 65)
      .attr("text-anchor", "middle")
      .attr("font-family", "Cormorant Garamond, serif")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .attr("fill", "#342216")
      .text((d: any) => d.name);

    // Node Text (Relationship)
    node.append("text")
      .attr("dy", 80)
      .attr("text-anchor", "middle")
      .attr("font-family", "Inter, sans-serif")
      .attr("font-size", "10px")
      .attr("text-transform", "uppercase")
      .attr("letter-spacing", "1px")
      .attr("fill", "#c19251")
      .text((d: any) => d.relationship || "");

    // Shadow Filter
    const defs = svg.append("defs");
    const filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");
    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", 3)
      .attr("result", "blur");
    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 2)
      .attr("dy", 2)
      .attr("result", "offsetBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "offsetBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
      d3.select(this).style("cursor", "grabbing");
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    async function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      // Mantener fx/fy para que el nodo quede fijo donde lo soltaste
      d3.select(this).style("cursor", "grab");
      // Guardar posición en Supabase
      try {
        await supabase
          .from('family_members')
          .update({ pos_x: event.subject.fx, pos_y: event.subject.fy })
          .eq('id', event.subject.id);
      } catch (e) {
        console.error('Error saving position:', e);
      }
    }

  }, [members]);

  const handleDownload = async () => {
    if (!containerRef.current) return;
    
    try {
      // Esperar a que todas las imágenes estén cargadas en el SVG
      await new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });

      // Actualizar todos los xlink:href a href para html2canvas
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const images = svg.querySelectorAll('image');
        images.forEach((img) => {
          const href = img.getAttribute('xlink:href');
          if (href) {
            img.setAttribute('href', href);
            img.removeAttribute('xlink:href');
          }
        });
      }

      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: '#fdfaf6',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          const clonedSvg = clonedDoc.querySelector('svg');
          if (clonedSvg) {
            clonedSvg.style.overflow = 'visible';
            // Asegurar que las imágenes en el clon también tienen href correcto
            const clonedImages = clonedSvg.querySelectorAll('image');
            clonedImages.forEach((img) => {
              const href = img.getAttribute('href') || img.getAttribute('xlink:href');
              if (href) {
                img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
                img.setAttribute('href', href);
              }
            });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;
      
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(imgData, 'PNG', x, y, width, height);
      pdf.save('arbol-genealogico-charlitron.pdf');

      // Restaurar xlink:href después de descargar
      if (svg) {
        const images = svg.querySelectorAll('image');
        images.forEach((img) => {
          const href = img.getAttribute('href');
          if (href) {
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', href);
          }
        });
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un error al generar el PDF. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="min-h-screen bg-sepia-50 pt-32 pb-24 px-6 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-grow flex flex-col">
        <div className="flex justify-between items-center mb-12">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sepia-600 hover:text-sepia-950 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="uppercase tracking-widest text-sm font-bold">Volver al Panel</span>
          </button>

          <div className="text-center">
            <h2 className="text-4xl font-serif text-sepia-950">Árbol de Linaje®</h2>
            <p className="text-sepia-500 text-[10px] uppercase tracking-[0.3em] font-bold mt-1">Charlitron — El Viajero del Tiempo</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                if (!simulationRef.current) return;
                const sim = simulationRef.current;
                const ids = (sim.nodes() as any[]).map((n: any) => n.id);
                // Liberar pines visuales
                (sim.nodes() as any[]).forEach((n: any) => {
                  n.fx = null;
                  n.fy = null;
                });
                sim.alpha(0.8).restart();
                // Limpiar posiciones guardadas en Supabase
                try {
                  await supabase
                    .from('family_members')
                    .update({ pos_x: null, pos_y: null })
                    .in('id', ids);
                } catch (e) {
                  console.error('Error resetting positions:', e);
                }
              }}
              title="Resetear posiciones"
              className="flex items-center gap-2 border border-sepia-300 text-sepia-700 px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-sepia-100 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset Layout
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 bg-sepia-950 text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-sepia-800 transition-all shadow-xl"
            >
              <Download className="w-4 h-4" /> Descargar PDF
            </button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="flex-grow bg-white rounded-[3rem] shadow-2xl border border-sepia-100 relative overflow-auto scrollbar-hide p-10 flex items-center justify-center cursor-move"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sepia-600"></div>
          ) : members.length === 0 ? (
            <p className="text-sepia-400 font-serif italic">No hay datos suficientes para generar el árbol.</p>
          ) : (
            <svg ref={svgRef} className="max-w-none"></svg>
          )}

          {/* Drag hint */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-sepia-950/70 text-white text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full pointer-events-none opacity-60">
            Arrastra las burbujas para acomodarlas · Click para ver detalles
          </div>

          {/* Watermark */}
          <div className="absolute bottom-8 right-12 opacity-10 pointer-events-none no-select">
            <div className="text-right">
              <span className="text-sepia-950 text-4xl font-serif">Charlitron®</span>
              <span className="block text-sepia-950 text-[8px] font-bold uppercase tracking-[0.3em]">El Viajero del Tiempo</span>
            </div>
          </div>
        </div>

        {/* Member Detail Modal */}
        <AnimatePresence>
          {selectedMember && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[400] bg-sepia-950/80 backdrop-blur-sm flex items-center justify-center p-6"
              onClick={() => setSelectedMember(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl relative"
                onClick={e => e.stopPropagation()}
              >
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-6 right-6 p-2 bg-sepia-50 rounded-full hover:bg-sepia-100 transition-colors"
                >
                  <X className="w-6 h-6 text-sepia-400" />
                </button>

                <div className="p-10 text-center">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-sepia-100 mx-auto mb-6 shadow-xl bg-sepia-50">
                    <img src={selectedMember.photo_url || "https://picsum.photos/seed/user/200/200"} alt={selectedMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  
                  <h3 className="text-3xl font-serif text-sepia-950 mb-2">{selectedMember.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-sepia-400 bg-sepia-50 px-4 py-1 rounded-full border border-sepia-100">
                    {selectedMember.relationship}
                  </span>

                  <div className="mt-8 space-y-4 text-sepia-700">
                    {selectedMember.birth_date && (
                      <div className="flex items-center justify-center gap-3">
                        <Calendar className="w-4 h-4 text-sepia-400" />
                        <span className="text-sm">{selectedMember.birth_date} {selectedMember.death_date ? `— ${selectedMember.death_date}` : ''}</span>
                      </div>
                    )}
                    {selectedMember.bio && (
                      <div className="pt-6 border-t border-sepia-100">
                        <p className="text-sm italic leading-relaxed font-serif">
                          "{selectedMember.bio}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-10 pt-8 border-t border-sepia-100">
                    <button 
                      onClick={() => setSelectedMember(null)}
                      className="text-sepia-500 text-[10px] font-bold uppercase tracking-widest hover:text-sepia-950 transition-colors"
                    >
                      Cerrar Ficha
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
