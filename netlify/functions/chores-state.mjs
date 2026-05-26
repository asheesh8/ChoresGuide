import { getStore } from "@netlify/blobs";

const adminPassword = process.env.JEFF_ADMIN_PASSWORD || "360360";
const stateKey = "state";

const defaultState = {
  rotation: 0,
  choreDate: "",
  completed: {},
  streak: 0,
  lastAwardedCycle: "",
  updatedAt: "",
};

export default async (request) => {
  const store = getStore({ name: "chores-guide", consistency: "strong" });
  const state = await getState(store);

  if (request.method === "GET") {
    return json(state);
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const isAdmin = body.adminPassword === adminPassword;
  const nextState = {
    ...state,
    completed: { ...state.completed },
  };

  if (body.action === "toggleCompletion") {
    if (body.actor !== body.assignedTo && !isAdmin) {
      return json({ error: "Only Jeff can mark other people done" }, 403);
    }

    if (!body.key) return json({ error: "Missing chore key" }, 400);

    if (nextState.completed[body.key]) {
      delete nextState.completed[body.key];
    } else {
      nextState.completed[body.key] = body.completedAt || new Date().toISOString();
    }
  } else if (body.action === "advance") {
    if (!isAdmin) return json({ error: "Jeff password required" }, 403);
    nextState.rotation = Number(nextState.rotation || 0) + 1;
    nextState.choreDate = body.choreDate || nextState.choreDate;
  } else if (body.action === "reset") {
    if (!isAdmin) return json({ error: "Jeff password required" }, 403);
    nextState.rotation = 0;
    nextState.choreDate = body.choreDate || "";
    nextState.completed = {};
    nextState.streak = 0;
    nextState.lastAwardedCycle = "";
  } else if (body.action === "syncCycle") {
    const incomingRotation = Number(body.rotation);
    if (Number.isFinite(incomingRotation) && incomingRotation > Number(nextState.rotation || 0)) {
      nextState.rotation = incomingRotation;
      nextState.choreDate = body.choreDate || nextState.choreDate;
    } else if (!nextState.choreDate && body.choreDate) {
      nextState.choreDate = body.choreDate;
    }
  } else if (body.action === "awardStreak") {
    if (body.cycleKey && nextState.lastAwardedCycle !== body.cycleKey) {
      nextState.streak = Number(nextState.streak || 0) + 1;
      nextState.lastAwardedCycle = body.cycleKey;
    }
  } else {
    return json({ error: "Unknown action" }, 400);
  }

  nextState.updatedAt = new Date().toISOString();
  await store.setJSON(stateKey, nextState);
  return json(nextState);
};

async function getState(store) {
  const state = await store.get(stateKey, { type: "json" });
  return state ? { ...defaultState, ...state, completed: state.completed || {} } : defaultState;
}

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
