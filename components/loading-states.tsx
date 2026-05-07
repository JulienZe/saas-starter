import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageLoaderProps {
  text?: string;
  fullScreen?: boolean;
}

export function PageLoader({ text = '加载中...', fullScreen = false }: PageLoaderProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/25">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        {content}
      </div>
    );
  }

  return content;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-400 mb-2">{title}</h3>
      {description && <p className="text-sm text-gray-300 text-center max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-base font-medium text-gray-600 mb-1">加载失败</h3>
      <p className="text-sm text-gray-400 text-center max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="text-[#667eea]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> 重试
        </Button>
      )}
    </div>
  );
}
