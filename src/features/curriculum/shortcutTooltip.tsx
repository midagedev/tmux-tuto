export const SHORTCUT_TOOLTIPS: Record<string, string> = {
  'Ctrl+b': 'Ctrl를 누른 상태에서 b를 누른 뒤 손을 떼고 다음 키를 입력하세요.',
  c: 'Ctrl+b 다음 c: 새 window를 만듭니다.',
  d: 'Ctrl+b 다음 d: 현재 세션에서 분리(detach)합니다.',
  ':': 'Ctrl+b 다음 : : command prompt를 엽니다.',
  '%': 'Shift+5',
  '"': "Shift+'",
};

export function renderTextWithShortcutTooltip(text: string, keyPrefix: string) {
  return text.split(/(`[^`]+`)/g).map((segment, index) => {
    if (segment.startsWith('`') && segment.endsWith('`')) {
      const token = segment.slice(1, -1);
      const tooltip = SHORTCUT_TOOLTIPS[token];

      return (
        <code
          key={`${keyPrefix}-token-${index}`}
          className={`shortcut-token${tooltip ? ' shortcut-token-tooltip' : ''}`}
          title={tooltip}
        >
          {token}
        </code>
      );
    }

    return <span key={`${keyPrefix}-text-${index}`}>{segment}</span>;
  });
}
