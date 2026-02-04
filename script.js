import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* 🔥 Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyAMp5-wqinWTl4z0ms6bmnXgm9EvqPcbug",
  authDomain: "mytwoplayergame.firebaseapp.com",
  databaseURL: "https://mytwoplayergame-default-rtdb.firebaseio.com/",
  projectId: "mytwoplayergame",
  storageBucket: "mytwoplayergame.firebasestorage.app",
  messagingSenderId: "1003705475156",
  appId: "1:1003705475156:web:0d56aeef31623413238dc1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* 🔹 UI */
const home = document.getElementById("home");
const game = document.getElementById("game");
const board = document.getElementById("board");
const status = document.getElementById("gameStatus");
const info = document.getElementById("info");
const homeStatus = document.getElementById("homeStatus");
const nameInput = document.getElementById("nameInput");
const playerNameInput = document.getElementById("playerName");
const setNameBtn = document.getElementById("setName");

let gameCode = null;
let role = null;
let playerName = null;

/* 🔹 Helpers */
const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();

/* 🔹 Create Game */
document.getElementById("createGame").onclick = async () => {
  gameCode = genCode();
  role = "host";

  await set(ref(db, "games/" + gameCode), {
    locked: false,
    guestJoined: false,
    phase: "setup",
    turn: "host",
    players: {
      host: { lives: 3, bombs: [], name: "" },
      guest: { lives: 3, bombs: [], name: "" }
    }
  });

  homeStatus.innerText = `קוד המשחק שלך: ${gameCode}`;
};

/* 🔹 Join Game */
document.getElementById("joinGame").onclick = async () => {
  gameCode = document.getElementById("joinCode").value.trim().toUpperCase();
  const snap = await get(ref(db, "games/" + gameCode));
  if (!snap.exists()) return alert("לא קיים");

  role = "guest";

  await update(ref(db, "games/" + gameCode), { guestJoined: true, locked: true });

  enterGame();
};

/* 🔹 Enter */
function enterGame() {
  home.classList.add("hidden");
  game.classList.remove("hidden");
  status.innerText = "המשחק מתחיל!";
  nameInput.classList.remove("hidden");
  listenGame();
}

/* 🔹 Set Player Name */
setNameBtn.onclick = async () => {
  playerName = playerNameInput.value.trim();
  if(!playerName) return;

  await update(ref(db, `games/${gameCode}/players/${role}`), { name: playerName });
  nameInput.classList.add("hidden");
  info.innerText = "מחכה לשחקן השני...";

  // אם שני השמות מוכנים -> מתחיל בחירת פצצות
  const snap = await get(ref(db, `games/${gameCode}/players`));
  if(snap.val().host.name && snap.val().guest.name) {
    await update(ref(db, `games/${gameCode}`), { phase: "chooseBombs" });
  }
};

/* 🔹 Listen Game */
function listenGame() {
  onValue(ref(db, "games/" + gameCode), snap => {
    const g = snap.val();
    if(!g) return;

    status.innerText = `שלב: ${g.phase} | תור: ${g.turn}`;

    if(g.phase === "chooseBombs") {
      info.innerText = "בחר 3 עיגולים להנחת פצצות בצד שלך";
      renderBoard(g, true);
    } else if(g.phase === "play") {
      info.innerText = "המשחק בעיצומו, בחר עיגול של היריב";
      renderBoard(g, false);
    }

    checkWin(g);
  });
}

/* 🔹 Board */
function renderBoard(g, choosingBombs) {
  board.innerHTML = "";
  const enemy = role === "host" ? "guest" : "host";

  for (let i=0;i<6;i++) {
    const c = document.createElement("div");
    c.className = "circle";

    if(choosingBombs) {
      c.onclick = async () => {
        // בחר פצצה
        const bombs = g.players[role].bombs || [];
        if(bombs.includes(i) || bombs.length >= 3) return;
        bombs.push(i);
        await update(ref(db, `games/${gameCode}/players/${role}`), { bombs });
      };
    } else {
      c.onclick = () => attack(i, g, enemy);
    }

    board.appendChild(c);
  }
}

/* 🔹 Attack */
async function attack(i, g, enemy) {
  if (g.turn !== role || g.phase !== "play") return;

  const hit = g.players[enemy].bombs.includes(i);
  const lives = g.players[role].lives - (hit ? 1 : 0);

  await update(ref(db, `games/${gameCode}/players/${role}`), { lives });
  await update(ref(db, `games/${gameCode}`), { turn: enemy });

  info.innerText = hit ? "💥 פגיעה!" : "😌 ניצלת";
}

/* 🔹 Win */
function checkWin(g) {
  if (g.players.host.lives <= 0 || g.players.guest.lives <= 0) {
    const winner = g.players.host.lives > 0 ? g.players.host.name || "HOST" : g.players.guest.name || "GUEST";
    status.innerText = `🏆 ${winner} ניצח!`;
  }
}
