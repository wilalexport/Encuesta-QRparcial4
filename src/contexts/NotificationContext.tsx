// contexts/NotificationContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  showNotification: (message: string, type: Notification['type'], duration?: number) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const addNotification = useCallback((
    type: Notification['type'],
    message: string,
    duration: number = 5000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = { id, type, message, duration };

    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    addNotification('success', message, duration);
  }, [addNotification]);

  const error = useCallback((message: string, duration?: number) => {
    addNotification('error', message, duration);
  }, [addNotification]);

  const info = useCallback((message: string, duration?: number) => {
    addNotification('info', message, duration);
  }, [addNotification]);

  const warning = useCallback((message: string, duration?: number) => {
    addNotification('warning', message, duration);
  }, [addNotification]);

  const showNotification = useCallback((message: string, type: Notification['type'], duration?: number) => {
    addNotification(type, message, duration);
  }, [addNotification]);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (confirmed: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(confirmed);
      setConfirmDialog(null);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        info,
        warning,
        showNotification,
        showConfirm,
      }}
    >
      {children}
      
      {/* Renderizar notificaciones */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              min-w-[300px] max-w-md px-4 py-3 rounded-lg shadow-lg
              flex items-start gap-3 animate-slide-in
              ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
              ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            `}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-white hover:opacity-75"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmación */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-scale-in">
            <div className="p-6">
              <h3 className={`text-lg font-semibold mb-2 ${
                confirmDialog.options.type === 'danger' ? 'text-red-600' :
                confirmDialog.options.type === 'warning' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {confirmDialog.options.title}
              </h3>
              <p className="text-gray-600 mb-6">
                {confirmDialog.options.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleConfirmClose(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  {confirmDialog.options.cancelText || 'Cancelar'}
                </button>
                <button
                  onClick={() => handleConfirmClose(true)}
                  className={`px-4 py-2 rounded-lg text-white transition ${
                    confirmDialog.options.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                    confirmDialog.options.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {confirmDialog.options.confirmText || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
