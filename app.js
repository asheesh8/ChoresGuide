const residents = ["JT", "Liam", "Jeff", "Todd", "Tom", "Oliver"];
const adminPassword = "360360";
const timeApiUrl = "https://timeapi.io/api/time/current/zone?timeZone=America/New_York";
const chores = [
  "Smoking area",
  "Stairs hallway",
  "Kitchen",
  "Dining room",
  "Downstairs bathroom",
  "Upstairs bathroom",
  "Laundry room",
  "Living room down",
];
const baseAssignments = ["JT", "Liam", "Jeff", "Todd", "Tom", "Oliver", "Tom", "Oliver"];

const storageKeys = {
  profile: "chores.profile",
  rotation: "chores.rotation",
  completed: "chores.completed",
  choreDate: "chores.choreDate",
  remembered: "chores.remembered",
  streak: "chores.streak",
  lastAwardedCycle: "chores.lastAwardedCycle",
};

const residentSelect = document.querySelector("#residentSelect");
const residentChips = document.querySelector("#residentChips");
const adminPasswordGroup = document.querySelector("#adminPasswordGroup");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const loginError = document.querySelector("#loginError");
const profileForm = document.querySelector("#profileForm");
const setupScreen = document.querySelector("#setupScreen");
const appScreen = document.querySelector("#appScreen");
const greeting = document.querySelector("#greeting");
const dateLabel = document.querySelector("#dateLabel");
const nextChoreNight = document.querySelector("#nextChoreNight");
const countdownLabel = document.querySelector("#countdownLabel");
const streakLabel = document.querySelector("#streakLabel");
const myChores = document.querySelector("#myChores");
const myCount = document.querySelector("#myCount");
const doneCount = document.querySelector("#doneCount");
const statusSummary = document.querySelector("#statusSummary");
const statusToggle = document.querySelector("#statusToggle");
const statusList = document.querySelector("#statusList");
const scheduleList = document.querySelector("#scheduleList");
const scheduleTitle = document.querySelector("#scheduleTitle");
const rotationLabel = document.querySelector("#rotationLabel");
const advanceButton = document.querySelector("#advanceButton");
const logoutButton = document.querySelector("#logoutButton");
const adminPanel = document.querySelector("#adminPanel");
const resetButton = document.querySelector("#resetButton");
const progressPopup = document.querySelector("#progressPopup");
const popupBody = document.querySelector("#popupBody");
const closePopupButton = document.querySelector("#closePopupButton");
const dayTabs = document.querySelectorAll(".day-tabs button");
const animatedSections = document.querySelectorAll(".today-card, .status-card, .schedule-card");

let activeDay = "monday";
let profile = loadJson(storageKeys.profile);
let rotation = Number(localStorage.getItem(storageKeys.rotation) || 0);
let completed = loadJson(storageKeys.completed) || {};
let streak = Number(localStorage.getItem(storageKeys.streak) || 0);
let lastAwardedCycle = localStorage.getItem(storageKeys.lastAwardedCycle) || "";
let currentDate = startOfDay(new Date());
let choreDate = getStoredChoreDate();
let statusOpen = false;
let showReloadPopup = Boolean(profile);
activeDay = getDayKeyForDate(choreDate);

residentSelect.innerHTML = residents
  .map((name) => `<option value="${name}">${name}</option>`)
  .join("");
residentChips.innerHTML = residents.map((name) => `<span>${name}</span>`).join("");

residentSelect.addEventListener("change", syncAdminLogin);
syncAdminLogin();

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const isJeff = residentSelect.value === "Jeff";

  if (isJeff && adminPasswordInput.value !== adminPassword) {
    loginError.classList.remove("hidden");
    adminPasswordInput.focus();
    return;
  }

  profile = {
    name: residentSelect.value,
    isAdmin: isJeff,
    rememberedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKeys.profile, JSON.stringify(profile));
  localStorage.setItem(storageKeys.remembered, "true");
  adminPasswordInput.value = "";
  showReloadPopup = false;
  showApp();
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem(storageKeys.profile);
  profile = null;
  resetActiveDayToCurrentChoreDate();
  setupScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
});

