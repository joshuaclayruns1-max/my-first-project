// 800m Tracker: everything is saved in the browser's localStorage.

const STORE_KEY = "tracker800-v1";

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data) return { workouts: [], food: [], groceries: [], ...data };
  } catch (e) { /* storage blocked or empty */ }
  return { workouts: [], food: [], groceries: [] };
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const state = load();
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function daysAgo(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date(today() + "T00:00:00");
  return Math.round((now - d) / 86400000);
}

function stat(num, lbl) {
  return `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
}

// ---------- Tabs ----------
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// Default dates to today
document.querySelectorAll('input[type="date"]').forEach(i => (i.value = today()));

// ---------- Workouts ----------
const workoutForm = document.getElementById("workout-form");
workoutForm.addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(workoutForm);
  state.workouts.push({
    id: id(),
    date: f.get("date"),
    type: f.get("type"),
    distance: parseFloat(f.get("distance")) || 0,
    effort: parseInt(f.get("effort")) || null,
    notes: f.get("notes").trim(),
  });
  save();
  workoutForm.reset();
  workoutForm.date.value = today();
  renderWorkouts();
});

function renderWorkouts() {
  const list = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));
  const week = list.filter(w => daysAgo(w.date) < 7);
  const miles = week.reduce((s, w) => s + w.distance, 0);
  const hard = week.filter(w => ["Intervals", "Tempo", "Race"].includes(w.type)).length;

  document.getElementById("workout-stats").innerHTML =
    stat(week.length, "sessions (7 days)") +
    stat(miles.toFixed(1), "miles (7 days)") +
    stat(hard, "hard days (7 days)");

  const ul = document.getElementById("workout-list");
  if (!list.length) {
    ul.innerHTML = `<li class="empty">No workouts yet. Log your first one above.</li>`;
    return;
  }
  ul.innerHTML = list.map(w => `
    <li>
      <div class="body">
        <b>${escapeHtml(w.type)}</b>${w.distance ? ` · ${w.distance} mi` : ""}${w.effort ? ` · effort ${w.effort}/10` : ""}
        <div class="meta">${escapeHtml(w.date)}</div>
        ${w.notes ? `<div>${escapeHtml(w.notes)}</div>` : ""}
      </div>
      <button class="del" data-kind="workouts" data-id="${w.id}" aria-label="Delete">×</button>
    </li>`).join("");
}

// ---------- Food ----------
const foodForm = document.getElementById("food-form");
foodForm.addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(foodForm);
  state.food.push({
    id: id(),
    date: f.get("date"),
    meal: f.get("meal"),
    item: f.get("item").trim(),
    calories: parseInt(f.get("calories")) || 0,
    protein: parseInt(f.get("protein")) || 0,
  });
  save();
  const keepDate = foodForm.date.value;
  foodForm.reset();
  foodForm.date.value = keepDate;
  renderFood();
});

function renderFood() {
  const list = [...state.food].sort((a, b) => b.date.localeCompare(a.date));
  const todays = list.filter(x => x.date === today());
  const cals = todays.reduce((s, x) => s + x.calories, 0);
  const protein = todays.reduce((s, x) => s + x.protein, 0);

  document.getElementById("food-stats").innerHTML =
    stat(todays.length, "items today") +
    stat(cals, "calories today") +
    stat(protein + "g", "protein today");

  const ul = document.getElementById("food-list");
  if (!list.length) {
    ul.innerHTML = `<li class="empty">Nothing logged yet.</li>`;
    return;
  }
  ul.innerHTML = list.map(x => `
    <li>
      <div class="body">
        <b>${escapeHtml(x.item)}</b>
        <div class="meta">${escapeHtml(x.date)} · ${escapeHtml(x.meal)}${x.calories ? ` · ${x.calories} cal` : ""}${x.protein ? ` · ${x.protein}g protein` : ""}</div>
      </div>
      <button class="del" data-kind="food" data-id="${x.id}" aria-label="Delete">×</button>
    </li>`).join("");
}

// ---------- Groceries ----------
const STAPLES = [
  "Oats", "Bananas", "Rice", "Whole-wheat pasta", "Sweet potatoes",
  "Eggs", "Chicken breast", "Greek yogurt", "Milk (or chocolate milk)",
  "Canned beans", "Peanut butter", "Spinach", "Frozen berries",
  "Bread or bagels", "Canned tuna or salmon",
];

const groceryForm = document.getElementById("grocery-form");
groceryForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = groceryForm.item.value.trim();
  if (!name) return;
  state.groceries.push({ id: id(), item: name, done: false });
  save();
  groceryForm.reset();
  renderGroceries();
});

document.getElementById("add-staples").addEventListener("click", () => {
  const have = new Set(state.groceries.map(g => g.item.toLowerCase()));
  STAPLES.forEach(s => {
    if (!have.has(s.toLowerCase())) state.groceries.push({ id: id(), item: s, done: false });
  });
  save();
  renderGroceries();
});

document.getElementById("clear-bought").addEventListener("click", () => {
  state.groceries = state.groceries.filter(g => !g.done);
  save();
  renderGroceries();
});

function renderGroceries() {
  const ul = document.getElementById("grocery-list");
  if (!state.groceries.length) {
    ul.innerHTML = `<li class="empty">List is empty. Add items, or tap "Add runner staples".</li>`;
    return;
  }
  ul.innerHTML = state.groceries.map(g => `
    <li class="${g.done ? "done" : ""}">
      <input type="checkbox" data-id="${g.id}" ${g.done ? "checked" : ""} aria-label="Bought">
      <div class="body">${escapeHtml(g.item)}</div>
      <button class="del" data-kind="groceries" data-id="${g.id}" aria-label="Delete">×</button>
    </li>`).join("");
}

document.getElementById("grocery-list").addEventListener("change", e => {
  const g = state.groceries.find(x => x.id === e.target.dataset.id);
  if (g) { g.done = e.target.checked; save(); renderGroceries(); }
});

// ---------- Delete (shared) ----------
document.addEventListener("click", e => {
  const btn = e.target.closest(".del");
  if (!btn) return;
  const kind = btn.dataset.kind;
  state[kind] = state[kind].filter(x => x.id !== btn.dataset.id);
  save();
  ({ workouts: renderWorkouts, food: renderFood, groceries: renderGroceries })[kind]();
});

renderWorkouts();
renderFood();
renderGroceries();
