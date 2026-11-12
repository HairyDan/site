(() => {
  const list=document.querySelector('[data-post-list]');
  if(!list) return;
  const filters=document.querySelector('[data-tag-filters]');
  const status=document.getElementById('post-filter-status');
  const format=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  const tagLinks=new Map();
  const selected=()=>filters ? (new URLSearchParams(location.search).get('tag')||'').trim().toLowerCase():'';
  const tagURL=tag=>'/blog/'+(tag?'?'+new URLSearchParams({tag}):'');
  function row(post) {
    const article=document.createElement('article');
    article.className='post-row';
    const date=document.createElement('time');
    date.dateTime=post.date;date.textContent=format.format(new Date(post.date));
    const text=document.createElement('div'),heading=document.createElement('h3'),link=document.createElement('a');
    link.href='/blog/post.html?slug='+encodeURIComponent(post.slug);link.textContent=post.title;
    heading.append(link);
    const excerpt=document.createElement('p');excerpt.textContent=post.excerpt;
    text.append(heading,excerpt);
    if(post.tags.length) {
      const tags=document.createElement('div');tags.className='post-tags';
      for(const tag of post.tags) {
        const link=document.createElement('a');link.href=tagURL(tag);link.textContent=tag;tags.append(link);
      }
      text.append(tags);
    }
    article.append(date,text);return article;
  }
  fetch('/blog/posts.json',{cache:'no-cache'})
    .then(response=>{if(!response.ok) throw new Error('Posts unavailable');return response.json();})
    .then(data=>{
      const posts=data.map(post=>({...post,tags:[...new Set((Array.isArray(post.tags)?post.tags:[]).filter(tag=>typeof tag==='string'&&tag.trim()).map(tag=>tag.trim().toLowerCase()))]}));
      posts.sort((a,b)=>b.date.localeCompare(a.date));
      function render() {
        const tag=selected(),matches=posts.filter(post=>!tag||post.tags.includes(tag));
        const fragment=document.createDocumentFragment();
        for(const post of matches.slice(0,Number(list.dataset.limit)||matches.length)) fragment.append(row(post));
        list.replaceChildren(fragment);
        for(const [value,link] of tagLinks) {
          if(value===tag) link.setAttribute('aria-current','page');
          else link.removeAttribute('aria-current');
        }
        if(status) {
          status.hidden=false;
          status.textContent=matches.length+' '+(matches.length===1?'post':'posts')+(tag?' tagged “'+tag+'”':'');
        }
      }
      if(filters) {
        const counts=new Map();
        for(const post of posts) for(const tag of post.tags) counts.set(tag,(counts.get(tag)||0)+1);
        const fragment=document.createDocumentFragment();
        for(const [tag,count] of [['',posts.length],...[...counts].sort(([a],[b])=>a.localeCompare(b))]) {
          const link=document.createElement('a');
          link.href=tagURL(tag);link.textContent=(tag||'all posts')+' ('+count+')';
          link.addEventListener('click',event=>{
            if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey) return;
            event.preventDefault();
            const url=new URL(location.href);
            if(tag) url.searchParams.set('tag',tag);else url.searchParams.delete('tag');
            if(url.href!==location.href) history.pushState(null,'',url);
            render();
          });
          tagLinks.set(tag,link);fragment.append(link);
        }
        filters.replaceChildren(fragment);filters.hidden=false;
        addEventListener('popstate',render);
      }
      render();
    })
    .catch(()=>{
      if(status) {status.hidden=false;status.textContent='tags unavailable. showing all posts.';}
    });
})();