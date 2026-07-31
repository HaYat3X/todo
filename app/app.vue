<script setup lang="ts">
import { Target } from '@lucide/vue'

type Status = '未着手' | '進行中' | '保留中' | '完了' | '中止'
type Priority = 'A: 重要度高 緊急度高' | 'B: 重要度高 緊急度低' | 'C: 重要度低 緊急度高' | 'D: 重要度低 緊急度低'
type Project = { id: string; name: string; fullName: string }
type Todo = { id: string; title: string; status: Status; priority: Priority | null; memo: string; projectId: string | null }
type View = 'all' | 'client' | 'personal'

const statuses: Status[] = ['未着手', '進行中', '保留中', '完了', '中止']
const priorities: Priority[] = ['A: 重要度高 緊急度高', 'B: 重要度高 緊急度低', 'C: 重要度低 緊急度高', 'D: 重要度低 緊急度低']
const personalProjectId = '3aefab19-d295-80d9-8f23-cb2562f0d20a'
const { data: session, refresh: refreshSession } = await useFetch<{ authenticated: boolean }>('/api/auth/session')
const isAuthenticated = computed(() => session.value?.authenticated === true)
const { data, pending, error, refresh } = await useFetch<{ todos: Todo[]; projects: Project[]; mode: 'mock' | 'notion' }>('/api/todos', { immediate: isAuthenticated.value })
const todos = computed(() => data.value?.todos ?? [])
const projects = computed(() => data.value?.projects ?? [])
const login = reactive({ password: '', error: '' })
const taskForm = reactive({ title: '', priority: priorities[1] as Priority, projectId: '', memo: '' })
const projectForm = reactive({ name: '', fullName: '' })
const showTaskForm = ref(false)
const showProjectForm = ref(false)
const editingTodo = ref<Todo | null>(null)
const editForm = reactive({ title: '', priority: priorities[1] as Priority, projectId: '', memo: '' })
const activeView = ref<View>('all')
const isSaving = ref(false)
const draggedTodoId = ref<string | null>(null)

const visibleTodos = computed(() => todos.value.filter((todo) => activeView.value === 'all' || (activeView.value === 'personal' ? todo.projectId === personalProjectId : todo.projectId !== personalProjectId)))
const priorityRank: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
function todosFor(status: Status) { return visibleTodos.value.filter((todo) => todo.status === status).toSorted((left, right) => (priorityRank[left.priority?.charAt(0) ?? 'D'] ?? 4) - (priorityRank[right.priority?.charAt(0) ?? 'D'] ?? 4)) }
function projectName(projectId: string | null) { return projects.value.find((project) => project.id === projectId)?.name ?? 'プロジェクトなし' }
function priorityClass(priority: string | null) { return `priority-${priority?.charAt(0) ?? 'D'}` }
function cardToneClass(priority: string | null) { return `card-tone-${priority?.charAt(0) ?? 'D'}` }

async function signIn() {
  login.error = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: login.password } })
    login.password = ''
    await refreshSession()
    await refresh()
  } catch {
    login.error = 'パスワードが違います。'
  }
}

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  data.value = undefined
  await refreshSession()
}

async function createTask() {
  if (!taskForm.title.trim()) return
  isSaving.value = true
  try {
    await $fetch('/api/todos', { method: 'POST', body: { ...taskForm, title: taskForm.title.trim() } })
    Object.assign(taskForm, { title: '', priority: priorities[1], projectId: '', memo: '' })
    showTaskForm.value = false
    await refresh()
  } finally { isSaving.value = false }
}

async function createProject() {
  if (!projectForm.name.trim()) return
  isSaving.value = true
  try {
    const project = await $fetch<Project>('/api/projects', { method: 'POST', body: { name: projectForm.name.trim(), fullName: projectForm.fullName.trim() } })
    taskForm.projectId = project.id
    Object.assign(projectForm, { name: '', fullName: '' })
    showProjectForm.value = false
    await refresh()
  } finally { isSaving.value = false }
}

async function moveTodo(todoId: string, status: Status) {
  const todo = todos.value.find((item) => item.id === todoId)
  if (!todo || todo.status === status) return
  const previousStatus = todo.status
  todo.status = status
  try { await $fetch(`/api/todos/${todoId}`, { method: 'PATCH', body: { status } }) }
  catch { todo.status = previousStatus }
  finally { draggedTodoId.value = null }
}

function openEdit(todo: Todo) {
  editingTodo.value = todo
  Object.assign(editForm, { title: todo.title, priority: todo.priority ?? priorities[1], projectId: todo.projectId ?? '', memo: todo.memo })
}

