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
    const width = 600;
    const height = 750;
    canvas.width = width;
    canvas.height = height;

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Título
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Escanea el código QR para', width / 2, 50);
    ctx.fillText('contestar la encuesta:', width / 2, 85);

    // Nombre de la encuesta
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#2563EB';
    const maxWidth = width - 80;
    const title = survey.title;
    if (ctx.measureText(title).width > maxWidth) {
      const words = title.split(' ');
      let line = '';
      let y = 125;
      for (let word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth) {
          ctx.fillText(line, width / 2, y);
          line = word + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, width / 2, y);
    } else {
      ctx.fillText(title, width / 2, 125);
    }

    // Convertir SVG a imagen
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
      // Dibujar el QR centrado
      const qrSize = 350;
      const qrX = (width - qrSize) / 2;
      const qrY = 200;
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // URL debajo del QR
      ctx.font = '14px Arial';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(publicUrl, width / 2, qrY + qrSize + 40);

      // Borde decorativo
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, height - 40);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/surveys"
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                survey.status === 'published' ? 'bg-green-100 text-green-800' :
                survey.status === 'closed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {survey.status === 'published' ? 'Publicado' : 
                 survey.status === 'closed' ? 'Cerrado' : 'Borrador'}
              </span>
            </div>
            <p className="text-gray-600 mt-1">{survey.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {survey.status === 'published' && (
            <button
              onClick={() => handleChangeStatus('closed')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Cerrar Encuesta
            </button>
          )}
          {survey.status === 'closed' && (
            <button
              onClick={() => handleChangeStatus('published')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Reabrir Encuesta
            </button>
          )}
          <Link
            to={`/surveys/${id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">Código QR</h2>
          
          <div className="flex flex-col items-center mb-4">
            <p className="text-sm text-gray-600 mb-4 text-center">
              Escanea el QR para acceder a la encuesta
            </p>
            <div id="qr-code" className="p-4 bg-white border-2 border-gray-200 rounded-lg">
              <QRCodeSVG value={publicUrl} size={220} level="H" />
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
            >
              <Download className="w-4 h-4" />
              Descargar QR
            </button>
            <button
              onClick={handleCopyUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition"
            >
              <Share2 className="w-4 h-4" />
              Copiar URL
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 break-all">{publicUrl}</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Respuestas</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{responses.length}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Estado</p>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  {survey.status === 'published' ? 'Publicado' : survey.status === 'draft' ? 'Borrador' : 'Cerrado'}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Creado</p>
                <p className="text-sm font-medium text-purple-600 mt-1">
                  {format(new Date(survey.created_at), 'd MMM yyyy', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Respuestas Recientes */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Respuestas Recientes</h2>
            
            {responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aún no hay respuestas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {responses.slice(0, 10).map((response) => (
                  <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Respuesta #{response.id}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(response.submitted_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <Link 
                      to={`/surveys/${id}/responses/${response.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Ver detalles
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
