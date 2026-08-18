function isCommunityPostOwner(post) {
  return Boolean(post?.isOwner);
}

function communityPostTimeText(post = {}) {
  const created = post.createdAt ? new Date(post.createdAt) : null;
  const updated = post.updatedAt ? new Date(post.updatedAt) : null;
  const createdText = created && !Number.isNaN(created.getTime())
    ? created.toLocaleString('ko-KR')
    : String(post.createdAt || '');
  if (!updated || Number.isNaN(updated.getTime()) || String(post.updatedAt) === String(post.createdAt)) return createdText;
  return `${createdText} · 수정됨 ${updated.toLocaleString('ko-KR')}`;
}

function communityPostsHtml() {
  const posts = Array.isArray(state.data.communityPosts) ? state.data.communityPosts : [];
  if (!posts.length) return '<div class="empty">아직 게시글이 없습니다. 첫 이야기를 남겨보세요.</div>';
  return posts.map((post) => `
    <article class="community-post">
      <div class="community-post-meta">
        <strong>${escapeHtml(post.authorName || '상담사')}</strong>
        <span>${escapeHtml(communityPostTimeText(post))}</span>
      </div>
      <p>${escapeHtml(post.content || '').replace(/\r?\n/g, '<br>')}</p>
      ${isCommunityPostOwner(post) ? `
        <div class="actions community-post-actions">
          <button class="btn secondary" onclick="startEditCommunityPost('${escapeHtml(post.id)}')">수정</button>
          <button class="btn light" onclick="deleteCommunityPost('${escapeHtml(post.id)}')">삭제</button>
        </div>` : ''}
    </article>`).join('');
}

function selectedCommunityPostForEdit() {
  if (!state.editingCommunityPostId) return null;
  const post = (state.data.communityPosts || []).find((item) => item.id === state.editingCommunityPostId);
  return isCommunityPostOwner(post) ? post : null;
}

function communitySection() {
  const editingPost = selectedCommunityPostForEdit();
  return `
    <section id="section-community" class="section">
      ${pageTitle('한 줄 메모', '상담 업무, AI 활용, 현장 경험을 자유롭게 나눕니다.', '<button class="btn secondary" onclick="reloadCommunityPosts()">새로고침</button>')}
      <div class="community-layout">
        <div class="panel">
          <div class="panel-head"><h3>${editingPost ? '글 수정' : '새 글 작성'}</h3></div>
          <div class="panel-body">
            <div class="field"><label>내용</label><textarea id="communityContent" placeholder="자유롭게 대화를 시작해보세요.">${escapeHtml(editingPost?.content || '')}</textarea></div>
            <div class="actions">
              <button class="btn" onclick="${editingPost ? 'updateCommunityPost()' : 'addCommunityPost()'}">${editingPost ? '수정 완료' : '게시하기'}</button>
              ${editingPost ? '<button class="btn secondary" onclick="cancelEditCommunityPost()">취소</button>' : ''}
            </div>
            <p class="small" style="margin-bottom:0">작성자명은 마스킹되어 표시됩니다.</p>
          </div>
        </div>
        <div class="community-feed">${communityPostsHtml()}</div>
      </div>
    </section>`;
}

async function reloadCommunityPosts() {
  await loadCommunityPosts();
  if (!selectedCommunityPostForEdit()) state.editingCommunityPostId = null;
  render();
}

async function saveCommunityPostRequest(url, method, content) {
  const response = await fetch(url, {
    method,
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || '커뮤니티 저장 중 오류가 발생했습니다.');
  return data;
}

async function addCommunityPost() {
  const content = val('communityContent');
  if (!content) {
    toast('게시글 내용을 입력해주세요.');
    return;
  }
  try {
    await saveCommunityPostRequest('/api/community-posts', 'POST', content);
    await loadCommunityPosts();
    render();
    toast('커뮤니티에 게시되었습니다.');
  } catch (err) {
    toast(err.message || '커뮤니티 저장 중 오류가 발생했습니다.');
  }
}

function startEditCommunityPost(id) {
  const post = (state.data.communityPosts || []).find((item) => item.id === id);
  if (!isCommunityPostOwner(post)) {
    toast('본인이 작성한 글만 수정할 수 있습니다.');
    return;
  }
  state.editingCommunityPostId = id;
  render();
}

function cancelEditCommunityPost() {
  state.editingCommunityPostId = null;
  render();
}

async function updateCommunityPost() {
  const post = selectedCommunityPostForEdit();
  if (!post) {
    toast('본인이 작성한 글만 수정할 수 있습니다.');
    return;
  }
  const content = val('communityContent');
  if (!content) {
    toast('게시글 내용을 입력해주세요.');
    return;
  }
  try {
    await saveCommunityPostRequest(`/api/community-posts/${encodeURIComponent(post.id)}`, 'PUT', content);
    state.editingCommunityPostId = null;
    await loadCommunityPosts();
    render();
    toast('게시글이 수정되었습니다.');
  } catch (err) {
    toast(err.message || '게시글 수정 중 오류가 발생했습니다.');
  }
}

async function deleteCommunityPost(id) {
  const post = (state.data.communityPosts || []).find((item) => item.id === id);
  if (!isCommunityPostOwner(post)) {
    toast('본인이 작성한 글만 삭제할 수 있습니다.');
    return;
  }
  if (!confirm('게시글을 삭제할까요?')) return;
  try {
    const response = await fetch(`/api/community-posts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error?.message || '게시글 삭제 중 오류가 발생했습니다.');
    if (state.editingCommunityPostId === id) state.editingCommunityPostId = null;
    await loadCommunityPosts();
    render();
    toast('게시글이 삭제되었습니다.');
  } catch (err) {
    toast(err.message || '게시글 삭제 중 오류가 발생했습니다.');
  }
}