advanceButton.addEventListener("click", () => {
  if (!isJeffAdmin()) return;
  rotation += 1;
  choreDate = getNextChoreDate(choreDate);
  activeDay = getDayKeyForDate(choreDate);
  localStorage.setItem(storageKeys.rotation, String(rotation));
  saveChoreDate();
  render();
});

resetButton.addEventListener("click", () => {
  if (!isJeffAdmin()) return;
  resetToCurrentDate();
});

dayTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeDay = tab.dataset.day;
    render(true);
  });
});

statusToggle.addEventListener("click", () => {
  statusOpen = !statusOpen;
  renderStatusPanel();
});

closePopupButton.addEventListener("click", () => {
  progressPopup.classList.add("hidden");
});

initializeApp();
setInterval(updateCountdown, 1000);

async function initializeApp() {
  await syncLiveDate();
  if (profile) showApp();
}

function showApp() {
  resetActiveDayToCurrentChoreDate();
  setupScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
  render();
}

function resetActiveDayToCurrentChoreDate() {
  activeDay = getDayKeyForDate(choreDate);
}

function render(animate = false) {
  greeting.textContent = `Hey, ${profile.name}`;
  dateLabel.textContent = formatChoreDate(choreDate);
  nextChoreNight.textContent = getChoreNightMessage();
  updateCountdown();
  rotationLabel.textContent = `Round ${rotation + 1}`;
  streakLabel.textContent = `${streak}x group streak 🔥`;
  adminPanel.classList.toggle("hidden", !isJeffAdmin());

  dayTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.day === activeDay));

  const offset = getScheduleOffset(activeDay);
  const schedule = getSchedule(offset);
  scheduleTitle.textContent = `${capitalize(activeDay)} schedule`;

  renderMyChores(schedule, activeDay, offset);
  maybeAwardCycleStreak(schedule, activeDay, offset);
  streakLabel.textContent = `${streak}x group streak 🔥`;
  renderDoneStatus(schedule, activeDay, offset);
  renderSchedule(schedule);
  if (showReloadPopup) {
    showReloadPopup = false;
    showProgressPopup(schedule, activeDay, offset);
  }
  if (animate) animateContent();
}

function syncAdminLogin() {
  const isJeff = residentSelect.value === "Jeff";
  adminPasswordGroup.classList.toggle("hidden", !isJeff);
  loginError.classList.add("hidden");
  adminPasswordInput.required = isJeff;
  if (!isJeff) adminPasswordInput.value = "";
}

function isJeffAdmin() {
  return profile?.name === "Jeff" && profile.isAdmin === true;
}

function animateContent() {
  animatedSections.forEach((section) => {
    section.classList.remove("soft-refresh");
    requestAnimationFrame(() => section.classList.add("soft-refresh"));
  });
}

function renderMyChores(schedule, day, offset) {
  const mine = schedule.filter((item) => item.person === profile.name);
  myCount.textContent = String(mine.length);

  if (mine.length === 0) {
    myChores.innerHTML = `<p class="empty-state">No chores for ${capitalize(day)}. Check the full schedule below.</p>`;
    return;
  }

  myChores.innerHTML = mine
    .map((item) => {
      const key = completionKey(offset, day, item.chore);
      const isDone = isChoreComplete(key);
      return `
        <button class="chore-toggle ${isDone ? "done" : ""}" type="button" data-key="${key}">
          <span class="check">${isDone ? "✓" : ""}</span>
          <span>
            <strong>${item.chore}</strong>
            <small>${capitalize(day)} chore night</small>
          </span>
        </button>
      `;
    })
    .join("");

  document.querySelectorAll(".chore-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (isChoreComplete(key)) {
        delete completed[key];
      } else {
        completed[key] = new Date().toISOString();
      }
      localStorage.setItem(storageKeys.completed, JSON.stringify(completed));
      render();
    });
  });
}

function renderSchedule(schedule) {
  scheduleList.innerHTML = schedule
    .map(
      (item) => `
        <div class="schedule-item">
          <strong>${item.chore}</strong>
          <span class="person-${item.person}">${item.person}</span>
        </div>
      `,
    )
    .join("");
}

