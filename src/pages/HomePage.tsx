import { Link } from 'react-router-dom';
import { PagePlaceholder } from '../components/system/PagePlaceholder';
import { useI18n } from '../i18n';
import { BRAND_NAME } from '../app/brand';
const TMUX_START_LINKS = [
    {
        key: 'home.tmuxLink.repo' as const,
        href: 'https://github.com/tmux/tmux',
    },
    {
        key: 'home.tmuxLink.gettingStarted' as const,
        href: 'https://github.com/tmux/tmux/wiki/Getting-Started',
    },
    {
        key: 'home.tmuxLink.installing' as const,
        href: 'https://github.com/tmux/tmux/wiki/Installing',
    },
    {
        key: 'home.tmuxLink.brew' as const,
        href: 'https://formulae.brew.sh/formula/tmux',
    },
] as const;
export function HomePage() {
    const { t } = useI18n();
    const stageItems = [
        {
            title: t('home.stage1.title'),
            summary: t('home.stage1.summary'),
            detail: t('home.stage1.detail'),
            actionLabel: t('home.stage1.action'),
            to: '/learn',
        },
        {
            title: t('home.stage2.title'),
            summary: t('home.stage2.summary'),
            detail: t('home.stage2.detail'),
            actionLabel: t('home.stage2.action'),
            to: '/practice?lesson=copy-search',
        },
    ] as const;
    const menuItems = [
        {
            title: t('home.menu1.title'),
            description: t('home.menu1.description'),
            cta: t('home.menu1.cta'),
            to: '/learn',
        },
        {
            title: t('home.menu2.title'),
            description: t('home.menu2.description'),
            cta: t('home.menu2.cta'),
            to: '/practice?lesson=hello-tmux',
        },
        {
            title: t('home.menu3.title'),
            description: t('home.menu3.description'),
            cta: t('home.menu3.cta'),
            to: '/cheatsheet',
        },
        {
            title: t('home.menu4.title'),
            description: t('home.menu4.description'),
            cta: t('home.menu4.cta'),
            to: '/progress',
        },
    ] as const;
    const valuePillars = [t('brand.valuePillar1'), t('brand.valuePillar2'), t('brand.valuePillar3')];
    return (<PagePlaceholder eyebrow={BRAND_NAME} title={t('home.title')} description={t('home.description')}>
      <section className="home-hero">
        <div className="home-hero-main">
          <p className="home-brand-kicker">{t('brand.descriptor')}</p>
          <p className="home-hero-summary">{t('brand.valuePromise')}</p>
          <ul className="home-pillar-list">
            {valuePillars.map((item) => (<li key={item}>{item}</li>))}
          </ul>
          <div className="inline-actions">
            <Link to="/practice?lesson=hello-tmux" className="primary-btn">
              {t('home.cta.startPracticeNow')}
            </Link>
            <Link to="/learn" className="secondary-btn">
              {t('home.cta.viewPath')}
            </Link>
          </div>
        </div>

        <aside className="home-hero-panel" aria-label={t('home.panel.aria')}>
          <p className="page-eyebrow">{t('home.panel.eyebrow')}</p>
          <div className="home-stat-grid">
            <article className="home-stat-card">
              <strong>{t('home.panel.card1.title')}</strong>
              <span>{t('home.panel.card1.desc')}</span>
            </article>
            <article className="home-stat-card">
              <strong>{t('home.panel.card2.title')}</strong>
              <span>{t('home.panel.card2.desc')}</span>
            </article>
            <article className="home-stat-card">
              <strong>{t('home.panel.card3.title')}</strong>
              <span>{t('home.panel.card3.desc')}</span>
            </article>
          </div>
        </aside>
      </section>

      <section className="home-stage-grid" aria-label={t('home.stage.aria')}>
        {stageItems.map((item) => (<article key={item.title} className="home-stage-card">
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <p className="muted">{item.detail}</p>
            <Link to={item.to} className="secondary-btn">
              {item.actionLabel}
            </Link>
          </article>))}
      </section>

      <section className="home-surface-grid" aria-label={t('home.menu.aria')}>
        {menuItems.map((menu) => (<article key={menu.title} className="home-surface-card">
            <h2>{menu.title}</h2>
            <p>{menu.description}</p>
            <Link to={menu.to} className="text-link">
              {menu.cta}
            </Link>
          </article>))}
      </section>

      <section className="home-links-card" aria-label={t('home.links.aria')}>
        <h2>{t('home.links.title')}</h2>
        <p className="muted">{t('home.links.description')}</p>
        <ul className="link-list">
          {TMUX_START_LINKS.map((item) => (<li key={item.href}>
              <a href={item.href} target="_blank" rel="noreferrer">
                {t(item.key)}
              </a>
            </li>))}
        </ul>

        <h3>{t('home.links.projectTitle')}</h3>
        <ul className="link-list">
          <li>
            {t('home.links.sourceCode')}{' '}
            <a href="https://github.com/midagedev/tmux-tuto" target="_blank" rel="noreferrer">
              github.com/midagedev/tmux-tuto
            </a>
          </li>
          <li>
            X (Twitter):{' '}
            <a href="https://x.com/midagedev" target="_blank" rel="noreferrer">
              x.com/midagedev
            </a>
          </li>
        </ul>
      </section>
    </PagePlaceholder>);
}
