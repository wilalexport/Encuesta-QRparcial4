// pages/SurveyDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Survey, ResponseWithItems } from '@/types/database.types';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Edit, ArrowLeft, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNotification } from '@/contexts/NotificationContext';

export const SurveyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    loadSurveyData();
  }, [id]);

  const loadSurveyData = async () => {
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select('*')
        .eq('id', id)
        .single();

      if (surveyError) throw surveyError;
      setSurvey(surveyData);

      // Construir URL pública (usa la IP/host actual en lugar de localhost)
      const protocol = window.location.protocol;
      const host = window.location.hostname === 'localhost' 
        ? `${window.location.hostname}:${window.location.port}` 
        : window.location.host;
      const url = `${protocol}//${host}/s/${surveyData.public_slug}`;
      setPublicUrl(url);

      // Cargar respuestas
      const { data: responsesData, error: responsesError } = await supabase
        .from('responses')
        .select('*, items:response_items(*)')
        .eq('survey_id', id)
        .order('submitted_at', { ascending: false });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showNotification('Error al cargar la encuesta', 'error');
      navigate('/surveys');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    const qrContainer = document.getElementById('qr-code');
    if (!qrContainer || !survey) return;

    const svg = qrContainer.querySelector('svg');
    if (!svg) return;

    // Crear un canvas para dibujar la imagen
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensiones de la imagen final
    const width = 700;
    const height = 900;
    canvas.width = width;
    canvas.height = height;

    // Gradiente de fondo suave (teal a blanco)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#f0fdfa'); // teal-50
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Borde decorativo superior con gradiente teal/emerald
    const headerGradient = ctx.createLinearGradient(0, 0, width, 0);
    headerGradient.addColorStop(0, '#0d9488'); // teal-600
    headerGradient.addColorStop(1, '#16a34a'); // emerald-600
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, width, 100);

    // Logo/Título principal en header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ENCUESTAS QR', width / 2, 55);

    // Rectángulo blanco redondeado para contenido principal
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    const contentX = 50;
    const contentY = 130;
    const contentWidth = width - 100;
    const contentHeight = 690;
    const cornerRadius = 16;
    
    ctx.beginPath();
    ctx.moveTo(contentX + cornerRadius, contentY);
    ctx.lineTo(contentX + contentWidth - cornerRadius, contentY);
    ctx.arcTo(contentX + contentWidth, contentY, contentX + contentWidth, contentY + cornerRadius, cornerRadius);
    ctx.lineTo(contentX + contentWidth, contentY + contentHeight - cornerRadius);
    ctx.arcTo(contentX + contentWidth, contentY + contentHeight, contentX + contentWidth - cornerRadius, contentY + contentHeight, cornerRadius);
    ctx.lineTo(contentX + cornerRadius, contentY + contentHeight);
    ctx.arcTo(contentX, contentY + contentHeight, contentX, contentY + contentHeight - cornerRadius, cornerRadius);
    ctx.lineTo(contentX, contentY + cornerRadius);
    ctx.arcTo(contentX, contentY, contentX + cornerRadius, contentY, cornerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Icono decorativo (círculo con acento)
    ctx.fillStyle = '#ccfbf1'; // teal-100
    ctx.beginPath();
    ctx.arc(width / 2, 200, 50, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#0d9488'; // teal-600
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width / 2, 200, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Texto "Escanea el código"
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Escanea el código QR', width / 2, 295);
    
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#334155'; // slate-700
    ctx.fillText('para contestar la encuesta:', width / 2, 330);

    // Nombre de la encuesta con fondo teal suave
    ctx.fillStyle = '#ccfbf1'; // teal-100
    ctx.fillRect(80, 360, width - 160, 60);
    
    ctx.fillStyle = '#0d9488'; // teal-600
    ctx.font = 'bold 24px Arial, sans-serif';
    const maxWidth = width - 200;
    const title = survey.title;
    if (ctx.measureText(title).width > maxWidth) {
      const words = title.split(' ');
      let line = '';
      let y = 390;
      for (let word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth) {
          ctx.fillText(line, width / 2, y);
          line = word + ' ';
          y += 28;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, y);
    } else {
      ctx.fillText(title, width / 2, 395);
    }

    // Convertir SVG a imagen
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
      // Marco decorativo para QR
      const qrSize = 300;
      const qrX = (width - qrSize) / 2;
      const qrY = 450;
      
      // Fondo blanco para QR con borde teal
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      
      ctx.strokeStyle = '#0d9488'; // teal-600
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
      
      // Dibujar el QR
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // URL en la parte inferior con icono
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = '14px Arial, sans-serif';
      ctx.textAlign = 'center';
      const urlText = publicUrl.length > 50 ? publicUrl.substring(0, 47) + '...' : publicUrl;
      ctx.fillText(urlText, width / 2, qrY + qrSize + 55);

      // Línea decorativa inferior
      ctx.strokeStyle = '#0d9488'; // teal-600
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(150, qrY + qrSize + 75);
      ctx.lineTo(width - 150, qrY + qrSize + 75);
      ctx.stroke();

      // Descargar la imagen
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `qr-${survey.slug}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    };
    
    img.src = url;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showNotification('URL copiada al portapapeles', 'success');
    } catch (error) {
      console.error('Error al copiar:', error);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = publicUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showNotification('URL copiada al portapapeles', 'success');
      } catch (err) {
        showNotification('No se pudo copiar la URL', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleChangeStatus = async (newStatus: 'published' | 'closed') => {
    if (!survey) return;
    
    const confirmed = await showConfirm({
      title: newStatus === 'closed' ? 'Cerrar Encuesta' : 'Reabrir Encuesta',
      message: newStatus === 'closed' 
        ? '¿Estás seguro de cerrar esta encuesta? Las personas ya no podrán responder.'
        : '¿Estás seguro de reabrir esta encuesta?',
      confirmText: newStatus === 'closed' ? 'Cerrar' : 'Reabrir',
      cancelText: 'Cancelar',
      type: newStatus === 'closed' ? 'warning' : 'info',
    });
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('surveys')
        .update({ status: newStatus })
        .eq('id', survey.id);

      if (error) throw error;

      setSurvey({ ...survey, status: newStatus });
      showNotification(
        newStatus === 'closed' ? 'Encuesta cerrada exitosamente' : 'Encuesta reabierta exitosamente',
        'success'
      );
    } catch (error) {
      console.error('Error cambiando estado:', error);
      showNotification('Error al cambiar el estado de la encuesta', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-gray-600">Cargando encuesta...</p>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow border border-gray-200 p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/surveys"
              className="p-2 hover:bg-primary-50 transition border border-gray-300 rounded-md text-primary-700 hover:border-primary-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight uppercase">{survey.title}</h1>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide border rounded-md ${
                  survey.status === 'published' ? 'bg-accent-50 text-accent-800 border-accent-300' :
                  survey.status === 'closed' ? 'bg-red-50 text-red-800 border-red-300' :
                  'bg-amber-50 text-amber-800 border-amber-300'
                }`}>
                  {survey.status === 'published' ? 'Publicado' : 
                   survey.status === 'closed' ? 'Cerrado' : 'Borrador'}
                </span>
              </div>
              <p className="text-gray-600 mt-1 font-medium">{survey.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {survey.status === 'published' && (
              <button
                onClick={() => handleChangeStatus('closed')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition font-bold uppercase tracking-wide shadow-md hover:shadow-lg rounded-md"
              >
                Cerrar
              </button>
            )}
            {survey.status === 'closed' && (
              <button
                onClick={() => handleChangeStatus('published')}
                className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white hover:bg-accent-700 transition font-bold uppercase tracking-wide shadow-md hover:shadow-lg rounded-md"
              >
                Reabrir
              </button>
            )}
            <Link
              to={`/surveys/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition font-bold uppercase tracking-wide shadow-md hover:shadow-lg rounded-md"
            >
              <Edit className="w-4 h-4" />
              Editar
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code */}
        <div className="bg-white shadow border border-gray-200 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center uppercase tracking-tight border-b border-gray-200 pb-3">Código QR</h2>
          
          <div className="flex flex-col items-center mb-4">
            <p className="text-sm text-gray-600 mb-4 text-center font-medium">
              Escanea el código para acceder
            </p>
            <div id="qr-code" className="p-4 bg-white border-2 border-gray-300 rounded-lg">
              <QRCodeSVG value={publicUrl} size={220} level="H" />
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 transition font-bold uppercase tracking-wide text-sm shadow-md hover:shadow-lg rounded-md"
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>
            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 hover:bg-gray-200 transition font-bold uppercase tracking-wide text-sm border border-gray-300"
            >
              <Share2 className="w-4 h-4" />
              Copiar URL
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600 break-all font-mono">{publicUrl}</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-tight border-b border-gray-200 pb-3">Estadísticas</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Respuestas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{responses.length}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Estado</p>
                <p className="text-lg font-bold text-gray-900 mt-1 uppercase">
                  {survey.status === 'published' ? 'Publicado' : survey.status === 'draft' ? 'Borrador' : 'Cerrado'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 border border-gray-200">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Creado</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {format(new Date(survey.created_at), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Respuestas Recientes */}
          <div className="bg-white shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 uppercase tracking-tight border-b border-gray-200 pb-3">Respuestas Recientes</h2>
            
            {responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">Aún no hay respuestas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.slice(0, 10).map((response) => (
                  <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 hover:border-gray-400 transition">
                    <div>
                      <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Respuesta #{response.id}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        {format(new Date(response.submitted_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <Link 
                      to={`/surveys/${id}/responses/${response.id}`}
                      className="text-gray-900 hover:text-gray-700 text-sm font-bold uppercase tracking-wide"
                    >
                      Ver →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