function renderDoneStatus(schedule, day, offset) {
  const summaries = residents.map((resident) => {
    const assigned = schedule.filter((item) => item.person === resident);
    const done = assigned.filter((item) => isChoreComplete(completionKey(offset, day, item.chore))).length;
    const complete = assigned.length > 0 && done === assigned.length;
    const onTime = complete && assigned.every((item) => isOnTimeCompletion(completionKey(offset, day, item.chore)));
    return {
      resident,
      done,
      total: assigned.length,
      complete,
      onTime,
    };
  });
  const finished = summaries.filter((item) => item.complete).length;

  doneCount.textContent = `${finished}/${summaries.length}`;
  statusSummary.textContent = `${finished} of ${summaries.length} finished`;
  statusList.innerHTML = summaries
    .map(
      (item) => `
        <div class="status-item ${item.complete ? "complete" : ""} ${item.onTime ? "on-time" : ""}">
          <span class="status-dot">${item.complete ? "✓" : ""}</span>
          <strong>${item.resident}</strong>
          <small>${item.done}/${item.total} done${item.onTime ? " · On time" : ""}</small>
        </div>
      `,
    )
    .join("");
  renderStatusPanel();
}

function renderStatusPanel() {
  statusList.classList.toggle("hidden", !statusOpen);
  statusToggle.setAttribute("aria-expanded", String(statusOpen));
  statusToggle.classList.toggle("open", statusOpen);
}

function showProgressPopup(schedule, day, offset) {
  const summaries = residents.map((resident) => {
    const assigned = schedule.filter((item) => item.person === resident);
    const doneChores = assigned.filter((item) => isChoreComplete(completionKey(offset, day, item.chore)));
    const leftChores = assigned.filter((item) => !isChoreComplete(completionKey(offset, day, item.chore)));
    return { resident, assigned, doneChores, leftChores };
  });
  const finished = summaries.filter((item) => item.assigned.length > 0 && item.leftChores.length === 0);
  const left = summaries.filter((item) => item.leftChores.length > 0);

  if (!finished.length) return;

  popupBody.innerHTML = `
    <div class="popup-section">
      <strong>Finished</strong>
      <p>${finished.length ? finished.map((item) => item.resident).join(", ") : "No one is fully finished yet."}</p>
    </div>
    <div class="popup-section">
      <strong>Still left</strong>
      ${
        left.length
          ? left
              .map(
                (item) => `
                  <p><b>${item.resident}:</b> ${item.leftChores.map((chore) => chore.chore).join(", ")}</p>
                `,
              )
              .join("")
          : "<p>Everyone is finished.</p>"
      }
    </div>
  `;
  progressPopup.classList.remove("hidden");
}

function setChoreDate(selectedDate) {
  if (!isJeffAdmin() || !isChoreDay(selectedDate) || selectedDate < currentDate) return;

  const baseDate = getInitialChoreDate(currentDate);
  rotation = countChoreNightsBetween(baseDate, selectedDate);
  completed = {};
  choreDate = selectedDate;
  activeDay = getDayKeyForDate(choreDate);
  localStorage.setItem(storageKeys.rotation, String(rotation));
  localStorage.setItem(storageKeys.completed, JSON.stringify(completed));
  saveChoreDate();
  render(true);
}

function resetToCurrentDate() {
  rotation = 0;
  completed = {};
  streak = 0;
  lastAwardedCycle = "";
  choreDate = getInitialChoreDate(currentDate);
  activeDay = getDayKeyForDate(choreDate);
  localStorage.setItem(storageKeys.rotation, String(rotation));
  localStorage.setItem(storageKeys.completed, JSON.stringify(completed));
  localStorage.setItem(storageKeys.streak, String(streak));
  localStorage.setItem(storageKeys.lastAwardedCycle, lastAwardedCycle);
  saveChoreDate();
  render(true);
}

function maybeAwardCycleStreak(schedule, day, offset) {
  const keys = schedule.map((item) => completionKey(offset, day, item.chore));
  const cycleKey = `${offset}:${day}`;
  const complete = keys.every((key) => isChoreComplete(key));
  const onTime = keys.every((key) => isOnTimeCompletion(key));

  if (!complete || !onTime || lastAwardedCycle === cycleKey) return;

  streak += 1;
  lastAwardedCycle = cycleKey;
  localStorage.setItem(storageKeys.streak, String(streak));
  localStorage.setItem(storageKeys.lastAwardedCycle, lastAwardedCycle);
}

