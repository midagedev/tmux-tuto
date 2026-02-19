import { useTranslation } from 'react-i18next';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  const resolvedMessage = message ?? t('데이터를 불러오는 중입니다...');

  return (
    <div className="state-box" role="status" aria-live="polite">
      <p>{resolvedMessage}</p>
    </div>
  );
}
