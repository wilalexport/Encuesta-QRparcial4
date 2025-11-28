// pages/admin/Audit.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AuditLog } from '@/types/database.types';
import { FileText, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error cargando logs de auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (filterTable !== 'all' && log.table_name !== filterTable) return false;
    return true;
  });

  const getActionBadge = (action: string) => {
    const colors = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      publish: 'bg-purple-100 text-purple-800',
    };
    return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Cargando logs de auditoría...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoría</h1>
          <p className="text-gray-600 mt-1">Registro de acciones realizadas en el sistema</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-5 h-5" />
          Total de registros: {logs.length}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex gap-4 items-center">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Filtrar por Acción
              </label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Todas las acciones</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="publish">Publish</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Filtrar por Tabla
              </label>
              <select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">Todas las tablas</option>
                <option value="surveys">Surveys</option>
                <option value="survey_questions">Survey Questions</option>
                <option value="responses">Responses</option>
                <option value="profiles">Profiles</option>
                <option value="user_roles">User Roles</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tabla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Record ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No hay logs de auditoría para mostrar
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 font-mono">
                        {log.user_id.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.table_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 font-mono">
                        {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
