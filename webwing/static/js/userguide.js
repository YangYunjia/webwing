function rewriteUserGuideMarkdownAssets(markdown) {
    return markdown.replace(/\]\(webwing\/static\//g, '](/static/');
}

let _markdownIt = null;

function getMarkdownRenderer() {
    const Md = typeof window !== 'undefined' && typeof window.__WebWingMarkdownIt === 'function'
        ? window.__WebWingMarkdownIt
        : typeof markdownit === 'function'
            ? markdownit
            : typeof window !== 'undefined' && typeof window.markdownit === 'function'
                ? window.markdownit
                : undefined;
    const K = typeof window !== 'undefined' && window.__WebWingKatex && typeof window.__WebWingKatex.renderToString === 'function'
        ? window.__WebWingKatex
        : typeof katex !== 'undefined' && typeof katex.renderToString === 'function'
            ? katex
            : undefined;
    if (!Md || typeof texmath === 'undefined' || !K) {
        return null;
    }
    if (!_markdownIt) {
        _markdownIt = Md({ html: true, linkify: true, breaks: true }).use(texmath, {
            engine: K,
            delimiters: 'dollars',
            katexOptions: { throwOnError: false },
        });
    }
    return _markdownIt;
}

function renderUserGuideMarkdown(markdown) {
    const md = getMarkdownRenderer();
    if (!md || typeof DOMPurify === 'undefined') {
        const escaped = markdown
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return `<pre class="whitespace-pre-wrap text-sm text-gray-700">${escaped}</pre>`;
    }
    const rawHtml = md.render(markdown);
    return DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_TAGS: ['eq', 'eqn'],
    });
}

function create_user_guide_modal() {
    const openBtn = document.getElementById('user-guide-btn');
    const modal = document.getElementById('user-guide-modal');
    const closeBtn = document.getElementById('user-guide-close');
    const content = document.getElementById('user-guide-content');

    if (!openBtn || !modal || !closeBtn || !content) {
        return;
    }

    openBtn.addEventListener('click', async function () {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        content.textContent = '';
        content.innerHTML = '<p class="text-sm text-gray-600">Loading user guide…</p>';

        try {
            const response = await fetch('/user_guide');
            const data = await response.json();
            if (!response.ok || typeof data.content !== 'string') {
                throw new Error(data.error || 'Failed to load user guide');
            }
            const mdText = rewriteUserGuideMarkdownAssets(data.content);
            content.innerHTML = renderUserGuideMarkdown(mdText);
        } catch (error) {
            console.error('Error loading user guide:', error);
            content.textContent = '';
            content.innerHTML = '<p class="text-sm text-red-600">Failed to load user guide.</p>';
        }
    });

    closeBtn.addEventListener('click', function () {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });

    modal.addEventListener('click', function (event) {
        if (event.target === modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
}
