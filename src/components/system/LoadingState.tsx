export function LoadingState({ message = '데이터를 불러오는 중입니다...' }: { message?: string }) {
  return (
    <div className="state-box" role="status" aria-live="polite">
      <p>{message}</p>
    </div>
  );
}
