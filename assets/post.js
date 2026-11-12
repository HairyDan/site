(async () => {
  const title = document.getElementById('post-title');
  const content = document.getElementById('content');
  async function get(path, type) {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Unavailable');
    return response[type]();
  }
  try {
    const slug = new URLSearchParams(location.search).get('slug');
    const posts = await get('/blog/posts.json', 'json');
    const post = posts.find(item => item.slug === slug);
    if (!post) {
      document.title = 'Post not found — Dan Schormans';
      title.textContent = 'nothing here.';
      content.textContent = 'that post doesn’t exist. try the blog.';
      return;
    }
    document.title = post.title + ' — Dan Schormans';
    title.textContent = post.title;
    document.getElementById('post-subtitle').textContent = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(new Date(post.date));
    const tags = document.getElementById('post-tags');
    if (tags) {
      const fragment = document.createDocumentFragment();
      const values = [...new Set((Array.isArray(post.tags) ? post.tags : [])
        .filter(tag => typeof tag === 'string' && tag.trim()).map(tag => tag.trim().toLowerCase()))];
      for (const tag of values) {
        const link = document.createElement('a');
        link.href = '/blog/?' + new URLSearchParams({ tag });
        link.textContent = tag;
        fragment.append(link);
      }
      tags.replaceChildren(fragment);
      tags.hidden = !values.length;
    }
    const markdown = await get('/blog/posts/' + encodeURIComponent(post.slug) + '.md', 'text');
    content.innerHTML = window.microMarkdown(markdown);
  } catch {
    const tags = document.getElementById('post-tags');
    if (tags) tags.hidden = true;
    title.textContent = 'couldn’t load this one.';
    content.textContent = 'try again in a moment.';
    content.setAttribute('role', 'status');
  }
})();
