import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, PanelLeftOpen, PanelLeftClose, PanelRightClose, PanelRightOpen, Search, Moon, Sun, X, Plus, Pencil, Trash2, Copy } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-sql';
import { flattenResourcePages, resourcesService, type ResourcePage, type ResourceTreeNode } from '../services/resources.service';
import { adfToHtml } from '../utils/adf-to-html';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useTheme } from '@/app/providers/ThemeContext';

export default function ResourcesPage() {
  const { '*': pagePath } = useParams();
  const navigate = useNavigate();
  const [tree, setTree] = useState<ResourceTreeNode[]>([]);
  const [selectedPage, setSelectedPage] = useState<ResourcePage | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [treeError, setTreeError] = useState('');
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarView, setSidebarView] = useState<ResourceTreeNode | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => localStorage.getItem('course-selected-folder-id'));
  const [sidebarDirection, setSidebarDirection] = useState<'forward' | 'back'>('forward');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = Number(localStorage.getItem('course-sidebar-width'));
    return Number.isFinite(stored) && stored >= 240 && stored <= 420 ? stored : 300;
  });
  const [resizingSidebar, setResizingSidebar] = useState(false);
  const [codeTheme, setCodeTheme] = useState<'github' | 'night'>(() => (
    localStorage.getItem('course-code-theme') === 'night' ? 'night' : 'github'
 ));
  const { dark, setDark } = useTheme();
  const [toc, setToc] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [modal, setModal] = useState<'create' | 'rename' | 'delete' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const openSidebar = () => setMobileOpen(true);
    window.addEventListener('course:open-mobile-sidebar', openSidebar);
    return () => window.removeEventListener('course:open-mobile-sidebar', openSidebar);
  }, []);

  const pages = useMemo(() => flattenResourcePages(tree), [tree]);
  const rootTopics = useMemo(() => {
    const overview = tree.find(node => node.type === 'page' && node.title.toLowerCase() === 'overview');
    return overview?.children?.length ? overview.children : tree;
  }, [tree]);
  const html = selectedPage ? adfToHtml(selectedPage.body, selectedPage.title) : '';

  const loadTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError('');
    const controller = new AbortController();
    try {
      const nodes = await resourcesService.getTree(undefined, controller.signal);
      setTree(nodes);
      setSidebarView(current => current ? findNode(nodes, current.id) ?? current : null);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setTreeError(error instanceof Error ? error.message : 'Unable to load resources');
      }
    } finally {
      setTreeLoading(false);
    }
  }, [navigate]);

  useEffect(() => { void loadTree(); }, [loadTree]);

  useEffect(() => {
    if (!selectedFolderId || !tree.length) return;
    const storedFolder = findNode(tree, selectedFolderId);
    if (storedFolder) setSidebarView(storedFolder);
  }, [selectedFolderId, tree]);

  useEffect(() => {
    if (!pagePath && pages.length) {
      navigate(`/resources/${pages[0].id}`, { replace: true });
    }
  }, [navigate, pagePath, pages]);

  useEffect(() => {
    localStorage.setItem('course-sidebar-width', String(sidebarWidth));
  }, [sidebarWidth]);

  function startSidebarResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    setResizingSidebar(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizeSidebar(event: React.PointerEvent<HTMLDivElement>) {
    if (!resizingSidebar) return;
    setSidebarWidth(Math.max(240, Math.min(420, event.clientX)));
  }

  useEffect(() => {
    if (!pagePath) return;
    const controller = new AbortController();
    let active = true;
    setPageLoading(true);
    setPageError('');
    setSelectedPage(null);
    resourcesService.getPage(pagePath, controller.signal)
      .then(page => {
        if (active) setSelectedPage(page);
      })
      .catch(error => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPageError(error instanceof Error ? error.message : 'Unable to load page');
        }
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [navigate, pagePath, pages]);

  useEffect(() => {
    localStorage.setItem('course-code-theme', codeTheme);
    document.querySelectorAll('.course-article-body').forEach(article => {
      article.classList.toggle('code-theme-night', codeTheme === 'night');
      article.classList.toggle('code-theme-github', codeTheme === 'github');
    });
  }, [codeTheme, html]);

  useEffect(() => {
    if (!html) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>('.course-article-body code[data-language]').forEach(block => {
        const language = (block.dataset.language || 'plain').toLowerCase();
        const prismLanguage = language === 'js' ? 'javascript' : language === 'ts' ? 'typescript' : language;
        const grammar = Prism.languages[prismLanguage];
        if (!grammar) return;
        block.className = `language-${prismLanguage}`;
        block.innerHTML = Prism.highlight(block.textContent || '', grammar, prismLanguage);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [html, selectedPage?.id]);

  useEffect(() => {
    if (!html) {
      setToc([]);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const headings = [...document.querySelectorAll<HTMLElement>('.course-article-body h1, .course-article-body h2, .course-article-body h3')];
      setToc(headings.map((heading, index) => {
        const text = heading.textContent?.trim() || `Section ${index + 1}`;
        const id = heading.id || text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${index + 1}`;
        heading.id = id;
        return { id, text, level: Number(heading.tagName.slice(1)) };
      }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [html, selectedPage?.id]);

  async function submitModal() {
    setModalError('');
    try {
      if (modal === 'create') {
        const created = await resourcesService.createPage(modalTitle.trim(), selectedPage?.spaceKey || 'SUM', selectedPage?.id);
        resourcesService.clearTreeCache();
        resourcesService.clearPageCache(created.id);
        await loadTree();
        setModal(null);
        navigate(`/resources/${created.id}`);
      } else if (modal === 'rename' && selectedPage) {
        const updated = await resourcesService.updatePage(selectedPage.id, modalTitle.trim(), adfToHtml(selectedPage.body));
        setSelectedPage(updated);
        resourcesService.clearTreeCache();
        resourcesService.clearPageCache(updated.id);
        await loadTree();
        setModal(null);
      } else if (modal === 'delete' && selectedPage) {
        await resourcesService.deletePage(selectedPage.id);
        resourcesService.clearTreeCache();
        resourcesService.clearPageCache(selectedPage.id);
        setModal(null);
        await loadTree();
        const remaining = flattenResourcePages(tree).filter(page => page.id !== selectedPage.id);
        navigate(remaining[0] ? `/resources/${remaining[0].id}` : '/resources', { replace: true });
      }
    } catch (error) {
      setModalError(error instanceof Error ? error.message : 'Unable to complete action');
    }
  }

  const currentIndex = pages.findIndex(page => page.id === pagePath);
  const previousPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  function renderSidebarList(nodes: ResourceTreeNode[]): ReactNode {
    const visibleNodes = nodes.filter(node =>
      !search || node.title.toLowerCase().includes(search.toLowerCase()) || nodeHasMatch(node, search)
    );

    return visibleNodes.map(node => {
      const active = node.type === 'page' && pagePath === node.id;
      const canOpen = node.type !== 'page' || node.children?.length > 0;

      if (node.type === 'page' && !node.children?.length) {
        return (
          <Link
            key={node.id}
            to={`/resources/${node.id}`}
            onClick={() => setMobileOpen(false)}
            className={`course-sidebar-page ${active ? 'active' : ''}`}
          >
            <span className="course-sidebar-bullet" aria-hidden="true" />
            <span>{node.title}</span>
          </Link>
        );
      }

      return (
        <button
          type="button"
          key={node.id}
          className={`course-sidebar-folder ${active ? 'active' : ''}`}
          onClick={() => {
            if (canOpen) {
              setSidebarDirection('forward');
              setSidebarView(node);
              setSelectedFolderId(node.id);
              localStorage.setItem('course-selected-folder-id', node.id);
            }
            if (node.type === 'page') navigate(`/resources/${node.id}`);
          }}
        >
          <span className="course-sidebar-bullet course-sidebar-folder-bullet" aria-hidden="true" />
          <span className="course-sidebar-folder-name">{node.title}</span>
          <ChevronRight size={16} className="course-sidebar-chevron" />
        </button>
      );
    });
  }

  return (
    <div className="course-resource-root">

      <header className="course-topbar">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          className="course-desktop-sidebar-toggle"
          onClick={() => setSidebarCollapsed(value => !value)}
          aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
        <Link to="/resources" className="course-brand">Sumanth&apos;s Resources</Link>
        <nav className="course-topnav" aria-label="Resource views">
        </nav>
        <div className="course-top-actions">
          <Button type="button" variant="ghost" size="icon" aria-label="Search" onClick={() => setSearchOpen(value => !value)}><Search size={17} /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setDark(value => !value)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</Button>
        </div>
      </header>

      {searchOpen && (
        <div className="course-search-popover">
          <Search size={16} />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search the course" aria-label="Search pages" autoFocus />
          {search && <Button type="button" variant="ghost" size="icon" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></Button>}
        </div>
      )}

      <main
        className={`course-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${rightSidebarCollapsed ? 'right-sidebar-collapsed' : ''} ${resizingSidebar ? 'sidebar-resizing' : ''}`}
        style={{ '--course-sidebar-width': `${sidebarWidth}px` } as React.CSSProperties}
      >
        <aside className={`course-sidebar ${mobileOpen ? 'open' : ''}`}>
          <div className="course-sidebar-mobile-head">
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close curriculum"><X size={18} /></button>
          </div>
          <nav className="course-curriculum" aria-label="Course curriculum">
            {treeLoading && <div className="course-loading">Loading curriculum...</div>}
            {treeError && <div className="course-error">{treeError}</div>}
            {!treeLoading && !treeError && (
              sidebarView ? (
                <div key={`topic-${sidebarView.id}`} className="course-sidebar-drilldown course-sidebar-view-forward">
                  <button type="button" className="course-sidebar-back" onClick={() => {
                    setSidebarDirection('back');
                    setSidebarView(null);
                    setSelectedFolderId(null);
                    localStorage.removeItem('course-selected-folder-id');
                  }}>
                    <ArrowLeft size={15} />
                    <span>All topics</span>
                  </button>
                  <div className="course-sidebar-view-title">
                    <h2>{sidebarView.title}</h2>
                  </div>
                  <div className="course-sidebar-list">
                    {sidebarView.children?.length
                      ? renderSidebarList(sidebarView.children)
                      : <span className="course-sidebar-empty">No pages in this section yet.</span>}
                  </div>
                </div>
              ) : (
                <div key="topics-root" className={`course-sidebar-root ${sidebarDirection === 'back' ? 'course-sidebar-view-back' : ''}`}>
                  <div className="course-sidebar-view-title">
                  </div>
                  <div className="course-sidebar-list">{renderSidebarList(rootTopics)}</div>
                </div>
              )
            )}
          </nav>
          <Button type="button" variant="outline" className="course-sidebar-add" onClick={() => { setModalTitle(''); setModal('create'); }}>
            <Plus size={15} /> Add page
          </Button>
        </aside>
        {!sidebarCollapsed && (
          <div
            className="course-sidebar-resizer"
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={240}
            aria-valuemax={420}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            onPointerDown={startSidebarResize}
            onPointerMove={resizeSidebar}
            onPointerUp={() => setResizingSidebar(false)}
            onPointerCancel={() => setResizingSidebar(false)}
            onDoubleClick={() => setSidebarWidth(300)}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft') setSidebarWidth(value => Math.max(240, value - 16));
              if (event.key === 'ArrowRight') setSidebarWidth(value => Math.min(420, value + 16));
            }}
          />
        )}
        {mobileOpen && <button type="button" className="course-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

        <section className="course-article-scroll">
          {pageLoading && <div className="course-loading course-page-loading">Loading page...</div>}
          {pageError && <div className="course-error course-page-error">{pageError}</div>}
          {!pageLoading && !pageError && selectedPage && (
            <article className="course-article">
              <div className="course-breadcrumb">
                <Link to="/resources">Resources</Link>
                <ChevronRight size={13} />
                <span>{selectedPage.title}</span>
              </div>

              <header className="course-article-header">
                <h1>{selectedPage.title}</h1>
                <div className="course-article-actions">
                  <Button type="button" variant="ghost" size="icon" onClick={() => { setModalTitle(selectedPage.title); setModal('rename'); }} aria-label="Rename page"><Pencil size={14} /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setModal('delete')} aria-label="Delete page"><Trash2 size={14} /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void navigator.clipboard?.writeText(window.location.href)} aria-label="Copy link"><Copy size={14} /></Button>
                </div>
              </header>

              {html.trim() ? (
                <div className="course-article-body" dangerouslySetInnerHTML={{ __html: html }} onClick={event => {
                  const target = event.target as HTMLElement;
                  const copyButton = target.closest('.adf-code-copy-button');
                  if (copyButton) {
                    const block = copyButton.closest('.adf-code-block');
                    const code = block?.querySelector('code')?.textContent ?? '';
                    void navigator.clipboard?.writeText(code);
                    copyButton.classList.add('copied');
                    window.setTimeout(() => copyButton.classList.remove('copied'), 1200);
                    return;
                  }
                  const themeButton = target.closest('.adf-code-theme-button');
                  if (themeButton) setCodeTheme(current => current === 'github' ? 'night' : 'github');
                }} />
              ) : (
                <div className="course-article-empty" role="status">
                  This page has no published content yet. Try again later or choose another page from the curriculum.
                </div>
              )}

              {(previousPage || nextPage) && (
                <nav className="course-page-nav">
                  {previousPage ? (
                    <Link to={`/resources/${previousPage.id}`} className="previous">
                      <span><ChevronLeft size={14} /> Previous</span>
                      <strong>{previousPage.title}</strong>
                    </Link>
                  ) : <span />}
                  {nextPage ? (
                    <Link to={`/resources/${nextPage.id}`} className="next">
                      <span>Next <ChevronRight size={14} /></span>
                      <strong>{nextPage.title}</strong>
                    </Link>
                  ) : <span />}
                </nav>
              )}

              <footer className="course-footer">How React Works · © 2026 Sumanth Nagireddi</footer>
            </article>
          )}
        </section>

        <aside className={`course-right-sidebar ${rightSidebarCollapsed ? 'collapsed' : ''}`}>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="course-right-toggle"
            onClick={() => setRightSidebarCollapsed(value => !value)}
            aria-label={rightSidebarCollapsed ? 'Open page outline' : 'Close page outline'}
          >
            {rightSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
          </Button>
          <div className="course-right-inner">
            <h2>On this page</h2>
            {toc.length ? toc.map(item => (
              <button
                type="button"
                key={item.id}
                className={item.level === 3 ? 'level-3' : ''}
                onClick={() => {
                  const heading = document.getElementById(item.id);
                  heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                {item.text}
              </button>
            )) : <span className="course-right-empty">No headings</span>}
          </div>
        </aside>
      </main>

      {modal && (
        <div className="course-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setModal(null); }}>
          <div className="course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
            <div className="course-modal-head">
              <h2 id="course-modal-title">{modal === 'create' ? 'Create page' : modal === 'rename' ? 'Rename page' : 'Move page to trash'}</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setModal(null)} aria-label="Close"><X size={18} /></Button>
            </div>
            {modal === 'delete' ? <p>Move <strong>{selectedPage?.title}</strong> to trash?</p> : (
              <label>
                <span>Page title</span>
                <Input value={modalTitle} onChange={event => setModalTitle(event.target.value)} autoFocus onKeyDown={event => { if (event.key === 'Enter') void submitModal(); }} />
              </label>
            )}
            {modalError && <div className="course-error">{modalError}</div>}
            <div className="course-modal-actions">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="button" onClick={() => void submitModal()} className="primary">{modal === 'delete' ? 'Move to trash' : 'Save'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function findNode(nodes: ResourceTreeNode[], id: string): ResourceTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children ?? [], id);
    if (child) return child;
  }
  return null;
}

function nodeHasMatch(node: ResourceTreeNode, search: string): boolean {
  return node.children?.some(child => child.title.toLowerCase().includes(search.toLowerCase()) || nodeHasMatch(child, search)) ?? false;
}
