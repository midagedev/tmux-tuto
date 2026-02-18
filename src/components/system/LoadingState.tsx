import { useI18n } from '../../i18n';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useI18n();
  const resolvedMessage = message ?? t('loading.default');

  return (
    <div className="state-box" role="status" aria-live="polite">
      <p>{resolvedMessage}</p>
    </div>
  );
}