async function saveTodo() {
  if (!editingTodo.value || !editForm.title.trim()) return
  isSaving.value = true
  try {
    await $fetch(`/api/todos/${editingTodo.value.id}`, { method: 'PATCH', body: { ...editForm, title: editForm.title.trim() } })
    editingTodo.value = null
    await refresh()
  } finally { isSaving.value = false }
}

async function deleteTodo() {
  if (!editingTodo.value || !window.confirm(`「${editingTodo.value.title}」を削除しますか？`)) return
  isSaving.value = true
  try {
    await $fetch(`/api/todos/${editingTodo.value.id}`, { method: 'DELETE' })
    editingTodo.value = null
    await refresh()
  } finally { isSaving.value = false }
}
</script>

<template>
  <main v-if="isAuthenticated" class="workspace">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">T</span><strong>Task board</strong><span v-if="data" class="connection">{{ data.mode === 'mock' ? 'Demo' : 'Notion' }}</span></div>
      <nav><button class="text-button" @click="showProjectForm = true">+ プロジェクト</button><button class="primary-button" @click="showTaskForm = true">+ タスクを追加</button><button class="avatar" title="ログアウト" @click="signOut">H</button></nav>
    </header>

    <section class="page-heading"><div><p>WORKSPACE</p><h1>タスク</h1></div><div class="view-tabs"><button v-for="view in [{ id: 'all', label: 'すべて' }, { id: 'client', label: '案件作業' }, { id: 'personal', label: '個人プロジェクト' }]" :key="view.id" :class="{ active: activeView === view.id }" @click="activeView = view.id as View">{{ view.label }}</button></div><span>{{ visibleTodos.length }}件</span></section>
    <p v-if="pending" class="notice">読み込み中…</p>
    <p v-else-if="error" class="notice error">データを読み込めません。Notion Integrationと環境変数を確認してください。</p>

    <section v-else class="board" aria-label="タスクボード">
      <div v-for="status in statuses" :key="status" class="board-column" @dragover.prevent @drop="draggedTodoId && moveTodo(draggedTodoId, status)">
        <header><span class="status-dot" :class="`dot-${statuses.indexOf(status)}`"/><strong>{{ status }}</strong><span>{{ todosFor(status).length }}</span></header>
        <div class="drop-zone" :class="{ 'is-target': draggedTodoId }">
          <article v-for="todo in todosFor(status)" :key="todo.id" draggable="true" :class="['task-card', cardToneClass(todo.priority)]" @dragstart="draggedTodoId = todo.id" @dragend="draggedTodoId = null">
            <button class="edit-button" title="タスクを編集" @click.stop="openEdit(todo)">•••</button>
            <h2>{{ todo.title }}</h2>
            <div class="project-tag"><Target class="project-icon" :size="17" :stroke-width="2.2" aria-hidden="true"/><span>{{ projectName(todo.projectId) }}</span></div>
            <p v-if="todo.memo">{{ todo.memo }}</p>
          </article>
          <button class="add-inline" @click="showTaskForm = true">+ タスクを追加</button>
        </div>
      </div>
    </section>

    <div v-if="showTaskForm" class="modal-backdrop" @click.self="showTaskForm = false"><form class="modal" @submit.prevent="createTask"><header><h2>新しいタスク</h2><button type="button" class="close" @click="showTaskForm = false">×</button></header><label>タスク名<input v-model="taskForm.title" required autofocus placeholder="タスクの名前"/></label><label>関連プロジェクト<select v-model="taskForm.projectId"><option value="">プロジェクトなし</option><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></label><label>優先度<select v-model="taskForm.priority"><option v-for="priority in priorities" :key="priority" :value="priority">{{ priority }}</option></select></label><label>メモ<textarea v-model="taskForm.memo" placeholder="補足があれば入力"/></label><footer><button type="button" class="text-button" @click="showTaskForm = false">キャンセル</button><button class="primary-button" :disabled="isSaving">{{ isSaving ? '保存中…' : '作成する' }}</button></footer></form></div>
    <div v-if="showProjectForm" class="modal-backdrop" @click.self="showProjectForm = false"><form class="modal" @submit.prevent="createProject"><header><h2>新しいプロジェクト</h2><button type="button" class="close" @click="showProjectForm = false">×</button></header><label>プロジェクト略称<input v-model="projectForm.name" required autofocus placeholder="例: Todo App"/></label><label>プロジェクト正式名<textarea v-model="projectForm.fullName" placeholder="任意"/></label><footer><button type="button" class="text-button" @click="showProjectForm = false">キャンセル</button><button class="primary-button" :disabled="isSaving">{{ isSaving ? '保存中…' : '作成する' }}</button></footer></form></div>
    <div v-if="editingTodo" class="modal-backdrop" @click.self="editingTodo = null"><form class="modal" @submit.prevent="saveTodo"><header><h2>タスクを編集</h2><button type="button" class="close" @click="editingTodo = null">×</button></header><label>タスク名<input v-model="editForm.title" required autofocus/></label><label>関連プロジェクト<select v-model="editForm.projectId"><option value="">プロジェクトなし</option><option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option></select></label><label>優先度<select v-model="editForm.priority"><option v-for="priority in priorities" :key="priority" :value="priority">{{ priority }}</option></select></label><label>メモ<textarea v-model="editForm.memo"/></label><footer><button type="button" class="delete-button" :disabled="isSaving" @click="deleteTodo">削除</button><span class="footer-actions"><button type="button" class="text-button" @click="editingTodo = null">キャンセル</button><button class="primary-button" :disabled="isSaving">{{ isSaving ? '保存中…' : '保存する' }}</button></span></footer></form></div>
  </main>

  <main v-else class="login-page"><form class="login-card" @submit.prevent="signIn"><div class="brand-mark">T</div><h1>Task board</h1><p>自分のタスクに、すぐ戻る。</p><label>パスワード<input v-model="login.password" required type="password" autofocus placeholder="パスワード"/></label><p v-if="login.error" class="login-error">{{ login.error }}</p><button class="primary-button">ログイン</button></form></main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;600;700&display=swap');
