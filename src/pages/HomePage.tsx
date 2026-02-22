import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();
  const valueItems = [
    {
      title: t('실습 우선'),
      summary: t('명령 입력과 즉시 피드백 중심'),
    },
    {
      title: t('짧은 루프'),
      summary: t('복잡한 이론보다 반복 가능한 행동 루틴'),
    },
    {
      title: t('실무 전환'),
      summary: t('로컬에서 원격 세션 운영으로 확장'),
    },
  ] as const;

  return (
    <section className="page-card" aria-label={t('tmux 학습 여정')}>
      <article className="home-doc" aria-label={t('tmux 학습 여정')}>
        <p className="home-doc-kicker">{t('tmux 실습 학습')}</p>
        <h2>{t('tmux가 무엇인가요?')}</h2>
        <p>
          {t(
            'tmux는 하나의 터미널에서 여러 작업을 유지/전환하고, 연결이 끊겨도 세션을 복구할 수 있게 해주는 terminal multiplexer입니다. 먼저 공식 개론을 읽고, 본인 OS에 맞는 설치 가이드를 확인한 뒤 실습을 시작하세요.',
          )}
        </p>
        <p className="muted">
          {t(
            'tmux를 "작업 복구와 연속성" 도구로 이해하고, 이후 레슨에서 계속 사용할 기본 확인 루틴(`tmux -V`, `tmux list-sessions`)을 익힙니다.',
          )}
        </p>

        <h3 className="home-doc-subtitle">{t('이 웹사이트가 주는 가치')}</h3>
        <p>
          {t(
            'tmux는 터미널 작업을 세션으로 보존하고, 창과 패인을 통해 병렬 작업을 안정적으로 운영하게 해주는 도구입니다. 이 커리큘럼은 tmux가 처음인 개발자도 바로 실습으로 이해하도록 설계했습니다.',
          )}
        </p>
        <ul className="home-doc-list">
          {valueItems.map((item) => (
            <li key={item.title}>
              <strong>{item.title}</strong>: {item.summary}
            </li>
          ))}
        </ul>

        <h3 className="home-doc-subtitle">{t('학습 경로')}</h3>
        <p>{t('tmux 레슨 경로를 순서대로 따라가며 기본 동작부터 운영 루틴까지 학습합니다.')}</p>
        <div className="home-doc-cta">
          <Link to="/learn" className="primary-btn">
            {t('학습 시작하기')}
          </Link>
        </div>
        <p className="home-desktop-hint">{t('원활한 실습을 위해 데스크톱 환경을 권장합니다.')}</p>
      </article>
    </section>
  );
}