function getSchedule(offset) {
  return chores.map((chore, index) => ({
    chore,
    person: baseAssignments[positiveModulo(index - offset, baseAssignments.length)],
  }));
}

function getScheduleOffset(day) {
  return day === getDayKeyForDate(choreDate) ? rotation : rotation + 1;
}

function completionKey(offset, day, chore) {
  return `${offset}:${day}:${chore}`;
}

function isChoreComplete(key) {
  return Boolean(completed[key]);
}

function getCompletionDate(key) {
  if (!completed[key]) return null;
  if (completed[key] === true) return new Date();
  return new Date(completed[key]);
}

function isOnTimeCompletion(key) {
  const completedAt = getCompletionDate(key);
  return Boolean(completedAt) && completedAt < getCycleDeadlineDateTime();
}

async function syncLiveDate() {
  currentDate = await getLiveDate();
  syncChoreDateToCurrentDate();
}

async function getLiveDate() {
  try {
    const response = await fetch(timeApiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Time API failed");
    const data = await response.json();
    return new Date(data.year, data.month - 1, data.day);
  } catch {
    return startOfDay(new Date());
  }
}

function syncChoreDateToCurrentDate() {
  let changed = false;

  while (choreDate < currentDate) {
    choreDate = getNextChoreDate(choreDate);
    rotation += 1;
    changed = true;
  }

  activeDay = getDayKeyForDate(choreDate);

  if (changed) {
    localStorage.setItem(storageKeys.rotation, String(rotation));
    saveChoreDate();
  }
}

function getStoredChoreDate() {
  const saved = localStorage.getItem(storageKeys.choreDate);
  if (saved) return parseLocalDate(saved);
  const initialDate = getInitialChoreDate(currentDate);
  localStorage.setItem(storageKeys.choreDate, toDateKey(initialDate));
  return initialDate;
}

function getInitialChoreDate(today = currentDate) {
  const day = today.getDay();
  const daysUntilNextChore = day === 1 || day === 4 ? 0 : day < 1 ? 1 : day < 4 ? 4 - day : 8 - day;
  return addDays(today, daysUntilNextChore);
}

function getNextChoreDate(date) {
  return addDays(date, getDayKeyForDate(date) === "monday" ? 3 : 4);
}

function getDayKeyForDate(date) {
  return date.getDay() === 4 ? "thursday" : "monday";
}

function isChoreDay(date) {
  return date.getDay() === 1 || date.getDay() === 4;
}

function countChoreNightsBetween(startDate, endDate) {
  let steps = 0;
  let cursor = startDate;

  while (cursor < endDate) {
    cursor = getNextChoreDate(cursor);
    steps += 1;
  }

  return steps;
}

function formatChoreDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getChoreNightMessage() {
  const day = capitalize(getDayKeyForDate(choreDate));
  if (toDateKey(choreDate) === toDateKey(currentDate)) return `${day} chores today`;
  return `No chores until ${day}`;
}

function updateCountdown() {
  if (!profile) return;

  const nextSwap = getNextSwapDateTime();
  const diff = Math.max(0, nextSwap - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  if (diff === 0 || toDateKey(choreDate) === toDateKey(currentDate)) {
    countdownLabel.textContent = "Jobs swap today";
    return;
  }

  countdownLabel.textContent =
    days > 0
      ? `Jobs swap in ${days}d ${hours}h ${minutes}m`
      : `Jobs swap in ${hours}h ${minutes}m ${seconds}s`;
}

function getNextSwapDateTime() {
  return new Date(choreDate.getFullYear(), choreDate.getMonth(), choreDate.getDate());
}

function getCycleDeadlineDateTime() {
  const deadline = getNextChoreDate(choreDate);
  return new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
}

function saveChoreDate() {
  localStorage.setItem(storageKeys.choreDate, toDateKey(choreDate));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function positiveModulo(value, modulo) {
  return ((value % modulo) + modulo) % modulo;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