:root { color:#37352f; background:#fff; font-family:'Noto Sans JP',sans-serif; } *{box-sizing:border-box} body{margin:0} button,input,select,textarea{font:inherit} button{cursor:pointer}.workspace{min-height:100vh;background:#fff}.topbar{height:56px;border-bottom:1px solid #e7e7e4;display:flex;align-items:center;justify-content:space-between;padding:0 28px}.brand,nav{display:flex;align-items:center;gap:12px}.brand strong{font-size:14px}.brand-mark{display:grid;place-items:center;width:28px;height:28px;border-radius:7px;background:#292929;color:#fff;font-weight:700}.connection{border:1px solid #deded9;border-radius:4px;padding:2px 6px;color:#888;font:11px 'DM Mono',monospace}.text-button,.add-inline{border:0;background:transparent;color:#555;padding:8px 10px;font-size:13px}.primary-button{border:0;border-radius:5px;background:#2383e2;color:#fff;padding:8px 13px;font-size:13px;font-weight:600}.primary-button:disabled{opacity:.5}.avatar{border:0;border-radius:50%;background:#e5f0fb;color:#2367a5;width:28px;height:28px;font-size:12px}.page-heading{display:flex;align-items:end;justify-content:space-between;padding:44px 32px 26px}.page-heading p{margin:0 0 8px;color:#a1a19d;font:11px 'DM Mono',monospace;letter-spacing:.08em}.page-heading h1{margin:0;font-size:32px;letter-spacing:-.04em}.page-heading>span{color:#999;font-size:13px}.board{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:12px;overflow-x:auto;padding:0 32px 40px}.board-column{min-width:220px;background:#f7f7f5;border-radius:7px;padding:10px}.board-column>header{display:flex;align-items:center;gap:7px;padding:2px 4px 10px;font-size:13px}.board-column>header>span:last-child{margin-left:auto;color:#999;font:11px 'DM Mono',monospace}.status-dot{width:9px;height:9px;border-radius:50%}.dot-0{background:#91918e}.dot-1{background:#2f80ed}.dot-2{background:#9065b0}.dot-3{background:#4dad75}.dot-4{background:#e05c5c}.drop-zone{min-height:160px}.drop-zone.is-target{outline:2px solid #2383e2;outline-offset:3px;border-radius:5px}.task-card{background:#fff;border:1px solid #e9e9e7;border-radius:5px;padding:13px;margin-bottom:8px;box-shadow:0 1px 1px rgba(0,0,0,.03);cursor:grab}.task-card:active{cursor:grabbing}.card-meta{display:flex;justify-content:space-between;align-items:center;color:#8d8d89;font-size:11px}.priority{display:grid;place-items:center;width:19px;height:19px;border-radius:3px;color:#fff;font:11px 'DM Mono',monospace}.priority-A{background:#e44}.priority-B{background:#d09a32}.priority-C{background:#4da56c}.priority-D{background:#9c9c97}.task-card h2{margin:13px 0 7px;font-size:14px;line-height:1.55;font-weight:600}.task-card p{margin:0 0 12px;color:#777;font-size:12px;line-height:1.6}.task-card select{width:100%;padding:5px;border:1px solid #e4e4e1;border-radius:4px;background:#fff;color:#666;font-size:11px}.add-inline{width:100%;text-align:left;color:#888}.modal-backdrop{position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:rgba(15,15,15,.24);z-index:2}.modal{width:min(460px,100%);border-radius:9px;background:#fff;box-shadow:0 12px 42px rgba(0,0,0,.18);padding:22px}.modal header,.modal footer{display:flex;align-items:center;justify-content:space-between}.modal h2{margin:0;font-size:18px}.close{border:0;background:transparent;font-size:24px;color:#777}.modal label{display:grid;gap:7px;margin-top:18px;font-size:12px;font-weight:600}.modal input,.modal select,.modal textarea,.login-card input{width:100%;border:1px solid #deded9;border-radius:5px;padding:9px 10px;background:#fff;color:#37352f;font-size:14px;font-weight:400}.modal textarea{min-height:82px;resize:vertical}.modal footer{margin-top:24px}.notice{padding:0 32px;color:#888;font-size:13px}.error,.login-error{color:#d44}.login-page{display:grid;place-items:center;min-height:100vh;background:#f7f7f5}.login-card{width:min(360px,calc(100% - 36px));padding:32px;background:#fff;border:1px solid #e7e7e4;border-radius:9px;box-shadow:0 8px 25px rgba(0,0,0,.05)}.login-card .brand-mark{margin-bottom:22px}.login-card h1{margin:0;font-size:24px}.login-card>p{margin:8px 0 25px;color:#777;font-size:13px}.login-card label{display:grid;gap:8px;font-size:12px;font-weight:600}.login-card .primary-button{width:100%;margin-top:18px}.login-card .login-error{margin:10px 0 -8px}@media(max-width:700px){.topbar{padding:0 14px}.topbar .text-button{display:none}.page-heading{padding:30px 18px 20px}.board{padding:0 18px 32px}.modal{padding:18px}}
.workspace{background:#f2f5fa;color:#172033}.topbar{height:68px;padding:0 36px;background:#101827;border:0;box-shadow:0 2px 16px rgba(15,23,42,.12)}.brand strong{color:#f8fafc;font-size:15px;letter-spacing:-.02em}.brand-mark{width:32px;height:32px;background:linear-gradient(135deg,#516fff,#9b5cff);box-shadow:0 5px 12px rgba(90,98,255,.3)}.connection{border-color:#344158;color:#b8c5db;background:#192339}.text-button{color:#c8d2e1}.text-button:hover{color:#fff;background:#273349}.primary-button{border-radius:8px;background:linear-gradient(135deg,#5d70ff,#7b5cff);box-shadow:0 5px 12px rgba(83,101,255,.24);padding:9px 14px}.avatar{background:#263755;color:#dbeafe}.page-heading{gap:22px;padding:42px 40px 28px}.page-heading p{color:#7b8ba5}.page-heading h1{font-size:34px;color:#121b2c}.page-heading>span{color:#74829b}.view-tabs{display:flex;gap:4px;padding:4px;background:#e3e9f2;border:1px solid #d9e0eb;border-radius:9px}.view-tabs button{border:0;border-radius:6px;background:transparent;padding:7px 12px;color:#65738a;font-size:12px;font-weight:600}.view-tabs button.active{background:#fff;color:#26365a;box-shadow:0 2px 6px rgba(27,39,66,.1)}.board{gap:18px;padding:0 40px 48px;grid-template-columns:repeat(5,minmax(276px,1fr))}.board-column{min-width:276px;padding:0;background:transparent}.board-column>header{padding:2px 8px 12px;color:#35425a;font-size:13px}.board-column>header>span:last-child{color:#8491a6;background:#e4e9f1;border-radius:99px;padding:2px 7px;font-size:10px}.drop-zone{min-height:260px;padding:9px;border-radius:14px;background:#e8edf4;border:1px solid #dde4ee}.drop-zone.is-target{background:#e8ecff;outline-color:#6978ff}.task-card{position:relative;min-height:154px;margin-bottom:10px;padding:18px;background:#fff;border:1px solid #e0e5eb;border-radius:14px;box-shadow:0 5px 14px rgba(38,53,82,.06);cursor:grab;transition:transform .16s ease,box-shadow .16s ease}.task-card:hover{transform:translateY(-2px);box-shadow:0 10px 22px rgba(38,53,82,.1)}.task-card h2{max-width:calc(100% - 28px);margin:0 0 13px;color:#253047;font-size:16px;line-height:1.5;letter-spacing:-.02em}.project-tag{display:inline-flex;align-items:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:5px;padding:4px 7px!important;background:#eef2f7!important;color:#627087;font-size:11px;font-weight:700;text-decoration:none}.project-tag::before{content:'';width:5px;height:5px;flex:0 0 auto;border-radius:50%;background:currentColor;opacity:.65}.task-card p{margin:13px 0;color:#68758a;font-size:12px;line-height:1.6;font-weight:500}.priority{display:inline-flex;align-items:center;width:auto;height:auto;margin-top:13px;border-radius:5px;padding:4px 7px;font:700 11px 'Noto Sans JP',sans-serif}.priority-A{background:#fde9e7;color:#aa4a42}.priority-B{background:#fbefd7;color:#856522}.priority-C{background:#e5f4e9;color:#3d7e56}.priority-D{background:#edf0f4;color:#687487}.edit-button{position:absolute;top:13px;right:12px;margin:0;border:0!important;background:transparent!important;outline:0;padding:3px 4px;color:#9aa6b8;font-size:13px;line-height:1}.edit-button:hover{background:#edf1f6!important;color:#4f5d74}.add-inline{border-radius:9px;padding:10px 11px;color:#728098;font-weight:600}.add-inline:hover{background:#dce4ef;color:#3e4e69}.modal{border-radius:16px;border:1px solid #e0e6ef;box-shadow:0 20px 60px rgba(15,23,42,.22)}.login-page{background:radial-gradient(circle at top left,#eff0ff,#f4f6fa 45%,#e7edf8)}.login-card{border:0;border-radius:18px;box-shadow:0 20px 50px rgba(26,37,60,.14)}@media(max-width:700px){.topbar{padding:0 16px}.page-heading{padding:30px 20px 22px}.board{padding:0 20px 36px}.task-card{min-height:145px}}
.task-card.card-tone-A{background:#fff0ee;border-color:#f6d6d1}.task-card.card-tone-B{background:#fff7e7;border-color:#f4e5bd}.task-card.card-tone-C{background:#eff9f1;border-color:#d4e9d9}.task-card.card-tone-D{background:#f1f4f8;border-color:#dfe5ec}.task-card{display:flex;flex-direction:column}.task-card .priority{display:none}.project-tag::before,.project-tag::after{display:none}.project-tag{width:max-content;max-width:100%;margin-top:0;padding:0!important;border:0;border-radius:0;background:transparent!important;color:#50504c;font-size:12px;font-weight:600;box-shadow:none;gap:7px}.project-icon{flex:0 0 auto;color:#64645f}.project-tag span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:underline;text-decoration-color:rgba(80,80,76,.25);text-decoration-thickness:1px;text-underline-offset:4px}.task-card p{margin:0;color:#4f5c70}.project-tag + p{margin-top:16px}.modal footer .footer-actions{display:flex;align-items:center;gap:8px}.delete-button{border:0;background:transparent;color:#c0525a;padding:8px 10px;font-size:13px;font-weight:600}.delete-button:hover{background:#fff0f1;border-radius:7px}.delete-button:disabled{opacity:.5}
.primary-button{position:relative;isolation:isolate;min-height:40px;overflow:hidden;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:linear-gradient(135deg,#6375ff 0%,#8056e9 100%);box-shadow:0 7px 18px rgba(90,88,230,.27),inset 0 1px rgba(255,255,255,.22);font-weight:700;letter-spacing:.01em;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}.primary-button::after{content:'';position:absolute;z-index:-1;inset:0;background:linear-gradient(110deg,rgba(255,255,255,.2),transparent 42%);opacity:.75}.primary-button:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 11px 24px rgba(90,88,230,.34),inset 0 1px rgba(255,255,255,.24);filter:saturate(1.08)}.primary-button:not(:disabled):active{transform:translateY(0);box-shadow:0 4px 11px rgba(90,88,230,.24)}.primary-button:focus-visible{outline:3px solid rgba(91,109,255,.3);outline-offset:3px}.login-card .primary-button{min-height:46px;margin-top:22px;font-size:14px}.login-card .primary-button::before{content:'→';margin-right:8px;font-size:16px;line-height:0}
</style>
